// A entrada: depois do mergulho, com a tela toda preta, estamos dentro do buraco negro. A página volta
// ao topo e o site vem lá do fundo, até chegar, na vista de quem ainda cai (a mesma da queda, veja
// queda.frag). Esta curva, que diz de que tamanho o site está e o tamanho da janela em volta dele,
// serve às duas pontas: às animações do cabeçalho e do conteúdo (mergulho.ts), quando é a página que
// traz o site, e ao motor (motor.ts), que desenha o túnel e a janela e, quando tem a foto do topo do
// site, o próprio site chegando. As duas leem os mesmos pontos e vão em linha reta entre eles, e
// começam no mesmo instante: andam juntas, quadro a quadro, sem que nenhuma espere a outra.
//
// Nada aqui toca na página: o mesmo código roda na thread principal e no worker do motor.

/**
 * A entrada: quanto dura (ms); de que tamanho o site aparece lá no fundo (fração do normal); e a
 * margem da janela em volta do site (em meias diagonais da tela dele).
 *
 * Quando é a página que traz o site, ele só cresce, sem girar: girado, o recorte que o limita à
 * primeira tela deixava de ser um retângulo alinhado à tela, e o navegador travava uns dois décimos
 * de segundo na primeira vez. Nem aparece aos poucos: a janela já nasce em volta dele, lá no fundo, e
 * o ponto de luz que se acende no escuro a esconde enquanto ela é pequena (uma opacidade animada no
 * conteúdo inteiro também pesava).
 */
export const ENTRADA = { duracao: 2400, deLonge: 0.04, folga: 1.1 }
/** Em quantos pontos a curva é descrita (entre eles, em linha reta). */
const PASSOS = 48

/** O site na entrada: o tamanho (fração do normal) e o raio da janela (em meias diagonais). */
export interface PontoDaEntrada {
  escala: number
  janela: number
}

/**
 * A vista de quem cai, na entrada (veja Vista, em renderizador.ts, e queda.frag), e quanto o site vem
 * arredondado (`bojo`, de 0 a 1).
 */
export interface VistaDaEntrada {
  bojo: number
  rastro: number
  separa: number
  viagem: number
  poeira: number
  azul: number
  tunel: number
}

const suave = (de: number, ate: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - de) / (ate - de)))
  return t * t * (3 - 2 * t)
}

/**
 * O site com a entrada em `u` (de 0 a 1). Ele vem de muito longe, crescendo devagar no começo, depressa
 * no meio e assentando no fim, como quem se aproxima (medido em escala logarítmica: cada dobra de
 * tamanho conta igual, perto ou longe).
 */
function exato(u: number): PontoDaEntrada {
  const escala = ENTRADA.deLonge ** (1 - suave(0, 1, u))
  return { escala, janela: escala * ENTRADA.folga }
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
  return { escala: em('escala'), janela: em('janela') }
}

/**
 * A vista com a entrada em `u`: a da queda, sem o redemoinho nem o tremor. Ainda se cai, agora na
 * direção do site, e o efeito acompanha a velocidade com que ele se aproxima (`perto`, de 0 a 1, o
 * ritmo da curva: parado no começo e no fim, mais rápido no meio): os rastros e o azul da luz que
 * vem dele. As cores não se separam nos rastros, como na queda (com elas, cada ponto do rastro pede
 * três leituras da imagem, e a entrada, com o site inteiro na tela, já pesa mais): ficam na borda
 * da janela, que já as tem. A poeira passa enquanto o site ainda está longe, e a visão se abre do
 * túnel conforme ele chega. O site vem arredondado, como numa bola, e se achata ao chegar: no fim a
 * vista é a página como ela é, pixel por pixel.
 */
export function vistaDaEntrada(u: number): VistaDaEntrada {
  const t = Math.min(1, Math.max(0, u))
  const perto = 4 * t * (1 - t)
  // no escuro do começo, os rastros acendem junto com o ponto de luz, e somem antes de o site chegar
  const acende = suave(0.02, 0.12, t)
  const assenta = 1 - suave(0.55, 0.88, t)
  return {
    bojo: 1 - suave(0.3, 0.92, t),
    rastro: 0.065 * perto * acende * assenta,
    separa: 0,
    viagem: 0.35 * t + 3 * suave(0, 1, t),
    poeira: suave(0.03, 0.15, t) * (1 - suave(0.45, 0.78, t)),
    azul: 0.6 * perto * acende,
    tunel: 0.55 * (1 - suave(0.35, 0.9, t)),
  }
}
