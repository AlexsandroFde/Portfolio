// A entrada: depois do mergulho, com a tela toda preta, estamos dentro do buraco negro. A página volta
// ao topo e o site vem lá do fundo, por um túnel de luz, até chegar. Esta curva, que diz de que
// tamanho o site está, quanto o túnel em volta dele ainda torce e o tamanho da janela, serve às duas
// pontas: às animações do cabeçalho e do conteúdo (mergulho.ts), que o navegador roda, e ao motor
// (motor.ts), que desenha o túnel e a janela em volta deles. As duas leem os mesmos pontos e vão em
// linha reta entre eles, e começam no mesmo instante: andam juntas, quadro a quadro, sem que nenhuma
// espere a outra.
//
// Nada aqui toca na página: o mesmo código roda na thread principal e no worker do motor.

/**
 * A entrada: quanto dura (ms); de que tamanho o site aparece lá no fundo (fração do normal); quanto
 * os riscos do túnel vêm torcidos (rad), desenrolando no caminho, como quem sai de um redemoinho; e a
 * margem da janela em volta do site (em meias diagonais da tela dele).
 *
 * O site só cresce, sem girar: girado, o recorte que o limita à primeira tela deixava de ser um
 * retângulo alinhado à tela, e o navegador travava uns dois décimos de segundo na primeira vez. Nem
 * aparece aos poucos: a janela já nasce em volta dele, lá no fundo, e o ponto de luz que se acende no
 * escuro a esconde enquanto ela é pequena (uma opacidade animada no conteúdo inteiro também pesava).
 */
export const ENTRADA = { duracao: 2400, deLonge: 0.04, torcao: -0.9, folga: 1.1 }
/** Em quantos pontos a curva é descrita (entre eles, em linha reta). */
const PASSOS = 48

/** O site na entrada: o tamanho (fração do normal), a torção do túnel (rad) e o raio da janela (em meias diagonais). */
export interface PontoDaEntrada {
  escala: number
  torcao: number
  janela: number
}

const suave = (de: number, ate: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - de) / (ate - de)))
  return t * t * (3 - 2 * t)
}

/**
 * O site com a entrada em `u` (de 0 a 1). Ele vem de muito longe, crescendo devagar no começo, depressa
 * no meio e assentando no fim, como quem se aproxima (medido em escala logarítmica: cada dobra de
 * tamanho conta igual, perto ou longe), e o túnel termina de desenrolar um pouco antes de ele chegar.
 */
function exato(u: number): PontoDaEntrada {
  const escala = ENTRADA.deLonge ** (1 - suave(0, 1, u))
  return { escala, torcao: ENTRADA.torcao * (1 - suave(0, 0.85, u)) ** 2, janela: escala * ENTRADA.folga }
}

const PONTOS = Array.from({ length: PASSOS + 1 }, (_, i) => exato(i / PASSOS))

/** Os pontos da curva, com a fração da entrada em que cada um vale (para os quadros-chave da página). */
export function pontosDaEntrada(): (PontoDaEntrada & { u: number })[] {
  return PONTOS.map((ponto, i) => ({ u: i / PASSOS, ...ponto }))
}

/** O site com a entrada em `u`, entre os pontos da curva em linha reta, como o navegador os anima. */
export function curvaDaEntrada(u: number): PontoDaEntrada {
  const v = Math.min(1, Math.max(0, u)) * PASSOS
  const i = Math.min(PASSOS - 1, Math.floor(v))
  const f = v - i
  const a = PONTOS[i]
  const b = PONTOS[i + 1]
  const em = (k: keyof PontoDaEntrada) => a[k] + (b[k] - a[k]) * f
  return { escala: em('escala'), torcao: em('torcao'), janela: em('janela') }
}
