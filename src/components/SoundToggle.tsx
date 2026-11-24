import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { alternarSom, estadoDoSom, nivelDoSom, ouvirSom, type EstadoDoSom } from '../lib/som/index.ts'

/** No HTML pré-renderizado, e até a página hidratar, o som está desligado. */
const desligadoNoServidor = (): EstadoDoSom => 'desligado'

/** O desenho da onda: largura e altura (px CSS, o viewBox) e o quanto ela sobe e desce do meio, no máximo. */
const ONDA = { largura: 24, altura: 14, pico: 4.5 }

/**
 * As duas camadas da onda, como as de um som: a da frente e um eco mais fraco atrás, em outro ritmo.
 * Cada uma soma senoides (quanto pesa, quantas ondas cabem na largura, a que velocidade corre, em
 * relação à fase, e de onde parte) e tem a sua altura em relação à da frente.
 */
const CAMADAS = {
  frente: { altura: 1, senoides: [[0.72, 1.5, -1, 0], [0.28, 3.5, 1.7, 0]] },
  eco: { altura: 0.65, senoides: [[0.6, 2.5, -0.6, 1.1], [0.4, 1, 1.2, 2.3]] },
} as const

/**
 * Quanto a onda se abre (0 é a linha reta, 1 o máximo): tocando, do PISO (a música no mais baixo, para
 * ela nunca parecer desligada) até 1, com o volume; desligada, só um ensaio com o mouse em cima; e,
 * com o movimento reduzido, parada nesta abertura.
 */
const ABERTURA = { piso: 0.2, ensaio: 0.14, parada: 0.6 }

/**
 * Em quanto tempo (s) o volume e a abertura sobem e descem: sobem depressa, para o pulso e o chirp de
 * um clique aparecerem, e descem devagar, para a onda não tremer.
 */
const SEGUE = { volumeSobe: 0.025, volumeDesce: 0.22, abre: 0.05, fecha: 0.3 }

/** Quantas vezes por segundo a onda corre: devagar com a música baixa, e mais um tanto com ela cheia. */
const VELOCIDADE = { calma: 0.45, cheia: 0.55 }

/** De quanto em quanto tempo (ms), no mínimo, a onda é redesenhada: uns 50 quadros por segundo bastam. */
const ENTRE_QUADROS = 19

/**
 * A linha de uma camada da onda com abertura `a`, na fase `fase` (rad): as senoides dela, presas nas
 * pontas, como um pacote de onda. Com `a` zero, uma reta.
 */
