// O mergulho: a página não acaba no rodapé. A rolagem continua por um espaço vazio: primeiro uma
// tela, até não sobrar nada da página à vista; depois, no trecho do mergulho, cai-se no buraco negro.
// Ele desce até o meio da tela e cresce até a sombra dele preencher a tela inteira, e a vista é a de
// quem cai (veja queda.frag): o espaço em volta se torce num redemoinho, as coisas correm para fora em
// rastros, a luz se separa em cores, a visão se fecha num túnel, e o cabeçalho e o botão do som, no
// canto, são puxados para dentro.
// Aí estamos dentro dele: a página volta ao topo, e no escuro acende-se um ponto de luz que se abre
// numa janela redonda, por onde o site vem lá do fundo, arredondado como numa bola, ainda na vista de
// quem cai, até ocupar a tela (veja entrada.ts). Dentro do buraco negro está o topo do site, e a
// rolagem recomeça: um laço sem fim.
//
// Como a absorção, o mergulho depende só da posição da rolagem: rolando devagar ou rápido, cada
// posição mostra a mesma imagem, e rolando para cima ele volta atrás. O trajeto do buraco negro
// recebe o trecho do mergulho (veja trechoDoMergulho e posicaoEm, em trajeto.ts); o preto do fim é um
// véu por cima de tudo, preso à rolagem, que cobre também o cabeçalho e o que sobrar do disco. Só a
// volta ao topo anda no tempo: lá dentro, no topo, não há mais para onde rolar.
//
// Na volta, o motor do buraco negro desenha tudo (veja definirQueda): o site chegando, a partir de
// uma foto do topo dele, numa tela por cima da página, que fica parada no topo, por baixo, e aparece
// no lugar da foto quando o site chega. Sem a foto (ainda não feita, ou onde o navegador não a deixa
// ler), o navegador anima o cabeçalho e o conteúdo, e o motor desenha atrás deles a janela e o
// escuro, os dois a partir do mesmo instante e pela mesma curva. Sem o motor (sem WebGL, ou num
// aparelho lento), a janela é um furo no véu, e o site chega igual. Com o movimento reduzido, o topo
// só aparece com um fade.

import { ENTRADA, pontosDaEntrada } from './entrada.ts'
import { criarRelogio } from './rolagem.ts'

/** Em que parte do mergulho (de 0 a 1) o véu preto começa a entrar e cobre a tela toda. */
const VEU = { de: 0.8, ate: 0.96 }
/**
 * Em que parte do mergulho o cabeçalho é puxado para o buraco negro: ele desce um pouco, se estica
 * na direção dele e some, antes de a queda apertar.
 */
const CABECALHO = { de: 0.06, ate: 0.5 }
/**
 * Em que parte do mergulho o que flutua no canto da tela (o botão do som, veja SoundToggle.tsx,
 * marcado com data-flutuante) é puxado para o buraco negro, e que fração do caminho até o meio da
 * tela ele anda: estica-se na direção dele, afina e some, logo depois do cabeçalho.
 */
const FLUTUANTES = { de: 0.1, ate: 0.5, caminho: 0.3 }
/**
 * A janela, sem o motor: a borda brilha como o anel de luz em volta da sombra, e a luz se espalha
 * `brilho` px no escuro.
 */
const JANELA = { brilho: 18 }
/**
 * Com que antecedência (ms) a entrada é marcada: o motor, no worker, precisa receber o aviso antes do
 * primeiro quadro dela.
 */
const ANTECEDENCIA_DA_ENTRADA = 50
/** A volta com o movimento reduzido (ms): só o fade do véu. A rolagem fica travada durante ele. */
const FADE = 600
/** A curva desse fade: rápida no começo e assentando devagar. */
const DESACELERANDO = 'cubic-bezier(0.33, 1, 0.68, 1)'
/** Quanto antes do fim da rolagem (px) a volta acontece: a rolagem máxima pode ter frações de pixel. */
const MARGEM = 2

interface Trecho {
  /** A rolagem em que o mergulho começa: a página acabou de sair toda da tela. */
  inicio: number
  /** A rolagem máxima, em que a tela está toda preta e a página volta ao topo. */
  fim: number
}

