import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { areas, type FeaturedProject } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { ui } from '../../i18n/interface.ts'
import { beiraDaAbsorcao, estaPorCima } from '../../lib/buracoNegro/beira.ts'
import { cx } from '../../lib/cx.ts'
import { botaoIcone } from '../../lib/estilos.ts'
import {
  ABRE_PROJETO,
  idDoCartao,
  parteVisivel,
  recorteDaOrigem,
  recorteInteiro,
  recorteSemOrigem,
  TEMPOS,
  type Retangulo,
} from '../../lib/foco.ts'
import { travarRolagem } from '../../lib/travaDeRolagem.ts'
import { Close } from '../icons.tsx'
import { ProjectDetails } from './ProjectDetails.tsx'
import { ATRIBUTO_DO_VOO, continuarVideo, copiaDoCartao, marcaDoVoo, quadroPorCima, semVoo, voar, voosEntre, type Voo } from './transicao.ts'

const menosMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** O vídeo da prévia (o que o cartão e a página têm), dentro de um ou de outro. */
const videoDe = (onde: Element | null) => onde?.querySelector<HTMLVideoElement>(`[${ATRIBUTO_DO_VOO}="midia"] video`) ?? null

/**
 * As peças que se movem: o fundo (que escurece e desfoca o site), o painel, o que vai nele e a caixa
 * da cópia do cartão, por baixo do que vai nele.
 */
interface Pecas {
  fundo: HTMLElement
  painel: HTMLElement
  conteudo: HTMLElement
  fantasma: HTMLElement
}

/**
 * De onde a página do projeto sai e para onde volta: a parte do cartão que está à vista, o raio dos
 * cantos dele e se a absorção o cortou em cima.
 */
interface Origem {
  retangulo: Retangulo
  raio: number
  cortado: boolean
}

const raioDe = (elemento: Element) => Number.parseFloat(getComputedStyle(elemento).borderTopLeftRadius) || 0

/**
 * A linha do alto da tela a partir da qual o cartão aparece: 0 sem a absorção, ou com ele inteiro por
 * cima da cortina (com o foco do teclado); senão, a beira da faixa, de onde para cima ele está sendo
 * puxado. Aberta por um clique, a página sai dele já fora da faixa (veja revelar, em Projects.tsx).
 */
const alturaLivre = (cartao: HTMLElement | null) => (cartao === null || estaPorCima(cartao) ? 0 : beiraDaAbsorcao())

/** O cartão, se ele está à vista: sem ele, a página aparece e some no lugar dela (veja parteVisivel, em foco.ts). */
function origemDe(cartao: HTMLElement | null, beira: number): Origem | null {
  if (!cartao) return null
  const parte = parteVisivel(cartao.getBoundingClientRect(), beira, window.innerWidth, window.innerHeight)
  return parte && { ...parte, raio: raioDe(cartao) }
}

/** O recorte do painel em cima do cartão (ou, sem ele, um pouco menor que o painel, no lugar). */
function recorteDe(painel: HTMLElement, origem: Origem | null): string {
  const destino = painel.getBoundingClientRect()
  if (!origem) return recorteSemOrigem(destino, raioDe(painel))
  return recorteDaOrigem(origem.retangulo, destino, origem.raio, origem.cortado ? 0 : origem.raio)
}

/** Como o cartão vira a página e ela volta a ser ele: as peças que voam e a cópia dele. */
interface Passagem {
  origem: Origem | null
  voos: Voo[]
  copia: HTMLElement | null
}

/**
 * Mede a passagem entre o cartão e a página, como eles estão agora, e põe a cópia do cartão no
 * painel. Para quem prefere menos movimento, nada voa: a página só aparece e some.
 */
function passagem(cartao: HTMLElement | null, { conteudo, fantasma }: Pecas): Passagem {
  const beira = alturaLivre(cartao)
  const origem = origemDe(cartao, beira)
  if (!cartao || !origem || menosMovimento()) return { origem, voos: [], copia: null }
  const voos = voosEntre(cartao, conteudo, beira)
  return { origem, voos, copia: copiaDoCartao(cartao, fantasma, voos, videoDe(conteudo)) }
}

/**
 * O foco: o painel cresce do cartão até o tamanho dele e o site atrás escurece e fica desfocado. Por
 * dentro, o cartão vira a página: as peças que os dois têm voam do cartão para o lugar delas, a cópia
 * do cartão se apaga enquanto o fundo do painel aparece, e o resto da página aparece com ele já quase
 * aberto (veja foco.ts e transicao.ts). Sem o cartão à vista, o painel cresce no lugar.
 *
 * Todo movimento dura o mesmo (o que acaba antes fica parado até o fim): fechada no meio, a página
 * volta por eles, de trás para a frente, de onde estava.
 */
