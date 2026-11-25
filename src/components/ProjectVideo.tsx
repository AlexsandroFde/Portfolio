import { useEffect, useRef, useState } from 'react'
import type { ProjectVideo as Video } from '../data/projects.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { Pause, Play } from './icons.tsx'

/** O navegador pede economia de dados (o modo econômico dele ou do sistema)? Nem todos contam. */
function economizaDados(): boolean {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
}

/**
 * O anel do progresso, dentro da borda do botão (no viewBox de 36 do botão, em px): o raio e a
 * espessura da linha e a opacidade do trilho. O trilho fica sempre à vista, apagado, e o arco cresce
 * sobre ele do alto, no sentido do relógio, até fechar a volta no fim do vídeo (e recomeça vazio a
 * cada volta do loop).
 */
const ANEL = { raio: 15, espessura: 2, trilho: 0.3 }
const VOLTA = 2 * Math.PI * ANEL.raio

/**
 * Vídeo curto do projeto, sem som e em loop (faz o papel de um GIF, com uma
 * fração do tamanho). Só baixa e toca quando aparece na tela e pausa ao sair
 * dela. Para quem prefere menos movimento, ou pede economia de dados (os
 * vídeos somam uns 4 MB), fica no pôster até a pessoa tocar.
 *
 * O botão de pausar tem em volta um anel com o progresso do vídeo.
 */
export function ProjectVideo({ video, className }: { video: Video; className?: string }) {
  const t = useT()
  const ref = useRef<HTMLVideoElement>(null)
  const arcoRef = useRef<SVGCircleElement>(null)
  // a pessoa pausou: o vídeo não volta a tocar sozinho ao reaparecer na tela
  const pausadoPelaPessoa = useRef(false)
  const [tocando, setTocando] = useState(false)

  // O arco anda a cada quadro novo do vídeo, com o tempo do quadro que aparece, direto no elemento
  // (sem o React: são uns 30 por segundo); com o vídeo parado, nada roda. Onde não há como saber de
  // cada quadro, ele anda aos saltos, a cada aviso do tempo do vídeo.
  useEffect(() => {
    const el = ref.current
    const arco = arcoRef.current
    if (!el || !arco) return
    const mostrar = (tempo: number) => {
      const progresso = el.duration > 0 ? Math.min(1, Math.max(0, tempo / el.duration)) : 0
      arco.style.strokeDashoffset = `${VOLTA * (1 - progresso)}`
    }
    mostrar(el.currentTime)

    if (typeof el.requestVideoFrameCallback !== 'function') {
      const aoAndar = () => mostrar(el.currentTime)
      el.addEventListener('timeupdate', aoAndar)
      return () => el.removeEventListener('timeupdate', aoAndar)
    }
    let pedido = 0
    const aCadaQuadro: VideoFrameRequestCallback = (_, quadro) => {
      mostrar(quadro.mediaTime)
      pedido = el.requestVideoFrameCallback(aCadaQuadro)
    }
    pedido = el.requestVideoFrameCallback(aCadaQuadro)
    return () => el.cancelVideoFrameCallback(pedido)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.muted = true // (o atributo muted não sai no HTML pré-renderizado; sem ele o navegador não deixa tocar sozinho)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || economizaDados()) return
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
        {/* O anel do progresso. Ele fica fora das fotos da absorção (data-anel): na tira do buraco
            negro, quem o desenha é o pintor dos vídeos, com o tempo de cada quadro (veja Anel, em
            lib/buracoNegro/pintor.ts). */}
        <svg
          data-anel=""
          viewBox="0 0 36 36"
          fill="none"
          stroke="currentColor"
          strokeWidth={ANEL.espessura}
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          <circle cx="18" cy="18" r={ANEL.raio} opacity={ANEL.trilho} />
          <circle
            ref={arcoRef}
            cx="18"
            cy="18"
            r={ANEL.raio}
            strokeDasharray={VOLTA}
            strokeDashoffset={VOLTA}
            transform="rotate(-90 18 18)"
          />
        </svg>
        {tocando ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </figure>
  )
}
