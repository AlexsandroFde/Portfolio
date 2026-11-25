import type { ComponentType } from 'react'
import type { ImageMedia, ProjectMedia, VideoMedia } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { cx } from '../../lib/cx.ts'
import { ProjectVideo } from '../ProjectVideo.tsx'

/** Como mostrar uma demonstração. Todo tipo de mídia recebe o mesmo, e quem a usa não sabe qual é. */
export interface MediaViewProps<M extends ProjectMedia = ProjectMedia> {
  media: M
  /** Cobrir a caixa, cortando as bordas (o cartão), ou caber inteira nela (a galeria). */
  fit: 'cover' | 'contain'
  /** As larguras que ela ocupa na tela, para o navegador escolher o tamanho do arquivo. */
  sizes: string
  className?: string
  /** Baixar já (a demonstração à vista) ou só perto de aparecer. */
  loading?: 'eager' | 'lazy'
  /** Um clique (ou o segundo toque) na mídia, fora dos controles dela. */
  onActivate?: () => void
}

function ImageView({ media, fit, sizes, className, loading = 'lazy', onActivate }: MediaViewProps<ImageMedia>) {
  const t = useT()

  return (
    <img
      src={media.src}
      srcSet={`${media.srcSmall} 640w, ${media.src} ${media.width}w`}
      sizes={sizes}
      width={media.width}
      height={media.height}
      loading={loading}
      decoding="async"
      alt={t(media.alt)}
      // (quem usa o teclado chega à mesma ação pelo botão de quem usa a mídia)
      onClick={onActivate}
      className={cx('block size-full', fit === 'cover' ? 'object-cover' : 'object-contain', onActivate && 'cursor-pointer', className)}
    />
  )
}

function VideoView({ media, fit, sizes, className, onActivate }: MediaViewProps<VideoMedia>) {
  return <ProjectVideo video={media} fit={fit} sizes={sizes} className={className} onActivate={onActivate} />
}

/** O que o site sabe fazer com um tipo de mídia: mostrá-la e dar a imagem pequena dela (a miniatura). */
interface TipoDeMidia<M extends ProjectMedia> {
  Vista: ComponentType<MediaViewProps<M>>
  miniatura(media: M): string
}

/** Cada tipo de mídia: um tipo novo entra aqui, e o cartão e a galeria continuam iguais. */
const tipos: { readonly [K in ProjectMedia['kind']]: TipoDeMidia<Extract<ProjectMedia, { kind: K }>> } = {
  image: { Vista: ImageView, miniatura: (imagem) => imagem.srcSmall },
  video: { Vista: VideoView, miniatura: (video) => video.posterSmall },
}

const tipoDe = (media: ProjectMedia) => tipos[media.kind] as TipoDeMidia<ProjectMedia>

/** Uma demonstração de um projeto, com quem sabe mostrar o tipo dela. */
export function MediaView(props: MediaViewProps) {
  const { Vista } = tipoDe(props.media)
  return <Vista {...props} />
}

/** A imagem pequena de uma demonstração (o pôster, num vídeo), para as miniaturas da galeria. */
export function MediaThumbnail({ media, className }: { media: ProjectMedia; className?: string }) {
  return <img src={tipoDe(media).miniatura(media)} alt="" loading="lazy" decoding="async" className={cx('size-full object-cover', className)} />
}