/**
 * Quem desenha a queda e a volta: o motor do buraco negro (veja index.ts). `entrar` marca a entrada
 * para começar no instante `inicio` (ms da linha do tempo da página) e durar `duracao` ms. Com a foto
 * do topo do site (`comFoto`), o motor desenha o próprio site chegando, por cima da página, e
 * `chegou` se cumpre quando ele chega e a página aparece no lugar dele; sem ela, quem traz o site são
 * as animações da página. `cobriu` se cumpre (true) quando o túnel já cobre a tela; com false, o motor
 * não respondeu a tempo (e, com a foto, desistiu dela: a página traz o site).
 */
export interface Queda {
  entrar(inicio: number, duracao: number): { comFoto: boolean; cobriu: Promise<boolean>; chegou: Promise<void> }
}

/**
 * Uma volta ao topo, para quem a acompanha (o som, veja lib/som): quando o site começa a chegar (ms
 * da linha do tempo da página), por quanto tempo (ms) e se é só o fade do movimento reduzido.
 */
export interface Volta {
  inicio: number
  duracao: number
  soFade: boolean
}

let trecho: Trecho | null = null
let queda: Queda | null = null
const ouvintes = new Set<() => void>()
const medidos = new Set<() => void>()
const quedas = new Set<() => void>()
const voltas = new Set<(volta: Volta) => void>()

/** O trecho da rolagem em que se mergulha, ou null se o mergulho não está no ar. */
export function trechoDoMergulho(): Trecho | null {
  return trecho && { ...trecho }
}

/** Chama `ouvinte` sempre que o trecho do mergulho muda. Devolve a função que para de chamar. */
export function quandoMedirMergulho(ouvinte: () => void): () => void {
  medidos.add(ouvinte)
  return () => medidos.delete(ouvinte)
}

/**
 * Chama `ouvinte` logo depois de cada volta ao topo, já com a página lá: a rolagem pulou, não foi
 * o leitor que subiu. Devolve a função que para de chamar.
 */
export function quandoVoltar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/**
 * Chama `ouvinte` a cada volta ao topo, logo que ela é marcada, com o instante e a duração dela.
 * Devolve a função que para de chamar.
 */
export function quandoEntrar(ouvinte: (volta: Volta) => void): () => void {
  voltas.add(ouvinte)
  return () => voltas.delete(ouvinte)
}

/** O motor do buraco negro passa a desenhar a queda e o túnel da volta (ou deixa de, com null). */
export function definirQueda(nova: Queda | null) {
  if (nova === queda) return
  queda = nova
  for (const ouvinte of quedas) ouvinte()
}

/**
 * Liga o mergulho no `espaco` vazio depois do rodapé (a primeira tela dele tira a página de vista;
 * o resto é o trecho do mergulho). Devolve a função que desliga tudo.
 */
