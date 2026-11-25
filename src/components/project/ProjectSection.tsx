import { useId } from 'react'
import type { ProjectSection as Section } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { cx } from '../../lib/cx.ts'
import type { Arranjo, Fileira } from './diagramacao.ts'
import { FaixaDeFiguras, FileiraDeFiguras } from './ProjectFigure.tsx'

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * As larguras de uma demonstração numa fileira de `n`, para o navegador escolher o arquivo: no
 * computador, a largura da área (`px`) dividida entre elas; no tablet, a tela dividida; no celular,
 * a tela dividida em `noCelular` (1 quando elas se empilham).
 */
function tamanhos(n: number, px: number, noCelular: number) {
  return `(min-width: 64rem) ${Math.round(px / n)}px, (min-width: 40rem) ${Math.round(92 / n)}vw, ${Math.round(92 / noCelular)}vw`
}

/** As larguras (px) no computador: a coluna das demonstrações (7 de 12) e a página toda. */
const COLUNA = 600
const LARGURA_TODA = 1060

function Cabecalho({ numero, titulo, id }: { numero: number; titulo: string; id: string }) {
  return (
    <header>
      <p className="label tabular-nums text-accent" aria-hidden="true">
        {doisDigitos(numero)}
      </p>
      <h3 id={id} className="mt-2 text-xl font-medium tracking-[-0.025em] text-fg sm:text-[1.375rem]">
        {titulo}
      </h3>
    </header>
  )
}

/** O texto de uma parte: os parágrafos e os itens, nessa ordem. */
function Corpo({ secao }: { secao: Section }) {
  const t = useT()
  const texto = 'text-pretty text-[0.9375rem] leading-relaxed text-muted sm:text-base'

  return (
    <div className="space-y-5">
      {secao.paragraphs?.map((paragrafo) => (
        <p key={paragrafo.pt} className={texto}>
          {t(paragrafo)}
        </p>
      ))}
      {secao.items && (
        <ul className="space-y-3">
          {secao.items.map((item) => (
            <li
              key={item.pt}
              className={cx(
                texto,
                'relative pl-4 before:absolute before:left-0 before:top-[0.65em] before:size-1.5 before:rounded-full before:bg-accent',
              )}
            >
              {t(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * As fileiras que vêm embaixo do texto, na largura toda: deitadas lado a lado (empilhadas no
 * celular) ou, na faixa, em pé (duas por linha no celular).
 */
function Embaixo({ fileiras, faixa, className }: { fileiras: readonly Fileira[]; faixa: boolean; className?: string }) {
  return (
    <div className={cx('min-w-0 space-y-8 lg:col-span-12', className)}>
      {fileiras.map((fileira) =>
        faixa ? (
          <FaixaDeFiguras key={fileira[0]?.src} fileira={fileira} sizes={tamanhos(fileira.length, LARGURA_TODA, 2)} />
        ) : (
          <FileiraDeFiguras key={fileira[0]?.src} fileira={fileira} sizes={tamanhos(fileira.length, LARGURA_TODA, 1)} />
        ),
      )}
    </div>
  )
}

/**
 * Uma parte da página de um projeto, na grade de 12 colunas, arrumada como `arranjo` manda (veja
 * diagramacao.ts). Com as demonstrações ao lado, o texto fica em 5 colunas e elas em 7, de um lado
 * ou do outro (`inverter`): quem monta a página alterna, e o olho vai de um lado ao outro. Com várias
 * empilhadas, o texto acompanha a rolagem ao lado delas.
 */
export function ProjectSection({ secao, numero, arranjo, inverter }: { secao: Section; numero: number; arranjo: Arranjo; inverter: boolean }) {
  const t = useT()
  const id = useId()
  const cabecalho = <Cabecalho numero={numero} titulo={t(secao.title)} id={id} />

  if (arranjo.tipo === 'lado') {
    const [unica] = arranjo.coluna
    const sozinha = arranjo.coluna.length === 1 && unica?.length === 1
    return (
      <section aria-labelledby={id} className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-12">
        <div
          className={cx(
            'min-w-0 lg:col-span-5 lg:row-start-1',
            inverter ? 'lg:col-start-8' : 'lg:col-start-1',
            sozinha ? 'lg:self-center' : 'lg:sticky lg:top-8 lg:self-start',
          )}
        >
          {cabecalho}
          <div className="mt-5">
            <Corpo secao={secao} />
          </div>
        </div>
        <div
          className={cx(
            'min-w-0 space-y-8 lg:col-span-7 lg:row-start-1',
            inverter ? 'lg:col-start-1' : 'lg:col-start-6',
            // uma só: o que for mais baixo, o texto ou ela, fica no meio do outro
            sozinha && 'lg:self-center',
          )}
        >
          {arranjo.coluna.map((fileira) => (
            // (na coluna, as em pé continuam lado a lado no celular)
            <FileiraDeFiguras key={fileira[0]?.src} fileira={fileira} sizes={tamanhos(fileira.length, COLUNA, fileira.length)} />
          ))}
        </div>
        {arranjo.embaixo.length > 0 && <Embaixo fileiras={arranjo.embaixo} faixa={false} />}
      </section>
    )
  }

  // Só o texto (ou o texto e uma faixa embaixo): o título de um lado e o texto do outro, como nas
  // seções do site, com o texto na mesma coluna das demonstrações das partes ao lado.
  return (
    <section aria-labelledby={id} className="grid gap-y-5 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-12">
      <div className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start">{cabecalho}</div>
      <div className="min-w-0 lg:col-span-7">
        <Corpo secao={secao} />
      </div>
      {arranjo.tipo === 'faixa' && <Embaixo fileiras={arranjo.embaixo} faixa className="mt-3 lg:mt-0" />}
    </section>
  )
}
