import type { CSSProperties } from 'react'
import type { ProjectMedia } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { cx } from '../../lib/cx.ts'
import { emPe, proporcao, type Fileira } from './diagramacao.ts'
import { MediaView } from './ProjectMedia.tsx'
import { marcaDoVoo, type NomeDoVoo } from './transicao.ts'

/**
 * Uma demonstração com a legenda embaixo. A caixa tem a proporção dela: a demonstração aparece
 * inteira, sem tarjas, e o espaço já fica reservado antes de ela carregar.
 */
export function Figura({
  media,
  voo,
  sizes,
  loading,
  className,
  style,
}: {
  media: ProjectMedia
  /** A peça do cartão que ela é, e que voa dele para cá ao abrir a página (veja transicao.ts). */
  voo?: NomeDoVoo
  /** As larguras que ela ocupa na tela, para o navegador escolher o tamanho do arquivo. */
  sizes: string
  loading?: 'eager' | 'lazy'
  className?: string
  style?: CSSProperties
}) {
  const t = useT()

  return (
    <figure className={cx('min-w-0', className)} style={style}>
      <div
        {...(voo ? marcaDoVoo(voo) : {})}
        className="overflow-hidden rounded-xl border border-line bg-black"
        style={{ aspectRatio: `${media.width} / ${media.height}` }}
      >
        <MediaView media={media} fit="contain" sizes={sizes} loading={loading} className="size-full" />
      </div>
      <figcaption className="mt-3 text-pretty text-sm leading-relaxed text-subtle">{t(media.caption)}</figcaption>
    </figure>
  )
}

/** O peso de cada uma numa fileira: a largura na proporção dela, para todas terem a mesma altura. */
const peso = (media: ProjectMedia) => ({ '--peso': proporcao(media) }) as CSSProperties

/**
 * Demonstrações lado a lado, com a mesma altura (cada uma com a largura na proporção dela). As
 * deitadas se empilham no celular, onde lado a lado ficariam pequenas demais; as em pé continuam
 * lado a lado. Uma em pé sozinha não ocupa a largura toda, que a deixaria alta demais.
 */
export function FileiraDeFiguras({ fileira, sizes }: { fileira: Fileira; sizes: string }) {
  const [primeira] = fileira
  if (!primeira) return null
  if (fileira.length === 1) {
    return <Figura media={primeira} sizes={sizes} className={emPe(primeira) ? 'mx-auto w-full max-w-xs' : undefined} />
  }

  const deitadas = !fileira.some(emPe)
  return (
    <div className={cx('flex gap-4', deitadas ? 'flex-col gap-y-8 sm:flex-row' : 'flex-row')}>
      {fileira.map((media) => (
        <Figura
          key={media.src}
          media={media}
          sizes={sizes}
          style={peso(media)}
          className={deitadas ? 'sm:[flex:var(--peso)_1_0%]' : '[flex:var(--peso)_1_0%]'}
        />
      ))}
    </div>
  )
}

/** Quantas colunas uma faixa tem a partir do tablet (no celular, sempre duas). */
const COLUNAS_DA_FAIXA: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }

/** Demonstrações em pé numa faixa: uma ao lado da outra no computador, duas por linha no celular. */
export function FaixaDeFiguras({ fileira, sizes }: { fileira: Fileira; sizes: string }) {
  return (
    <div className={cx('grid grid-cols-2 gap-x-4 gap-y-8', COLUNAS_DA_FAIXA[fileira.length])}>
      {fileira.map((media) => (
        <Figura key={media.src} media={media} sizes={sizes} />
      ))}
    </div>
  )
}
