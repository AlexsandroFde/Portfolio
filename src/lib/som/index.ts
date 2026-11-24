// O som do site (veja sintese.ts): começa desligado e só toca para quem o liga, no botão do canto da
// tela (SoundToggle). A escolha fica guardada, e quem o deixou ligado o ouve de novo na próxima visita, a
// partir do primeiro clique ou da primeira tecla: antes disso, o navegador não deixa tocar nada.
//
// Este arquivo é pequeno e vai junto com a página. O resto (o regente e a síntese) só é baixado
// quando o som liga ou quando a escolha guardada é de som ligado.

import type { Regente } from './regente.ts'

/**
 * Desligado; esperando o primeiro clique ou tecla para tocar (a escolha guardada é de som ligado); ou
 * tocando. Esperando, o botão aparece como desligado: ele mostra o que se ouve.
 */
export type EstadoDoSom = 'desligado' | 'esperando' | 'tocando'

const CHAVE = 'som'
/** O que conta como um gesto que deixa o áudio tocar. */
const GESTOS = ['pointerdown', 'keydown', 'touchend'] as const
/**
 * A taxa de amostragem (Hz) em que o som é feito. A música é escura: gravada a 48 kHz, quase nada
 * dela passa de 11 kHz (uns 50 dB abaixo do resto). A 24 kHz, tudo até 12 kHz fica, pela metade das
 * contas (e o eco, a parte mais cara, por um quarto). O navegador passa para a taxa da placa na saída.
 */
const TAXA = 24000
/**
 * Quanto som o navegador prepara adiantado. Em 'interactive', uns 10 ms no Windows, e menos ainda no
 * Mac e no Android: qualquer atraso da thread do áudio (o aparelho ocupado, a página engasgada) vira
 * um buraco na saída, que se ouve como um estalo. Em 'playback', uns 20 ms: o que se ouve chega uns
 * 10 a 20 ms mais tarde, o que não se nota num tique ou numa onda.
 */
const LATENCIA: AudioContextLatencyCategory = 'playback'
/** Quanto tempo (ms) o som leva para sumir antes de o contexto parar: parar com som saindo estala. */
const SUMIR = 500

let estado: EstadoDoSom = 'desligado'
let comecou = false
const ouvintes = new Set<() => void>()
let contexto: AudioContext | null = null
let modulo: Promise<typeof import('./regente.ts')> | null = null
let regente: Regente | null = null
/** O buraco negro anda com a rolagem (veja definirBuracoNegroAnimado). */
let animado = false
/** A parada do contexto, depois de o som sumir (veja pararDepois). */
let parada = 0

function mudar(novo: EstadoDoSom) {
  if (novo === estado) return
  estado = novo
  for (const ouvinte of ouvintes) ouvinte()
}

function guardar(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? 'ligado' : 'desligado')
  } catch {
    // armazenamento indisponível (modo privado): a escolha vale só para esta visita
  }
}

const carregar = () => (modulo ??= import('./regente.ts'))

function novoContexto(): AudioContext | null {
  const Contexto = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Contexto) return null
  // (o navegador que não aceitar a taxa pedida fica com a dele: os sons servem a qualquer uma)
  for (const opcoes of [{ latencyHint: LATENCIA, sampleRate: TAXA }, { latencyHint: LATENCIA }]) {
    try {
      return new Contexto(opcoes)
    } catch {
      // tenta sem a taxa
    }
  }
  return null
}

/** Depois de o som sumir, o contexto para (e não gasta nada), se ainda for para parar. */
function pararDepois() {
  window.clearTimeout(parada)
  const ctx = contexto
  parada = window.setTimeout(() => {
    if (estado !== 'tocando' || document.hidden) void ctx?.suspend()
  }, SUMIR)
}

/**
 * O som liga. Chamado num gesto (o clique no botão, o primeiro clique ou tecla na página), que é
 * quando o navegador deixa o áudio começar: o contexto é criado e retomado ali mesmo, e os sons
 * chegam quando o regente termina de baixar. `x`: onde fica o botão que o ligou (px CSS).
 */
function tocar(x?: number) {
  const ctx = (contexto ??= novoContexto())
  if (!ctx) return
  window.clearTimeout(parada)
  // parado, o contexto volta do silêncio (veja ligar, em sintese.ts)
  const parado = ctx.state !== 'running'
  mudar('tocando')
  guardar(true)
  // (se o navegador ainda assim não deixar, o próximo gesto tenta de novo)
  void ctx.resume().then(
    () => {
      if (estado === 'tocando' && ctx.state !== 'running') mudar('esperando')
    },
    () => mudar('esperando'),
  )
  void carregar().then(({ criarRegente }) => {
    regente ??= criarRegente(ctx, animado)
    if (estado === 'tocando') regente.ligar(x, parado)
  })
}

function calar() {
  mudar('desligado')
  guardar(false)
  regente?.desligar()
  pararDepois()
}

/** O contexto volta a tocar, do silêncio (o que soava quando ele parou não volta de uma vez). */
function retomar() {
  if (!contexto) return
  window.clearTimeout(parada)
  regente?.ligar(undefined, contexto.state !== 'running')
  void contexto.resume()
}

/** Um gesto na página: com a escolha de som ligado, ele começa (o botão cuida do clique nele mesmo). */
function aoGesto(evento: Event) {
  if (evento.target instanceof Element && evento.target.closest('[data-som]')) return
  if (estado === 'esperando') tocar()
  // o sistema pode ter pausado o áudio (no iPhone, ao voltar para a aba)
  else if (estado === 'tocando' && contexto && contexto.state !== 'running' && !document.hidden) retomar()
}

function comecar() {
  if (comecou || typeof window === 'undefined') return
  comecou = true
  let ligado = false
  try {
    ligado = localStorage.getItem(CHAVE) === 'ligado'
  } catch {
    // sem armazenamento, o som começa desligado
  }
  for (const gesto of GESTOS) window.addEventListener(gesto, aoGesto, { capture: true, passive: true })
  // Com a aba escondida, o áudio para, depois de sumir; e volta do silêncio.
  document.addEventListener('visibilitychange', () => {
    if (!contexto) return
    if (!document.hidden) {
      if (estado === 'tocando') retomar()
      return
    }
    if (estado === 'tocando') regente?.desligar()
    pararDepois()
  })
  if (!ligado) return
  mudar('esperando')
  // já baixa o regente, para o primeiro clique já soar
  void carregar()
}

/** Para o React (useSyncExternalStore): chama `ouvinte` quando o estado do som muda. */
export function ouvirSom(ouvinte: () => void): () => void {
  comecar()
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export const estadoDoSom = (): EstadoDoSom => estado

/** Quanto soa agora, de 0 a 1, para o botão desenhar a onda: 0 com o som calado ou ainda chegando. */
export function nivelDoSom(): number {
  return estado === 'tocando' && regente ? regente.nivel() : 0
}

/** O botão do som: liga ou desliga. `x`: onde fica o botão (px CSS), de onde vem a onda do clique. */
export function alternarSom(x?: number) {
  if (estado === 'tocando') calar()
  else tocar(x)
}

/** Uma onda saiu de um clique em `x` (px CSS) (veja soltarOnda, em lib/buracoNegro/index.ts). */
export function tocarOnda(x: number) {
  if (estado === 'tocando') regente?.onda(x)
}

/**
 * O buraco negro anda com a rolagem (sim) ou está parado no alto da página, ou fora do ar (não): o
 * fundo cresce com ele, e a queda soa, só no primeiro caso.
 */
export function definirBuracoNegroAnimado(sim: boolean) {
  animado = sim
  regente?.animar(sim)
}
