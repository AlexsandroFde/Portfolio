// O mergulho: a página não acaba no rodapé. A rolagem continua por um espaço vazio: primeiro uma
// tela, até não sobrar nada da página à vista; depois, no trecho do mergulho, o buraco negro desce
// até o meio da tela e cresce até a sombra dele preencher a tela inteira. Aí estamos dentro dele: a
// página volta ao topo, e no escuro abre-se uma janela redonda, por onde aparece o site, pequeno e
// distante, que vem chegando até ocupar a tela. Dentro do buraco negro está o topo do site, e a
// rolagem recomeça: um laço sem fim.
//
// Como a absorção, o mergulho depende só da posição da rolagem: rolando devagar ou rápido, cada
// posição mostra a mesma imagem, e rolando para cima ele volta atrás. O buraco negro lê em
// progressoDoMergulho o quanto já se mergulhou (veja cena, em index.ts); o preto do fim é um véu
// por cima de tudo, preso à rolagem, que cobre também o cabeçalho e o que sobrar do disco. Só a
// volta ao topo anda no tempo: lá dentro, no topo, não há mais para onde rolar.
//
// A janela é um furo no véu, e não um desenho do buraco negro: assim ela não pesa no desenho dele
// (cada instrução a mais no shader custa em todos os pixels, o tempo todo), e a volta funciona até
// sem WebGL. Com o movimento reduzido, o topo só aparece com um fade.

import { criarRelogio } from './rolagem.ts'

/** Em que parte do mergulho (de 0 a 1) o véu preto começa a entrar e cobre a tela toda. */
const VEU = { de: 0.8, ate: 0.96 }
/**
 * A entrada no buraco negro (ms), e de que tamanho o site aparece lá dentro, no escuro (fração do
 * tamanho normal): bem pequeno, muito distante.
 */
const ENTRADA = { duracao: 2000, deLonge: 0.05 }
/** Em quantos passos a entrada é descrita para o navegador (entre eles, em linha reta). */
const PASSOS_DA_ENTRADA = 16
/**
 * A janela: aparece aos poucos, na primeira fração `abre` da entrada, e envolve sempre a tela do
 * site, com `folga` de margem (em meias diagonais da tela dele). A borda brilha como o anel de luz
 * em volta da sombra, e a luz se espalha `brilho` px no escuro.
 */
const JANELA = { abre: 0.12, folga: 1.1, brilho: 18 }
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

let trecho: Trecho | null = null
const ouvintes = new Set<() => void>()