export function iniciarMergulho(espaco: HTMLElement): () => void {
  const raiz = document.documentElement
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
  const relogio = criarRelogio()
  const cabecalho = document.querySelector<HTMLElement>('header')
  const principal = document.querySelector<HTMLElement>('main')

  const veu = document.createElement('div')
  veu.className = 'print-hidden'
  veu.setAttribute('aria-hidden', 'true')
  // acima do cabeçalho (z-index 50): a tela inteira fica preta
  veu.style.cssText = 'position:fixed;inset:0;z-index:60;background-color:#000;pointer-events:none;opacity:0'
  document.body.append(veu)
  const efeito = new KeyframeEffect(veu, [{ opacity: 0 }, { opacity: 1 }], { fill: 'both' })
  let escurecer: Animation | null = null
  /** O cabeçalho sendo puxado para dentro, preso à rolagem (só com o motor desenhando a queda). */
  let puxar: Animation | null = null
  /** O que flutua no canto da tela e o puxão de cada um, também preso à rolagem. */
  const puxados = new Map<HTMLElement, Animation>()
  /** Se o que flutua já sumiu no buraco negro (veja marcarAbsorvidos). */
  let absorvidos = false

  let voltando = false
  let seguranca = 0

  /** O trecho da rolagem, de `de` a `ate` (frações do mergulho). */
  const trechoDe = ({ inicio, fim }: Trecho, de: number, ate: number): [number, number] => [inicio + (fim - inicio) * de, inicio + (fim - inicio) * ate]

  /** O cabeçalho só é puxado com a queda no ar e sem o movimento reduzido. */
  function ajustarCabecalho() {
    const deve = queda !== null && !movimentoReduzido.matches && cabecalho !== null && trecho !== null
    if (!deve) {
      if (puxar) relogio.soltar(puxar)
      puxar = null
      return
    }
    const [de, ate] = trechoDe(trecho!, CABECALHO.de, CABECALHO.ate)
    if (puxar) {
      relogio.mover(puxar, de, ate)
      return
    }
    const efeitoDoCabecalho = new KeyframeEffect(
      cabecalho,
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(8px) scale(0.98, 1.2)', opacity: 0.5, offset: 0.55 },
        { transform: 'translateY(20px) scale(0.95, 1.5)', opacity: 0 },
      ],
      { fill: 'both', easing: 'ease-in' },
    )
    puxar = relogio.animar(efeitoDoCabecalho, de, ate)
  }

  /** O que flutua no canto da tela (fixo nele: as medidas não pegam o puxão). */
  const flutuantes = () => [...document.querySelectorAll<HTMLElement>('[data-flutuante]')].filter((elemento) => elemento.offsetWidth > 0)

  /**
   * O puxão de `elemento` na direção do meio da tela, para onde o buraco negro desce: ele anda parte do
   * caminho, estica-se nessa direção, afina e some. O giro fica igual em todos os quadros-chave, para o
   * eixo do esticão não girar no meio.
   */
  function puxao(elemento: HTMLElement): Keyframe[] {
    const dx = window.innerWidth / 2 - (elemento.offsetLeft + elemento.offsetWidth / 2)
    const dy = window.innerHeight / 2 - (elemento.offsetTop + elemento.offsetHeight / 2)
    const giro = Math.atan2(dy, dx)
    const esticar = (andou: number, ao: number, atravessado: number) =>
      `translate(${dx * andou}px, ${dy * andou}px) rotate(${giro}rad) scale(${ao}, ${atravessado}) rotate(${-giro}rad)`
    return [
      { transform: esticar(0, 1, 1), opacity: 1 },
      { transform: esticar(0.25 * FLUTUANTES.caminho, 1.35, 0.8), opacity: 0.6, offset: 0.55 },
      { transform: esticar(FLUTUANTES.caminho, 2.4, 0.3), opacity: 0 },
    ]
  }

  /** O que flutua só é puxado com a queda no ar e sem o movimento reduzido (aí o véu o cobre, como ao cabeçalho). */
  function ajustarFlutuantes() {
    const deve = queda !== null && !movimentoReduzido.matches && trecho !== null
    const elementos = deve ? flutuantes() : []
    for (const [elemento, animacao] of puxados) {
      if (elementos.includes(elemento)) continue
      relogio.soltar(animacao)
      puxados.delete(elemento)
    }
    if (!deve) return
    const [de, ate] = trechoDe(trecho!, FLUTUANTES.de, FLUTUANTES.ate)
    for (const elemento of elementos) {
      const animacao = puxados.get(elemento)
      if (animacao?.effect instanceof KeyframeEffect) {
        animacao.effect.setKeyframes(puxao(elemento))
        relogio.mover(animacao, de, ate)
      } else puxados.set(elemento, relogio.animar(new KeyframeEffect(elemento, puxao(elemento), { fill: 'both', easing: 'ease-in' }), de, ate))
    }
  }

  function ajustarPuxados() {
    ajustarCabecalho()
    ajustarFlutuantes()
  }

  /**
   * Depois de sumir no buraco negro (ou debaixo do véu, sem o puxão), o que flutua deixa de responder
   * ao mouse e ao teclado: invisível, ele ainda estaria ali. Só muda quando a rolagem cruza o ponto.
   */
  function marcarAbsorvidos(s: number) {
    const sumiu = trecho !== null && s >= trechoDe(trecho, 0, puxados.size ? FLUTUANTES.ate : VEU.ate)[1]
    if (sumiu === absorvidos) return
    absorvidos = sumiu
    for (const elemento of flutuantes()) elemento.toggleAttribute('data-absorvido', sumiu)
  }

  function medir() {
    const inicio = espaco.getBoundingClientRect().top + window.scrollY
    const fim = Math.max(inicio + 1, raiz.scrollHeight - window.innerHeight)
    const mudou = trecho?.inicio !== inicio || trecho.fim !== fim
    trecho = { inicio, fim }
    const [de, ate] = trechoDe(trecho, VEU.de, VEU.ate)
    if (escurecer) relogio.mover(escurecer, de, ate)
    else escurecer = relogio.animar(efeito, de, ate)
    ajustarPuxados()
    if (mudou) for (const ouvinte of medidos) ouvinte()
  }

  /** A volta terminou (ou foi interrompida): a rolagem volta a andar. */
  function terminar() {
    window.clearTimeout(seguranca)
    raiz.style.removeProperty('overflow')
    voltando = false
  }

  function pular() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    relogio.acertar(0)
    for (const ouvinte of ouvintes) ouvinte()
  }

  /**
   * O cabeçalho, o conteúdo e o que flutua no canto da tela vêm lá do fundo, a partir do meio da tela:
   * muito pequenos, crescendo até o tamanho normal (veja entrada.ts), a partir do instante `inicio`.
   * Só a primeira tela do site aparece, e não o resto da página, abaixo dela. Devolve a promessa de
   * quando terminam.
   */
  function trazerOSite(inicio: number): Promise<unknown> {
    const quadros = pontosDaEntrada().map(({ u, escala }) => ({ offset: u, transform: `scale(${escala})` }))
    const chegadas: Promise<unknown>[] = []
    for (const parte of [cabecalho, principal, ...flutuantes()]) {
      if (!parte) continue
      // Com a página no topo, o cabeçalho e o conteúdo começam no canto de cima da tela: o meio dela,
      // nas medidas deles. O que flutua fica noutro canto: o meio da tela, a partir de onde ele está.
      const [x, y] = parte === cabecalho || parte === principal ? [0, 0] : [parte.offsetLeft, parte.offsetTop]
      parte.style.transformOrigin = `${window.innerWidth / 2 - x}px ${window.innerHeight / 2 - y}px`
      if (parte === principal) parte.style.clipPath = `inset(0 0 calc(100% - ${window.innerHeight}px) 0)`
      // (fill: o site já fica lá no fundo até o instante de começar)
      const animacao = parte.animate(quadros, { duration: ENTRADA.duracao, easing: 'linear', fill: 'both' })
      animacao.startTime = inicio
      const limpar = () => {
        animacao.cancel()
        parte.style.removeProperty('transform-origin')
        parte.style.removeProperty('clip-path')
      }
      chegadas.push(animacao.finished.then(limpar, limpar))
    }
    return Promise.all(chegadas)
  }

  /**
   * Sem o motor: no meio do véu abre-se a janela, um furo nele, e a borda dela brilha, em volta do
   * site e no mesmo passo que ele, a partir do instante `inicio`.
   */
  function abrirJanela(inicio: number) {
    const meiaDiagonal = Math.hypot(window.innerWidth / 2, window.innerHeight / 2)
    const borda = 'color-mix(in srgb, var(--accent), white 65%)'
    const brilho = 'color-mix(in srgb, var(--accent) 30%, transparent)'
    const furo = 'radial-gradient(circle at 50% 50%, transparent calc(var(--janela) - 1px), #000 var(--janela))'
    veu.style.maskImage = furo
    veu.style.webkitMaskImage = furo
    veu.style.backgroundImage = `radial-gradient(circle at 50% 50%, transparent calc(var(--janela) - 1px), ${borda} var(--janela), ${brilho} calc(var(--janela) + 2px), transparent calc(var(--janela) + ${JANELA.brilho}px))`
    const raios = pontosDaEntrada().map(({ u, janela }) => ({ offset: u, opacity: 1, '--janela': `${janela * meiaDiagonal}px` }))
    const animacao = veu.animate(raios, { duration: ENTRADA.duracao, easing: 'linear', fill: 'both' })
    animacao.startTime = inicio
    const limpar = () => {
      animacao.cancel()
      veu.style.removeProperty('mask-image')
      veu.style.removeProperty('-webkit-mask-image')
      veu.style.removeProperty('background-image')
    }
    animacao.finished.then(limpar, limpar)
  }

  /**
   * Dentro do buraco negro, com a tela toda preta: o site vem lá do fundo. Com o motor no ar e a foto
   * do topo pronta, ele desenha o site chegando, por cima da página parada no topo; sem a foto, a
   * página traz o site (veja trazerOSite) e o motor desenha a janela e o escuro atrás dele. O véu da
   * página, que segura o preto até ali, sai assim que o motor está na tela. Sem ele (ou se ele não
   * responder a tempo), a janela se abre no próprio véu, e a página traz o site. O buraco negro já
   * voltou ao canto, atrás do site, e aparece pela janela quando ela chega lá.
   */
  function entrar() {
    pular()
    const inicio = (document.timeline.currentTime as number) + ANTECEDENCIA_DA_ENTRADA
    for (const ouvinte of voltas) ouvinte({ inicio, duracao: ENTRADA.duracao, soFade: false })
    // o véu segura o preto (por cima da animação que o prende à rolagem, que no topo o apaga)
    const segurar = veu.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ENTRADA.duracao * 2, fill: 'both' })
    const motor = queda
    if (!motor) {
      void trazerOSite(inicio).then(terminar)
      segurar.cancel()
      abrirJanela(inicio)
      return
    }
    const entrada = motor.entrar(inicio, ENTRADA.duracao)
    if (entrada.comFoto) void entrada.chegou.then(terminar)
    else void trazerOSite(inicio).then(terminar)
    void entrada.cobriu.then((cobriu) => {
      segurar.cancel()
      if (cobriu) return
      abrirJanela(inicio)
      if (entrada.comFoto) void trazerOSite(inicio).then(terminar)
    })
  }

  function voltar() {
    voltando = true
    // A rolagem fica travada até o topo terminar de chegar: senão o embalo da roda ou do dedo, que
    // bateu no fim da página, continuaria e levaria o topo para longe enquanto ele aparece.
    raiz.style.overflow = 'hidden'
    seguranca = window.setTimeout(terminar, ENTRADA.duracao + 2000)
    if (!movimentoReduzido.matches) {
      entrar()
      return
    }
    // Com o movimento reduzido, só o fade: o véu, que no topo já não cobre nada, vem da tela preta
    // até sumir (esta animação, mais nova, vale por cima da que o prende à rolagem enquanto dura).
    pular()
    for (const ouvinte of voltas) ouvinte({ inicio: document.timeline.currentTime as number, duracao: FADE, soFade: true })
    veu.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE, easing: DESACELERANDO }).finished.then(terminar, terminar)
  }

  function aoRolar() {
    const s = window.scrollY
    // sem ScrollTimeline, o véu anda daqui
    relogio.acertar(s)
    marcarAbsorvidos(s)
    if (voltando || !trecho || s <= trecho.inicio) return
    if (s >= raiz.scrollHeight - window.innerHeight - MARGEM) voltar()
  }

  const aoRedimensionar = new ResizeObserver(medir)
  aoRedimensionar.observe(document.body)
  aoRedimensionar.observe(espaco)
  // a altura da tela muda sem mudar o tamanho da página (a barra do navegador no celular)
  window.addEventListener('resize', medir)
  window.addEventListener('scroll', aoRolar, { passive: true })
  movimentoReduzido.addEventListener('change', ajustarPuxados)
  quedas.add(ajustarPuxados)
  medir()
  // a página pode ter aberto já no fim (o navegador devolve a rolagem de antes)
  aoRolar()

  return () => {
    window.removeEventListener('resize', medir)
    window.removeEventListener('scroll', aoRolar)
    movimentoReduzido.removeEventListener('change', ajustarPuxados)
    quedas.delete(ajustarPuxados)
    aoRedimensionar.disconnect()
    if (escurecer) relogio.soltar(escurecer)
    if (puxar) relogio.soltar(puxar)
    for (const animacao of puxados.values()) relogio.soltar(animacao)
    puxados.clear()
    for (const elemento of flutuantes()) elemento.removeAttribute('data-absorvido')
    veu.remove()
    terminar()
    trecho = null
    for (const ouvinte of medidos) ouvinte()
  }
}
