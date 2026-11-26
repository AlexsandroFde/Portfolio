// O passo da rolagem suave: a conta que leva a página até o destino com a aceleração e a velocidade
// limitadas. A roda não move a página na hora, muda o destino dela, e a página anda até lá: arranca,
// freia e chega aos poucos, por mais forte que seja o giro. É a mesma conta na página do site (veja
// rolagemSuave.ts, que cuida também do dedo e dos links) e na página de um projeto (veja
// components/project/rolagemDaPagina.ts): as duas rolam do mesmo jeito. Fica à parte, sem nada do
// efeito, para a página do projeto usá-la sem baixá-lo.

/**
 * A maior aceleração da página (em telas por segundo, a cada segundo): ela arranca, freia e muda de
 * sentido no máximo neste ritmo.
 */
export const ACELERACAO = 6
/** A maior velocidade da página (telas por segundo). */
export const VELOCIDADE = 3
/**
 * A maior velocidade indo a um link (telas por segundo): com a da roda, voltar ao topo do fim da
 * página levava uns 4 s. A aceleração é a mesma.
 */
export const VELOCIDADE_DO_LINK = 8
/**
 * A frenagem para chegar ao destino usa só esta fração da aceleração máxima: com ela toda, os passos
 * de um quadro ficavam para trás da curva de frenagem, e a página chegava ainda rápida e parava de vez.
 */
export const FREIO = 0.75
/**
 * Em quanto tempo (s), mais ou menos, a página alcança o destino sem pressa: o de um tranco da roda,
 * o de um link e o do embalo do dedo, que vai adiante a velocidade com que ele sai da tela vezes
 * este tempo (e perde velocidade aos poucos, como o embalo do navegador).
 */
export const CHEGADA = { roda: 0.12, link: 0.15, embalo: 0.4 }
/** O maior intervalo (s) que um quadro conta: num quadro mais lento, a página anda menos. */
export const PASSO_MAXIMO = 0.05
/** A altura de uma linha (px), para a roda que conta em linhas (a do Firefox). */
const LINHA = 100 / 6

/** A página andando: onde está e aonde vai (px), e com que velocidade (px/s; para baixo é positivo). */
export interface Movimento {
  atual: number
  destino: number
  velocidade: number
  /** Em quanto tempo ela alcança o destino (veja CHEGADA). */
  chegada: number
  /** A maior velocidade dela (telas por segundo): a da roda ou a de um link. */
  velocidadeMaxima: number
}

/** Quanto (px) um evento da roda pede: em pixels, em linhas (veja LINHA) ou em telas de `tela` px. */
export const pxDaRoda = (evento: WheelEvent, tela: number) =>
  evento.deltaY * (evento.deltaMode === 1 ? LINHA : evento.deltaMode === 2 ? tela : 1)

/**
 * Um passo de `dt` s rumo ao destino, numa tela de `tela` px: a velocidade que leva ao destino no
 * tempo de chegada, mas não mais que a máxima nem que a velocidade da qual ainda dá para frear até
 * lá (veja FREIO), e mudando no máximo a aceleração.
 */
export function andar(movimento: Movimento, dt: number, tela: number) {
  const falta = movimento.destino - movimento.atual
  const aceleracao = ACELERACAO * tela
  const desejada =
    Math.sign(falta) *
    Math.min(Math.abs(falta) / movimento.chegada, movimento.velocidadeMaxima * tela, Math.sqrt(2 * FREIO * aceleracao * Math.abs(falta)))
  const mudanca = aceleracao * dt
  movimento.velocidade += Math.min(mudanca, Math.max(-mudanca, desejada - movimento.velocidade))
  movimento.atual += movimento.velocidade * dt
  // Chegou: passou do ponto no último passo, ou falta menos de um pixel (perto do destino, a
  // velocidade cai devagar, e o último pixel levava mais de um segundo).
  if ((falta >= 0 ? movimento.atual >= movimento.destino : movimento.atual <= movimento.destino) || Math.abs(movimento.destino - movimento.atual) < 1) {
    movimento.atual = movimento.destino
    movimento.velocidade = 0
  }
}