/** Quanto já se mergulhou com a página rolada até `s`: 0 até o começo do trecho, 1 no fim dele. */
export function progressoDoMergulho(s: number): number {
  if (!trecho) return 0
  return Math.min(1, Math.max(0, (s - trecho.inicio) / (trecho.fim - trecho.inicio)))
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
 * O tamanho do site lá dentro (fração do normal), com a entrada em `u` (de 0 a 1): ele vem de muito
 * longe, crescendo devagar no começo, depressa no meio e assentando no fim, como quem se aproxima.
 * Medido em escala logarítmica: cada dobra de tamanho conta igual, perto ou longe.
 */
function escalaLaDentro(u: number): number {
  const t = Math.min(1, Math.max(0, u))
  return ENTRADA.deLonge ** (1 - t * t * (3 - 2 * t))
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

  let voltando = false
  let seguranca = 0

  function medir() {
    const inicio = espaco.getBoundingClientRect().top + window.scrollY
    const fim = Math.max(inicio + 1, raiz.scrollHeight - window.innerHeight)
    trecho = { inicio, fim }
    const de = inicio + (fim - inicio) * VEU.de
    const ate = inicio + (fim - inicio) * VEU.ate
    if (escurecer) relogio.mover(escurecer, de, ate)
    else escurecer = relogio.animar(efeito, de, ate)
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
   * Dentro do buraco negro, com a tela toda preta: no meio do véu abre-se a janela, e por ela
   * aparece o site, lá dentro, vindo de longe. O cabeçalho e o conteúdo crescem a partir do meio da
   * tela, de muito pequenos até o tamanho normal (veja escalaLaDentro), e a janela cresce junto,
   * sempre em volta deles, até sair da tela. O buraco negro já voltou ao canto, atrás do site, e
   * aparece pela janela quando ela chega lá.
   */
  function entrar() {
    pular()
    const meiaDiagonal = Math.hypot(window.innerWidth / 2, window.innerHeight / 2)
    const passos = Array.from({ length: PASSOS_DA_ENTRADA + 1 }, (_, i) => i / PASSOS_DA_ENTRADA)
    const escalas = passos.map((u) => ({ offset: u, transform: `scale(${escalaLaDentro(u)})` }))
    for (const parte of [cabecalho, principal]) {
      if (!parte) continue
      // com a página no topo, as duas começam no canto de cima da tela: o meio dela, nas medidas delas
      parte.style.transformOrigin = `${window.innerWidth / 2}px ${window.innerHeight / 2}px`
      // lá dentro aparece só a primeira tela do site, e não o resto da página, abaixo dela
      if (parte === principal) parte.style.clipPath = `inset(0 0 calc(100% - ${window.innerHeight}px) 0)`
      const limpar = () => {
        parte.style.removeProperty('transform-origin')
        parte.style.removeProperty('clip-path')
      }
      parte.animate(escalas, { duration: ENTRADA.duracao, easing: 'linear' }).finished.then(limpar, limpar)
    }

    // O véu fica preto (por cima da animação que o prende à rolagem, que no topo o apaga), com o
    // furo da janela e a borda dela brilhando.
    const borda = 'color-mix(in srgb, var(--accent), white 65%)'
    const brilho = 'color-mix(in srgb, var(--accent) 30%, transparent)'
    const furo = 'radial-gradient(circle at 50% 50%, transparent calc(var(--janela) - 1px), #000 var(--janela))'
    veu.style.maskImage = furo
    veu.style.webkitMaskImage = furo
    veu.style.backgroundImage = `radial-gradient(circle at 50% 50%, transparent calc(var(--janela) - 1px), ${borda} var(--janela), ${brilho} calc(var(--janela) + 2px), transparent calc(var(--janela) + ${JANELA.brilho}px))`
    const raios = passos.map((u) => {
      const abertura = Math.min(1, u / JANELA.abre)
      const raio = escalaLaDentro(u) * meiaDiagonal * JANELA.folga * abertura * abertura * (3 - 2 * abertura)
      return { offset: u, opacity: 1, '--janela': `${raio}px` }
    })
    const limparVeu = () => {
      veu.style.removeProperty('mask-image')
      veu.style.removeProperty('-webkit-mask-image')
      veu.style.removeProperty('background-image')
      terminar()
    }
    veu.animate(raios, { duration: ENTRADA.duracao, easing: 'linear' }).finished.then(limparVeu, limparVeu)
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
    veu.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE, easing: DESACELERANDO }).finished.then(terminar, terminar)
  }

  function aoRolar() {
    const s = window.scrollY
    // sem ScrollTimeline, o véu anda daqui
    relogio.acertar(s)
    if (voltando || !trecho || s <= trecho.inicio) return
    if (s >= raiz.scrollHeight - window.innerHeight - MARGEM) voltar()
  }

  const aoRedimensionar = new ResizeObserver(medir)
  aoRedimensionar.observe(document.body)
  aoRedimensionar.observe(espaco)
  // a altura da tela muda sem mudar o tamanho da página (a barra do navegador no celular)
  window.addEventListener('resize', medir)
  window.addEventListener('scroll', aoRolar, { passive: true })
  medir()
  // a página pode ter aberto já no fim (o navegador devolve a rolagem de antes)
  aoRolar()

  return () => {
    window.removeEventListener('resize', medir)
    window.removeEventListener('scroll', aoRolar)
    aoRedimensionar.disconnect()
    if (escurecer) relogio.soltar(escurecer)
    veu.remove()
    terminar()
    trecho = null
  }
}
