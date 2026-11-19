// A faixa do alto da tela em que o conteúdo é absorvido (veja absorcao.ts), e as contas dela que a
// página e o motor (veja motor.ts) fazem igual: quanto o puxão já vale em cada ponto da página e
// quanto o conteúdo absorvido ainda aparece em cada altura da tela. A absorção leva o conteúdo ao
// buraco negro com elas, e o motor, com elas, o apaga pelo caminho (veja desenharTampa).

import { suave } from './trajeto.ts'

/**
 * A faixa da tela em que o conteúdo é absorvido: ele começa a ser puxado quando sobe até `inicio`
 * e chega ao buraco negro em `frente`. Acima de `frente` só fica o buraco negro. As duas ficam em
 * pixels inteiros da tela.
 */
export interface Faixa {
  frente: number
  inicio: number
}

/**
 * Como a linha anda até o buraco negro: a fração do caminho é o progresso elevado a isto. Começa
 * devagar (na borda da faixa o conteúdo continua junto do que ficou no lugar) e acelera, como
 * quem cai.
 */
export const ACELERACAO = 2

/**
 * O conteúdo some ao entrar na sombra do buraco negro: some de todo a até um raio do centro e
 * aparece inteiro a partir de HORIZONTE raios (mais um pixel), um fio de transição sobre o anel de
 * luz. Pouco mais que o raio: o que ainda está no lugar, logo abaixo da faixa, nunca chega tão perto.
 */
export const HORIZONTE = 1.06

/** Em quantos pontos da faixa o esmaecimento é medido (entre eles, ele vai em linha reta). */
const PARADAS = 12

/**
 * A força do puxão com a página rolada até `s`: de 0 no topo da página (nada é puxado, e a
 * apresentação aparece inteira) a 1, a partir da rolagem `plena`.
 */
export const forcaEm = (plena: number, s: number) => suave(0, plena, s)

/**
 * O esmaecimento ao longo da distorção: o quanto o conteúdo absorvido ainda aparece em cada altura
 * da tela (px CSS), de 1 (inteiro) a 0. Cada linha fica tão apagada quanto já se estreitou a caminho
 * do buraco negro (veja linhaEm, em absorcao.ts): inteira na borda de baixo da faixa e sumindo perto
 * do centro dele. Basta a altura: a de cada linha na tela diz o quanto ela já foi puxada, qualquer
 * que seja o bloco. `queda` é quanto a linha que chega ao fim da faixa desce (até a altura do buraco
 * negro), e `forca`, o quanto o puxão já vale.
 *
 * Devolve os pontos [altura, quanto aparece], de cima para baixo, com as alturas nunca voltando para
 * trás (como as paradas de um gradiente). Acima do primeiro ponto vale o dele.
 */
export function esmaecimento({ frente, inicio }: Faixa, queda: number, forca: number): [number, number][] {
  const banda = Math.max(1, inicio - frente)
  const pontos: [number, number][] = []
  let anterior = Number.NEGATIVE_INFINITY
  for (let i = PARADAS; i >= 0; i--) {
    const t = i / PARADAS
    const q = forca * t
    const y = Math.max(anterior, inicio - t * banda + q * q * queda)
    anterior = y
    pontos.push([y, 1 - q ** ACELERACAO])
  }
  return pontos
}
