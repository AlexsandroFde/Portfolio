import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
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

/** Por quanto tempo (ms) o botão fica à vista depois de um toque no vídeo (no celular, sem mouse). */
const DEPOIS_DO_TOQUE = 3000

/**
 * Vídeo curto do projeto, sem som e em loop (faz o papel de um GIF, com uma
 * fração do tamanho). Só baixa e toca quando aparece na tela e pausa ao sair
 * dela. Para quem prefere menos movimento, ou pede economia de dados (os
 * vídeos somam uns 4 MB), fica no pôster até a pessoa tocar.
 *
 * O botão de pausar, com um anel do progresso do vídeo em volta, só aparece
 * com o mouse em cima do vídeo, com o foco do teclado nele ou por uns segundos
 * depois de um toque no vídeo. Escondido, ele deixa o toque passar para o
 * vídeo: o primeiro toque só o mostra.
 */
export function ProjectVideo({ video, className }: { video: Video; className?: string }) {
  const t = useT()
  const ref = useRef<HTMLVideoElement>(null)
  const arcoRef = useRef<SVGCircleElement>(null)
  // a pessoa pausou: o vídeo não volta a tocar sozinho ao reaparecer na tela
  const pausadoPelaPessoa = useRef(false)
  const [tocando, setTocando] = useState(false)
  const [mouseEmCima, setMouseEmCima] = useState(false)
  const [focado, setFocado] = useState(false)
  const [tocadoHaPouco, setTocadoHaPouco] = useState(false)
  const esconder = useRef(0)
  // o tipo do último ponteiro que desceu no vídeo (o clique não diz isso em todo navegador)
  const ponteiro = useRef('')
  const aVista = mouseEmCima || focado || tocadoHaPouco

  useEffect(() => () => window.clearTimeout(esconder.current), [])

  // O arco anda a cada quadro novo do vídeo, com o tempo do quadro que aparece, direto no elemento
  // (sem o React: são uns 30 por segundo), e só com o botão à vista: escondido, ou com o vídeo
  // parado, nada roda. Onde não há como saber de cada quadro, ele anda aos saltos, a cada aviso do
  // tempo do vídeo.
  useEffect(() => {
    const el = ref.current
    const arco = arcoRef.current
    if (!aVista || !el || !arco) return
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
  }, [aVista])

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

  const mouse = (dentro: boolean) => (evento: PointerEvent) => {
    if (evento.pointerType === 'mouse') setMouseEmCima(dentro)
  }

  // Um toque (ou a caneta) mostra o botão por um tempo, contado de novo a cada toque. No clique, e não
  // quando o dedo sobe: o clique de um toque vem depois, e acertaria o botão já à vista (o toque que
  // só devia mostrá-lo o pausaria).
  const tocou = () => {
    const tipo = ponteiro.current
    ponteiro.current = ''
    if (tipo !== 'touch' && tipo !== 'pen') return
    setTocadoHaPouco(true)
    window.clearTimeout(esconder.current)
    esconder.current = window.setTimeout(() => setTocadoHaPouco(false), DEPOIS_DO_TOQUE)
  }

  // só o foco do teclado (o de um clique ou de um toque não mostra o botão)
  const focou = (evento: FocusEvent<HTMLButtonElement>) => setFocado(evento.currentTarget.matches(':focus-visible'))

  return (
    <figure
      className={cx(
        // acima do link que cobre o cartão do projeto (quando há repositório)
        'relative z-10 overflow-hidden bg-surface',
        className,
      )}
      onPointerEnter={mouse(true)}
      onPointerLeave={mouse(false)}
      onPointerDown={(evento) => {
        ponteiro.current = evento.pointerType
      }}
      onClick={tocou}
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
        onFocus={focou}
        onBlur={() => setFocado(false)}
        aria-label={t(tocando ? ui.video.pausar : ui.video.reproduzir)}
        title={t(tocando ? ui.video.pausarCurto : ui.video.reproduzirCurto)}
        className={cx(
          'print-hidden absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-[opacity,background-color] duration-200 hover:bg-black/75',
          !aVista && 'pointer-events-none opacity-0',
        )}
      >
        {/* O anel do progresso. Ele fica fora das fotos da absorção (data-anel): na tira do buraco
            negro, quem o desenha é o pintor dos vídeos, com o tempo de cada quadro, quando o botão
            aparece na foto (veja Anel, em lib/buracoNegro/pintor.ts). */}
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
