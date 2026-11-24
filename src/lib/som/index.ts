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

let estado: EstadoDoSom = 'desligado'
let comecou = false
const ouvintes = new Set<() => void>()
let contexto: AudioContext | null = null
let modulo: Promise<typeof import('./regente.ts')> | null = null
let regente: Regente | null = null
/** O buraco negro anda com a rolagem (veja definirBuracoNegroAnimado). */
let animado = false

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
  try {
    return new Contexto({ latencyHint: 'interactive' })
  } catch {
    return null
  }
}

/**
 * O som liga. Chamado num gesto (o clique no botão, o primeiro clique ou tecla na página), que é
 * quando o navegador deixa o áudio começar: o contexto é criado e retomado ali mesmo, e os sons
 * chegam quando o regente termina de baixar. `x`: onde fica o botão que o ligou (px CSS).
 */
function tocar(x?: number) {
  const ctx = (contexto ??= novoContexto())
  if (!ctx) return
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
    if (estado === 'tocando') regente.ligar(x)
  })
}

function calar() {
  mudar('desligado')
  guardar(false)
  regente?.desligar()
  const ctx = contexto
  // depois de o som sumir, o contexto para (e não gasta nada)
  window.setTimeout(() => {
    if (estado !== 'tocando') void ctx?.suspend()
  }, 500)
}

/** Um gesto na página: com a escolha de som ligado, ele começa (o botão cuida do clique nele mesmo). */
function aoGesto(evento: Event) {
  if (evento.target instanceof Element && evento.target.closest('[data-som]')) return
  if (estado === 'esperando') tocar()
  // o sistema pode ter pausado o áudio (no iPhone, ao voltar para a aba)
  else if (estado === 'tocando' && contexto?.state === 'suspended' && !document.hidden) void contexto.resume()
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
  // com a aba escondida, o áudio para
  document.addEventListener('visibilitychange', () => {
    if (!contexto) return
    if (document.hidden) void contexto.suspend()
    else if (estado === 'tocando') void contexto.resume()
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
