// O regente: acompanha a página e conduz os sons (sintese.ts). Da rolagem e do trecho do mergulho
// (veja mergulho.ts) ele tira o estado do fundo: quanto da página já se leu (por onde a música vai),
// quanto o buraco negro já se aproximou, em que parte do mergulho se está e quão rápido a página anda. Os efeitos vêm dos eventos: a volta ao topo, a
// troca de tema, o mouse passando por links e botões e, pela página (veja index.ts), as ondas dos
// cliques e se o buraco negro anda com a rolagem.
//
// O som não pesa na página: o áudio é feito numa thread própria do navegador, e daqui só saem alvos
// para ele seguir, uma vez por quadro e só enquanto a rolagem anda. Quem cria o contexto de áudio (e
// o suspende com a aba escondida) é index.ts.

import { quandoEntrar, quandoVoltar, trechoDoMergulho } from '../buracoNegro/mergulho.ts'
import { criarSons, type Estado } from './sintese.ts'

/** Quantas telas por segundo de rolagem soam inteiras (a sucção, os jatos e o ar da queda). */
const RAPIDEZ = 2
/** O que conta como link ou botão para o tique do mouse. */
const INTERATIVOS = 'a[href], button:not(:disabled), summary, [role="button"], input:not(:disabled), select, textarea, label[for]'
/** O menor intervalo (ms) entre dois tiques: passando rápido por uma lista, eles não se amontoam. */
const ENTRE_TOQUES = 70
/** De quanto em quanto tempo (ms) as próximas trocas de acorde do coro são agendadas (veja reger, em sintese.ts). */
const REGER = 500
/**
 * O volume que o botão do som mostra (veja nivel): em que nível (dB) a onda dele começa a se abrir e
 * em que nível fica aberta de todo. O fundo vai de uns -35 dB, no topo, a uns -27, no fim do
 * conteúdo; o mergulho e o chirp passam disso.
 */
const NIVEL = { de: -44, ate: -22 }

export interface Regente {
  /** O som liga. Com `x` (px CSS), ele foi ligado pelo botão ali, e a onda do clique soa já. */
  ligar(x?: number): void
  desligar(): void
  /** Uma onda saiu de um clique em `x` (px CSS) (veja soltarOnda, em lib/buracoNegro/index.ts). */
  onda(x: number): void
  /** O buraco negro passou a andar com a rolagem, ou a ficar parado no alto da página. */
  animar(animado: boolean): void
  /** Quanto soa agora, de 0 (silêncio) a 1, para o botão do som desenhar a onda. */
  nivel(): number
}

const limitar = (v: number, de = 0, ate = 1) => Math.min(ate, Math.max(de, v))

const suave = (de: number, ate: number, v: number) => {
  const t = limitar((v - de) / (ate - de))
  return t * t * (3 - 2 * t)
}

