import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { areas, type FeaturedProject } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { ui } from '../../i18n/interface.ts'
import { cx } from '../../lib/cx.ts'
import { botaoIcone } from '../../lib/estilos.ts'
import {
  ABRE_PROJETO,
  estaNaTela,
  idDoCartao,
  recorteDaOrigem,
  recorteInteiro,
  recorteSemOrigem,
  TEMPOS,
  type Retangulo,
} from '../../lib/foco.ts'
import { travarRolagem } from '../../lib/travaDeRolagem.ts'
import { Close } from '../icons.tsx'
import { ProjectDetails } from './ProjectDetails.tsx'

const menosMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** As peças que se movem: o fundo (que escurece e desfoca a página), o painel e o que vai nele. */
interface Pecas {
  fundo: HTMLElement
  painel: HTMLElement
  conteudo: HTMLElement
}

const pecasDe = (fundo: HTMLElement | null, painel: HTMLElement | null, conteudo: HTMLElement | null): Pecas | null =>
  fundo && painel && conteudo ? { fundo, painel, conteudo } : null

/** De onde a página do projeto sai e para onde volta: o retângulo do cartão e o raio dos cantos dele. */
interface Origem {
  retangulo: Retangulo
  raio: number
}

const raioDe = (elemento: Element) => Number.parseFloat(getComputedStyle(elemento).borderTopLeftRadius) || 0

/** O cartão, se ele está à vista: sem ele, a página aparece e some no lugar dela. */
function origemDe(cartao: HTMLElement | null): Origem | null {
  if (!cartao) return null
  const retangulo = cartao.getBoundingClientRect()
  return estaNaTela(retangulo, window.innerWidth, window.innerHeight) ? { retangulo, raio: raioDe(cartao) } : null
}

/** O recorte do painel em cima do cartão (ou, sem ele, um pouco menor que o painel, no lugar). */
function recorteDe(painel: HTMLElement, origem: Origem | null): string {
  const destino = painel.getBoundingClientRect()
  return origem ? recorteDaOrigem(origem.retangulo, destino, origem.raio) : recorteSemOrigem(destino, raioDe(painel))
}

/**
 * O foco: o painel cresce do cartão até o tamanho dele, a página atrás escurece e fica desfocada, e
 * o conteúdo aparece com o painel já quase aberto (veja foco.ts).
 */
function abrir({ fundo, painel, conteudo }: Pecas, origem: Origem | null) {
  if (menosMovimento()) {
    for (const peca of [fundo, painel]) peca.animate({ opacity: [0, 1] }, { duration: TEMPOS.semMovimento, easing: 'ease-out' })
    return
  }
  painel.animate({ clipPath: [recorteDe(painel, origem), recorteInteiro(raioDe(painel))] }, { duration: TEMPOS.abrir, easing: TEMPOS.curva })
  if (!origem) painel.animate({ opacity: [0, 1] }, { duration: TEMPOS.abrir * 0.5, easing: 'ease-out' })
  fundo.animate({ opacity: [0, 1] }, { duration: TEMPOS.abrir * 0.7, easing: 'ease-out' })
  conteudo.animate(
    { opacity: [0, 1], transform: ['translateY(0.75rem)', 'none'] },
    { duration: TEMPOS.conteudo.duracao, delay: TEMPOS.conteudo.espera, easing: 'ease-out', fill: 'backwards' },
  )
}

/** A volta: o conteúdo some, o painel encolhe até o cartão e a página clareia. Termina quando ele chega. */
function fechar({ fundo, painel, conteudo }: Pecas, origem: Origem | null): Promise<unknown> {
  const ate = { fill: 'forwards' } as const
  if (menosMovimento()) {
    return Promise.all([fundo, painel].map((peca) => peca.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.semMovimento }).finished))
  }
  conteudo.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar * 0.4, easing: 'ease-in' })
  fundo.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar, easing: 'ease-in' })
  // sem o cartão à vista para onde voltar, o painel some no caminho
  if (!origem) painel.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar, easing: 'ease-in' })
  return painel.animate(
    { clipPath: [recorteInteiro(raioDe(painel)), recorteDe(painel, origem)] },
    { ...ate, duration: TEMPOS.fechar, easing: TEMPOS.curva },
  ).finished
}

/**
 * A página aberta de um projeto (veja ProjectDialog). Monta já aberta, com o foco; com `fechando`,
 * volta para o cartão e avisa quando chegou (`onFechado`).
 */