function abrir({ fundo, painel, conteudo }: Pecas, { origem, voos, copia }: Passagem): Animation[] {
  if (menosMovimento()) {
    return [fundo, painel].map((peca) => peca.animate({ opacity: [0, 1] }, { duration: TEMPOS.semMovimento, easing: 'ease-out' }))
  }
  const ate = (duracao: number, espera = 0): KeyframeAnimationOptions => ({
    duration: duracao,
    delay: espera,
    endDelay: TEMPOS.abrir - espera - duracao,
  })
  const caminho = { duration: TEMPOS.abrir, easing: TEMPOS.curva }
  const animacoes = [
    painel.animate({ clipPath: [recorteDe(painel, origem), recorteInteiro(raioDe(painel))] }, caminho),
    fundo.animate({ opacity: [0, 1] }, { ...ate(TEMPOS.abrir * 0.7), easing: 'ease-out' }),
  ]
  const aparecer = (peca: HTMLElement) =>
    peca.animate(
      { opacity: [0, 1], transform: ['translateY(0.75rem)', 'none'] },
      { ...ate(TEMPOS.conteudo.duracao, TEMPOS.conteudo.espera), easing: 'ease-out', fill: 'backwards' },
    )
  if (!origem) {
    animacoes.push(painel.animate({ opacity: [0, 1] }, { ...ate(TEMPOS.abrir * 0.5), easing: 'ease-out' }), aparecer(conteudo))
    return animacoes
  }
  // no começo, o painel é o cartão: a cópia dele se apaga enquanto o fundo do painel aparece
  const troca = { ...ate(TEMPOS.cartao), easing: 'ease-out' }
  animacoes.push(painel.animate({ backgroundColor: ['transparent', getComputedStyle(painel).backgroundColor] }, troca))
  if (copia) animacoes.push(copia.animate({ opacity: [1, 0] }, { ...troca, fill: 'forwards' }))
  for (const voo of voos) animacoes.push(...voar(voo, true, caminho))
  for (const parte of semVoo(conteudo, voos)) animacoes.push(aparecer(parte))
  return animacoes
}

/**
 * A volta: o resto da página some, as peças voam de volta para o cartão, o painel encolhe até ele e o
 * site clareia. No fim, a cópia do cartão reaparece enquanto o fundo do painel some: o painel chega
 * ao cartão sendo ele. Termina quando chega.
 */
