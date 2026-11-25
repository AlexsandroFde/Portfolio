import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ProjectMedia } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { ui } from '../../i18n/interface.ts'
import { cx } from '../../lib/cx.ts'
import { ArrowLeft, ArrowRight, Play } from '../icons.tsx'
import { MediaThumbnail, MediaView } from './ProjectMedia.tsx'

/** As larguras do palco na tela: a coluna da galeria no computador, quase a tela toda no celular. */
const TAMANHOS_DO_PALCO = '(min-width: 64rem) 640px, 92vw'

/** Quanto (px) o dedo precisa andar de lado, no palco, para passar de demonstração. */
const ARRASTE = 48

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * As demonstrações de um projeto: uma em destaque no palco, inteira na caixa, com a legenda e as
 * miniaturas de todas embaixo. Passa de uma para outra pelas setas, pelas miniaturas, pelas setas
 * do teclado (com o foco na galeria) e arrastando o dedo de lado no palco.
 */
export function ProjectGallery({ media }: { media: readonly ProjectMedia[] }) {
  const t = useT()
  const [atual, setAtual] = useState(0)
  const inicioDoDedo = useRef<{ x: number; y: number } | null>(null)
  const total = media.length
  const item = media[Math.min(atual, total - 1)]
  if (!item) return null

  const ir = (passo: number) => setAtual((i) => (i + passo + total) % total)

  const teclas = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    evento.preventDefault()
    ir(evento.key === 'ArrowRight' ? 1 : -1)
  }
  const dedoDesceu = (evento: PointerEvent<HTMLDivElement>) => {
    inicioDoDedo.current = evento.pointerType === 'touch' ? { x: evento.clientX, y: evento.clientY } : null
  }
  const dedoSubiu = (evento: PointerEvent<HTMLDivElement>) => {
    const inicio = inicioDoDedo.current
    inicioDoDedo.current = null
    if (!inicio) return
    const dx = evento.clientX - inicio.x
    if (Math.abs(dx) > ARRASTE && Math.abs(dx) > Math.abs(evento.clientY - inicio.y) * 1.5) ir(dx < 0 ? 1 : -1)
  }

  return (
    <section aria-label={t(ui.projeto.demonstracoes)} onKeyDown={teclas}>
      <div
        className="relative aspect-video touch-pan-y overflow-hidden rounded-xl border border-line bg-black"
        onPointerDown={dedoDesceu}
        onPointerUp={dedoSubiu}
        onPointerCancel={() => (inicioDoDedo.current = null)}
      >
        {/* a chave troca a demonstração inteira: um vídeo que sai para e libera o que baixou */}
        <MediaView key={atual} media={item} fit="contain" sizes={TAMANHOS_DO_PALCO} loading="eager" className="size-full" />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label={t(ui.projeto.anterior)}
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label={t(ui.projeto.proxima)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <ArrowRight className="size-4" />
            </button>
          </>
        )}
      </div>

      <p aria-live="polite" className="mt-3 flex gap-3 text-pretty text-sm leading-relaxed text-muted">
        {total > 1 && (
          <span className="label mt-0.5 shrink-0 tabular-nums text-subtle">
            {doisDigitos(atual + 1)}
            <span className="sr-only"> {t(ui.projeto.de)} </span>
            <span aria-hidden="true"> / </span>
            {doisDigitos(total)}
          </span>
        )}
        <span>{t(item.caption)}</span>
      </p>

      {total > 1 && (
        <ul className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {media.map((demonstracao, i) => (
            // (a lista é fixa: a posição identifica cada demonstração)
            <li key={i} className="shrink-0">
              <button
                type="button"
                onClick={() => setAtual(i)}
                aria-current={i === atual}
                aria-label={`${t(ui.projeto.demonstracao)} ${i + 1} ${t(ui.projeto.de)} ${total}${demonstracao.kind === 'video' ? ` (${t(ui.projeto.video)})` : ''}: ${t(demonstracao.caption)}`}
                className={cx(
                  'relative block h-14 w-24 overflow-hidden rounded-md border bg-black transition-[opacity,border-color] duration-200 sm:h-16 sm:w-28',
                  i === atual ? 'border-accent opacity-100' : 'border-line opacity-55 hover:opacity-100',
                )}
              >
                <MediaThumbnail media={demonstracao} />
                {demonstracao.kind === 'video' && (
                  <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white">
                    <Play className="size-2.5" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