function Painel({
  project,
  fechando,
  onClose,
  onFechado,
}: {
  project: FeaturedProject
  fechando: boolean
  onClose: () => void
  onFechado: () => void
}) {
  const t = useT()
  const tituloId = useId()
  const dialogo = useRef<HTMLDialogElement>(null)
  const fundo = useRef<HTMLDivElement>(null)
  const painel = useRef<HTMLElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLDivElement>(null)
  // o painel está saindo (desmontando): o fechamento do diálogo não é um pedido de fechar
  const saindo = useRef(false)
  const area = areas.find((opcao) => opcao.id === project.area)
  const fechou = useEffectEvent(onFechado)

  // Abrir: por cima de tudo (o resto da página fica inerte e a rolagem, travada); o cartão some, já
  // que é ele que vira o painel. Ao sair, tudo volta, e o foco vai para o botão do cartão.
  useLayoutEffect(() => {
    const d = dialogo.current
    const p = pecasDe(fundo.current, painel.current, conteudo.current)
    if (!d || !p) return
    saindo.current = false
    const elemento = document.getElementById(idDoCartao(project.id))
    const origem = origemDe(elemento)
    d.showModal()
    // O foco vai para o texto, e não para o primeiro botão (o X), que o navegador escolheria: o leitor
    // de tela anuncia o projeto (o título nomeia o diálogo), as setas e o Page Down já rolam o texto, e
    // o X não aparece marcado à toa. O Tab chega a ele.
    corpo.current?.focus({ preventScroll: true })
    const destravar = travarRolagem()
    if (elemento) elemento.style.visibility = 'hidden'
    abrir(p, origem)
    return () => {
      saindo.current = true
      destravar()
      if (elemento) elemento.style.visibility = ''
      if (d.open) d.close()
      elemento?.querySelector<HTMLElement>(`[${ABRE_PROJETO}]`)?.focus({ preventScroll: true })
    }
  }, [project.id])

  useEffect(() => {
    if (!fechando) return
    const p = pecasDe(fundo.current, painel.current, conteudo.current)
    let ativo = true
    const terminou = () => {
      if (ativo) fechou()
    }
    if (p) fechar(p, origemDe(document.getElementById(idDoCartao(project.id)))).then(terminou, terminou)
    else terminou()
    return () => {
      ativo = false
    }
  }, [fechando, project.id])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      // O Esc fecharia na hora, sem a volta para o cartão: o fechamento passa pelo endereço (veja
      // useProjectRoute) e pela animação. Se o navegador fechar mesmo assim, o endereço acompanha.
      // O evento de fechar chega depois (numa tarefa à parte): só conta se o diálogo continua fechado.
      // No desenvolvimento, o StrictMode fecha e reabre o painel na montagem, e o aviso desse
      // fechamento chegava com o painel já aberto de novo, fechando a página do projeto na hora.
      onCancel={(evento) => {
        evento.preventDefault()
        onClose()
      }}
      onClose={() => {
        if (!dialogo.current?.open && !fechando && !saindo.current) onClose()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-fg backdrop:bg-transparent"
    >
      <div ref={fundo} aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" />
      <article
        ref={painel}
        className="absolute inset-2 mx-auto flex max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-4 lg:inset-y-6"
      >
        <div ref={conteudo} className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-8 sm:py-5">
            <div className="min-w-0">
              <p className="label text-subtle">
                {area && t(area.label)} · <span className="tabular-nums">{project.year}</span>
              </p>
              <h2 id={tituloId} className="mt-1.5 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                {t(project.name)}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t(ui.projeto.fechar)} className={cx(botaoIcone, '-mr-1.5 shrink-0')}>
              <Close className="size-5" />
            </button>
          </header>
          <div
            ref={corpo}
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 outline-none sm:px-8 sm:py-8"
          >
            <ProjectDetails project={project} />
          </div>
        </div>
      </article>
    </dialog>
  )
}

/**
 * O foco num projeto em destaque: clicado o cartão, ele cresce e vira a página do projeto, quase do
 * tamanho da tela, por cima do site, com as explicações e as demonstrações (e, de lá, o código).
 * Vai para o fim do <body>, fora do <main>: a absorção do buraco negro não o toma por conteúdo.
 *
 * Quem decide o que está aberto é o endereço (veja useProjectRoute): aqui chega o projeto, ou null
 * para fechar, e o pedido de fechar (o X, o Esc, o clique fora) volta por `onClose`.
 */
export function ProjectDialog({ project, onClose }: { project: FeaturedProject | null; onClose: () => void }) {
  // O projeto na tela, que continua nela depois de fechado, até a volta para o cartão acabar. Cada
  // abertura é um painel novo (a chave): reaberto no meio da volta, ele não herda o fechamento.
  const [anterior, setAnterior] = useState<FeaturedProject | null>(null)
  const [exibido, setExibido] = useState<{ project: FeaturedProject; vez: number } | null>(null)
  if (project !== anterior) {
    setAnterior(project)
    if (project) setExibido({ project, vez: (exibido?.vez ?? 0) + 1 })
  }
  if (!exibido) return null

  return createPortal(
    <Painel
      key={exibido.vez}
      project={exibido.project}
      fechando={project === null}
      onClose={onClose}
      onFechado={() => setExibido(null)}
    />,
    document.body,
  )
}