function fechar({ fundo, painel, conteudo }: Pecas, { origem, voos, copia }: Passagem): Promise<unknown> {
  const ate = { fill: 'forwards' } as const
  if (menosMovimento()) {
    return Promise.all([fundo, painel].map((peca) => peca.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.semMovimento }).finished))
  }
  const caminho = { ...ate, duration: TEMPOS.fechar, easing: TEMPOS.curva }
  fundo.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar, easing: 'ease-in' })
  const encolher = painel.animate({ clipPath: [recorteInteiro(raioDe(painel)), recorteDe(painel, origem)] }, caminho)
  if (!origem) {
    // sem o cartão à vista para onde voltar, o painel some no caminho
    conteudo.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar * 0.4, easing: 'ease-in' })
    painel.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.fechar, easing: 'ease-in' })
    return encolher.finished
  }
  for (const parte of semVoo(conteudo, voos)) parte.animate({ opacity: [1, 0] }, { ...ate, duration: TEMPOS.saida, easing: 'ease-in' })
  for (const voo of voos) voar(voo, false, caminho)
  const troca = { fill: 'both', duration: TEMPOS.cartao, delay: TEMPOS.fechar - TEMPOS.cartao, easing: 'ease-out' } as const
  painel.animate({ backgroundColor: [getComputedStyle(painel).backgroundColor, 'transparent'] }, troca)
  copia?.animate({ opacity: [0, 1] }, troca)
  return encolher.finished
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
  const fantasma = useRef<HTMLDivElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLDivElement>(null)
  // o painel está saindo (desmontando): o fechamento do diálogo não é um pedido de fechar
  const saindo = useRef(false)
  // os movimentos da abertura: fechada antes de eles acabarem, ela volta por eles
  const abertura = useRef<Animation[]>([])
  // O vídeo do cartão para enquanto a página está aberta (ela continua o dele) e, ao fechar, continua
  // o dela: devolvido uma vez, na volta para o cartão ou, sem ela, ao desmontar.
  const videoDoCartao = useRef<{ video: HTMLVideoElement; tocava: boolean } | null>(null)
  const area = areas.find((opcao) => opcao.id === project.area)
  const fechou = useEffectEvent(onFechado)

  const pecas = (): Pecas | null => {
    const [f, p, c, g] = [fundo.current, painel.current, conteudo.current, fantasma.current]
    return f && p && c && g ? { fundo: f, painel: p, conteudo: c, fantasma: g } : null
  }

  const devolverVideo = () => {
    const doCartao = videoDoCartao.current
    videoDoCartao.current = null
    if (doCartao && !continuarVideo(videoDe(conteudo.current), doCartao.video) && doCartao.tocava) void doCartao.video.play().catch(() => {})
  }

  // Abrir: por cima de tudo (o resto do site fica inerte e a rolagem, travada); o cartão some, já que
  // é ele que vira o painel. Ao sair, tudo volta, e o foco vai para o botão do cartão.
  useLayoutEffect(() => {
    const d = dialogo.current
    const p = pecas()
    if (!d || !p) return
    saindo.current = false
    const cartao = document.getElementById(idDoCartao(project.id))
    d.showModal()
    const destravar = travarRolagem()
    // A página continua o vídeo do cartão, do quadro em que ele está, que fica por cima dela até ela
    // chegar lá; o do cartão para.
    const doCartao = videoDe(cartao)
    const daPagina = videoDe(p.conteudo)
    const tirarQuadro = quadroPorCima(doCartao, daPagina)
    continuarVideo(doCartao, daPagina)
    const ida = passagem(cartao, p)
    if (doCartao) {
      videoDoCartao.current = { video: doCartao, tocava: !doCartao.paused }
      doCartao.pause()
    }
    if (cartao) cartao.style.visibility = 'hidden'
    // O foco vai para o texto, e não para o primeiro botão (o X), que o navegador escolheria: o leitor
    // de tela anuncia o projeto (o título nomeia o diálogo), as setas e o Page Down já rolam o texto,
    // e o X não aparece marcado à toa. O Tab chega a ele.
    corpo.current?.focus({ preventScroll: true })
    abertura.current = abrir(p, ida)
    return () => {
      saindo.current = true
      for (const animacao of abertura.current) animacao.cancel()
      p.fantasma.replaceChildren()
      tirarQuadro()
      devolverVideo()
      destravar()
      if (cartao) cartao.style.visibility = ''
      if (d.open) d.close()
      cartao?.querySelector<HTMLElement>(`[${ABRE_PROJETO}]`)?.focus({ preventScroll: true })
    }
  }, [project.id])

  useEffect(() => {
    if (!fechando) return
    const p = pecas()
    let ativo = true
    const terminou = () => {
      if (ativo) fechou()
    }
    devolverVideo()
    const animacoes = abertura.current
    if (!p) terminou()
    else if (animacoes.some((animacao) => animacao.playState === 'running')) {
      // fechada no meio da abertura: a página volta pelo mesmo caminho, de onde estava
      for (const animacao of animacoes) {
        animacao.effect?.updateTiming({ fill: 'both' })
        animacao.reverse()
      }
      Promise.all(animacoes.map((animacao) => animacao.finished)).then(terminou, terminou)
    } else fechar(p, passagem(document.getElementById(idDoCartao(project.id)), p)).then(terminou, terminou)
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
        {/* a cópia do cartão, enquanto ele vira a página e quando ela volta a ser ele (veja copiaDoCartao) */}
        <div ref={fantasma} aria-hidden="true" className="pointer-events-none absolute inset-0" />
        <div ref={conteudo} className="relative flex min-h-0 flex-1 flex-col">
          {/* o nome, a área e o ano vêm do cartão, voando (veja transicao.ts) */}
          <header className="flex items-start justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
            <div className="min-w-0">
              <p className="label text-subtle">
                <span {...marcaDoVoo('area')} className="relative inline-block">
                  {area && t(area.label)}
                </span>
                <span> · </span>
                <span {...marcaDoVoo('ano')} className="relative inline-block tabular-nums">
                  {project.year}
                </span>
              </p>
              <h2 id={tituloId} className="mt-1.5 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                <span {...marcaDoVoo('titulo')} className="relative inline-block">
                  {t(project.name)}
                </span>
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t(ui.projeto.fechar)} className={cx(botaoIcone, '-mr-1.5 shrink-0')}>
              <Close className="size-5" />
            </button>
          </header>
          {/* a linha embaixo do cabeçalho, à parte dele: ela aparece com o resto, e ele, não (tem peças que voam) */}
          <div aria-hidden="true" className="h-px shrink-0 bg-line" />
          <div
            ref={corpo}
            tabIndex={-1}
            className="sem-barra min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 outline-none sm:px-8 sm:py-10 lg:px-12 lg:py-12"
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