/** Liga os sons a `ctx` e à página. `animado`: se o buraco negro já anda com a rolagem. */
export function criarRegente(ctx: AudioContext, animado: boolean): Regente {
  // no celular, ou num aparelho com poucos núcleos, o coro fica mais leve (veja criarSons)
  const leve = (navigator.hardwareConcurrency ?? 8) <= 4 || window.matchMedia('(pointer: coarse)').matches
  // Tudo passa por um medidor a caminho da saída (ele deixa o som como está): é de onde o botão tira
  // o volume. Ele só faz conta quando o botão pergunta.
  const medidor = ctx.createAnalyser()
  medidor.fftSize = 1024
  medidor.connect(ctx.destination)
  const amostras = new Float32Array(medidor.fftSize)
  const sons = criarSons(ctx, medidor, leve)
  const raiz = document.documentElement
  let ativo = false
  /** Até quando (ms, no relógio da página) a volta ao topo toca: lá dentro, o clique não faz onda. */
  let voltaAte = -Infinity
  /** O relógio da harmonia: agenda as próximas trocas de acorde enquanto o som toca. */
  let regencia = 0

  // a rolagem (px CSS) e a velocidade dela (px/s, para baixo é positiva, suavizada)
  let pedido = 0
  let anterior = 0
  let rolagemAnterior = window.scrollY
  let velocidade = 0
  /** Em que parte do mergulho a página estava no último quadro (veja estado). */
  let mergulho = 0

  function estado(): Estado {
    const s = window.scrollY
    const altura = window.innerHeight || 1
    const trecho = trechoDoMergulho()
    // o fim do conteúdo, onde o mergulho começa (sem ele no ar, o fim da página)
    const fim = trecho?.inicio ?? Math.max(1, raiz.scrollHeight - altura)
    mergulho = trecho ? limitar((s - trecho.inicio) / Math.max(1, trecho.fim - trecho.inicio)) : 0
    // a música vai com a leitura, ande o buraco negro ou não; o buraco negro só se aproxima se anda
    const progresso = limitar(s / fim)
    const perto = animado ? progresso : 0
    const rapidez = limitar(Math.abs(velocidade) / (RAPIDEZ * altura))
    // Só há o que absorver com o conteúdo passando pela faixa: no topo, o puxão ainda cresce (veja
    // rolagemPlena, em lib/buracoNegro/index.ts), e no fim o conteúdo já saiu da tela.
    const absorvendo = animado ? suave(0, 0.25 * altura, s) * (1 - suave(fim - 0.15 * altura, fim, s)) : 0
    return {
      animado,
      perto,
      progresso,
      mergulho,
      rapidez,
      descendo: velocidade > 0 ? rapidez * absorvendo : 0,
      subindo: velocidade < 0 ? rapidez * absorvendo : 0,
      // o buraco negro anda do canto de cima à direita até o meio, ao longo da página
      lado: 0.5 * (1 - perto),
    }
  }

  function quadro(agora: number) {
    pedido = 0
    if (!ativo) return
    const dt = anterior ? Math.min(0.1, (agora - anterior) / 1000) : 0
    anterior = agora
    const s = window.scrollY
    if (dt > 0) velocidade += ((s - rolagemAnterior) / dt - velocidade) * (1 - Math.exp(-dt / 0.1))
    rolagemAnterior = s
    // enquanto a rolagem anda, e até o som dela assentar, um quadro a cada atualização da tela
    if (Math.abs(velocidade) > 4) pedido = requestAnimationFrame(quadro)
    else {
      velocidade = 0
      anterior = 0
    }
    sons.ajustar(estado())
  }

  const acompanhar = () => {
    if (ativo && !pedido) pedido = requestAnimationFrame(quadro)
  }
  window.addEventListener('scroll', acompanhar, { passive: true })
  window.addEventListener('resize', acompanhar, { passive: true })

  // A volta ao topo, no fim do mergulho, não é o leitor rolando para cima: sem jatos.
  quandoVoltar(() => {
    rolagemAnterior = window.scrollY
    velocidade = 0
    acompanhar()
  })
  quandoEntrar(({ inicio, duracao, soFade }) => {
    voltaAte = inicio + duracao
    if (ativo) sons.voltar(tempoDoAudio(inicio), duracao / 1000, soFade)
  })

  /** O instante `ms` do relógio da página no relógio do áudio, já contando o atraso da saída de som. */
  function tempoDoAudio(ms: number): number {
    const saida = ctx.getOutputTimestamp?.()
    if (saida?.contextTime !== undefined && saida.performanceTime) {
      return Math.max(ctx.currentTime, saida.contextTime + (ms - saida.performanceTime) / 1000)
    }
    return Math.max(ctx.currentTime, ctx.currentTime + (ms - performance.now()) / 1000)
  }

  /** De que lado da tela (de -1 a 1) vem um som em `x` (px CSS). */
  const ladoDe = (x: number) => limitar((x / (window.innerWidth || 1)) * 2 - 1, -1, 1) * 0.7

  // O tique do mouse, ao entrar num link ou num botão (e não a cada filho dele que ele cruza), e só
  // se o mouse se mexeu: rolando, o conteúdo passa por baixo dele parado, e o navegador também avisa
  // que ele entrou nos links que chegam, mas com o ponteiro onde já estava.
  let sobre: Element | null = null
  let ultimoToque = -Infinity
  let ponteiroX = Number.NaN
  let ponteiroY = Number.NaN
  document.addEventListener(
    'pointermove',
    (evento) => {
      ponteiroX = evento.clientX
      ponteiroY = evento.clientY
    },
    { passive: true },
  )
  document.addEventListener(
    'pointerover',
    (evento) => {
      if (evento.pointerType !== 'mouse') return
      const mexeu = evento.clientX !== ponteiroX || evento.clientY !== ponteiroY
      ponteiroX = evento.clientX
      ponteiroY = evento.clientY
      const alvo = evento.target instanceof Element ? evento.target.closest(INTERATIVOS) : null
      if (alvo === sobre) return
      sobre = alvo
      if (!ativo || !alvo || !mexeu || evento.timeStamp - ultimoToque < ENTRE_TOQUES) return
      ultimoToque = evento.timeStamp
      sons.toque()
    },
    { passive: true },
  )

  // A troca de tema (a classe da raiz, veja lib/theme.ts).
  let escuro = raiz.classList.contains('dark')
  new MutationObserver(() => {
    const agoraEscuro = raiz.classList.contains('dark')
    if (agoraEscuro === escuro) return
    escuro = agoraEscuro
    if (ativo) sons.tema(escuro)
  }).observe(raiz, { attributes: true, attributeFilter: ['class'] })

  return {
    ligar(x) {
      ativo = true
      rolagemAnterior = window.scrollY
      velocidade = 0
      sons.ajustar(estado())
      sons.reger()
      window.clearInterval(regencia)
      regencia = window.setInterval(() => sons.reger(), REGER)
      sons.ligar(x === undefined ? undefined : ladoDe(x))
    },

    desligar() {
      ativo = false
      cancelAnimationFrame(pedido)
      pedido = 0
      anterior = 0
      window.clearInterval(regencia)
      sons.desligar()
    },

    onda(x) {
      // a onda some no começo do mergulho (veja MASSA_NO_MERGULHO, em motor.ts), e na volta não há
      const forca = 1 - suave(0, 0.2, mergulho)
      if (!ativo || forca <= 0 || performance.now() < voltaAte) return
      sons.onda(ladoDe(x), forca)
    },

    animar(sim) {
      animado = sim
      if (ativo) sons.ajustar(estado())
    },

    nivel() {
      // o volume dos últimos ~20 ms (a média do quadrado das amostras), de NIVEL.de a NIVEL.ate dB
      medidor.getFloatTimeDomainData(amostras)
      let soma = 0
      for (const amostra of amostras) soma += amostra * amostra
      const db = 10 * Math.log10(soma / amostras.length + 1e-12)
      return limitar((db - NIVEL.de) / (NIVEL.ate - NIVEL.de))
    },
  }
}
