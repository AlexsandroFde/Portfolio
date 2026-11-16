import { useEffect, useRef, useState } from 'react'
import type { ProjectVideo as Video } from '../data/projects.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { Pause, Play } from './icons.tsx'

/**
 * Vídeo curto do projeto, sem som e em loop (faz o papel de um GIF, com uma
 * fração do tamanho). Só baixa e toca quando aparece na tela e pausa ao sair
 * dela. Para quem prefere menos movimento, fica no pôster até a pessoa tocar.
 */
export function ProjectVideo({ video, className }: { video: Video; className?: string }) {
  const t = useT()
  const ref = useRef<HTMLVideoElement>(null)
  // a pessoa pausou: o vídeo não volta a tocar sozinho ao reaparecer na tela
  const pausadoPelaPessoa = useRef(false)
  const [tocando, setTocando] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.muted = true // (o atributo muted não sai no HTML pré-renderizado; sem ele o navegador não deixa tocar sozinho)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          if (!pausadoPelaPessoa.current) el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const alternar = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      pausadoPelaPessoa.current = false
      el.muted = true
      el.play().catch(() => {})
    } else {
      pausadoPelaPessoa.current = true
      el.pause()
    }
  }

  return (
    <figure
      className={cx(
        // acima do link que cobre o cartão do projeto (quando há repositório)
        'relative z-10 overflow-hidden bg-surface',
        className,
      )}
    >
      {/* O pôster é uma imagem atrás do vídeo, e não o atributo poster: assim ele só é baixado perto de
          aparecer (loading="lazy") e vem no tamanho da tela. Sem quadros carregados, o vídeo fica
          transparente e deixa a imagem à vista; quando toca, cobre a imagem. */}
      <img
        src={video.poster}
        srcSet={`${video.posterPequeno} 640w, ${video.poster} 1280w`}
        sizes="(min-width: 72rem) 534px, (min-width: 64rem) 46vw, 92vw"
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
      <video
        ref={ref}
        className="relative block aspect-video w-full object-cover"
        width={1280}
        height={720}
        muted
        loop
        playsInline
        preload="none"
        aria-label={t(video.description)}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
      >
        <source src={video.src} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={alternar}
        aria-label={t(tocando ? ui.video.pausar : ui.video.reproduzir)}
        title={t(tocando ? ui.video.pausarCurto : ui.video.reproduzirCurto)}
        className="print-hidden absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        {tocando ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </figure>
  )
}