function ondaEm(camada: (typeof CAMADAS)[keyof typeof CAMADAS], a: number, fase: number): string {
  const { largura, altura, pico } = ONDA
  let d = ''
  for (let x = 0; x <= largura; x++) {
    const u = x / largura
    let forma = 0
    for (const [peso, ondas, velocidade, partida] of camada.senoides) forma += peso * Math.sin(2 * Math.PI * ondas * u + velocidade * fase + partida)
    const y = altura / 2 - a * camada.altura * pico * Math.sin(Math.PI * u) * forma
    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`
  }
  return d
}

const RETA = ondaEm(CAMADAS.frente, 0, 0)

/**
 * O botão do som (veja lib/som), sempre à vista no canto de baixo da tela, ao lado do link do outro
 * idioma, discreto: cinza, pequeno, sem borda. Ele é uma onda: desligado, uma linha reta; tocando, ela
 * ondula com a música que sai (cresce com o volume, pulsa com o pulso e corre mais depressa quando a
 * música está cheia). Com o som guardado como ligado, mas ainda à espera do primeiro clique na
 * página, ele fica reto: mostra o que se ouve. No mergulho, o buraco negro engole o canto, como ao
 * cabeçalho, e ele volta com o site (veja App.tsx e mergulho.ts).
 *
 * A onda é redesenhada só enquanto se mexe, e nunca com a aba escondida: desligada e parada, nada
 * roda.
 */
export function SoundToggle() {
  const t = useT()
  const tocando = useSyncExternalStore(ouvirSom, estadoDoSom, desligadoNoServidor) === 'tocando'
  const botaoRef = useRef<HTMLButtonElement>(null)
  const frenteRef = useRef<SVGPathElement>(null)
  const ecoRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const botao = botaoRef.current
    const frente = frenteRef.current
    const eco = ecoRef.current
    if (!botao || !frente || !eco) return
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
    let pedido = 0
    let anterior = 0
    let volume = 0
    let abertura = 0
    let fase = 0
    let sobre = false

    const seguir = (de: number, para: number, dt: number, sobe: number, desce: number) =>
      de + (para - de) * (1 - Math.exp(-dt / (para > de ? sobe : desce)))

    const quadro = (agora: number) => {
      // numa tela rápida, os quadros entre um desenho e outro não fazem nada
      if (anterior && agora - anterior < ENTRE_QUADROS) {
        pedido = requestAnimationFrame(quadro)
        return
      }
      pedido = 0
      const dt = anterior ? Math.min(0.1, (agora - anterior) / 1000) : 0
      anterior = agora
      const ligado = estadoDoSom() === 'tocando'
      const parada = reduzido.matches
      volume = seguir(volume, ligado ? nivelDoSom() : 0, dt, SEGUE.volumeSobe, SEGUE.volumeDesce)
      const alvo = ligado
        ? parada
          ? ABERTURA.parada
          : ABERTURA.piso + (1 - ABERTURA.piso) * volume
        : sobre && !parada
          ? ABERTURA.ensaio
          : 0
      abertura = parada ? alvo : seguir(abertura, alvo, dt, SEGUE.abre, SEGUE.fecha)
      if (!parada) fase += dt * 2 * Math.PI * (VELOCIDADE.calma + VELOCIDADE.cheia * volume)
      const assentou = Math.abs(abertura - alvo) < 0.002 && (alvo === 0 || parada)
      const reta = assentou && alvo === 0
      frente.setAttribute('d', reta ? RETA : ondaEm(CAMADAS.frente, abertura, fase))
      eco.setAttribute('d', reta ? RETA : ondaEm(CAMADAS.eco, abertura, fase))
      if (!assentou && !document.hidden) pedido = requestAnimationFrame(quadro)
      else anterior = 0
    }

    const acordar = () => {
      if (!pedido && !document.hidden) pedido = requestAnimationFrame(quadro)
    }
    const entrou = (evento: PointerEvent) => {
      if (evento.pointerType !== 'mouse') return
      sobre = true
      acordar()
    }
    const saiu = () => {
      sobre = false
      acordar()
    }

    const pararDeOuvir = ouvirSom(acordar)
    botao.addEventListener('pointerenter', entrou)
    botao.addEventListener('pointerleave', saiu)
    document.addEventListener('visibilitychange', acordar)
    reduzido.addEventListener('change', acordar)
    acordar()
    return () => {
      cancelAnimationFrame(pedido)
      pararDeOuvir()
      botao.removeEventListener('pointerenter', entrou)
      botao.removeEventListener('pointerleave', saiu)
      document.removeEventListener('visibilitychange', acordar)
      reduzido.removeEventListener('change', acordar)
    }
  }, [])

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    alternarSom(rect.left + rect.width / 2)
  }

  return (
    <button
      ref={botaoRef}
      type="button"
      data-som=""
      onClick={onClick}
      className="som-flutuante print-hidden h-9 w-12 place-items-center rounded-full bg-bg/60 text-subtle transition-[color,background-color,scale] duration-300 hover:bg-surface hover:text-fg active:scale-95"
      aria-pressed={tocando}
      aria-label={t(ui.som.rotulo)}
      title={t(tocando ? ui.som.desligar : ui.som.ligar)}
    >
      <svg
        width={ONDA.largura}
        height={ONDA.altura}
        viewBox={`0 0 ${ONDA.largura} ${ONDA.altura}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        overflow="visible"
        aria-hidden="true"
      >
        <path ref={ecoRef} d={RETA} strokeWidth={1.1} opacity={0.35} />
        <path ref={frenteRef} d={RETA} strokeWidth={1.5} />
      </svg>
    </button>
  )
}
