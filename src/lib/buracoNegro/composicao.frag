#version 300 es
// O desenho da tela, fora do mergulho e da entrada: a cena (cena.glsl) em cada pixel, como ela é.
// No mergulho, este mesmo desenho vai para uma textura um pouco maior que a tela (com uMargem px CSS
// a mais de cada lado), que a queda (queda.frag) distorce: o que ela traz de perto da beira já está
// desenhado.
precision highp float;
precision highp sampler2D;

#include "comum"
#include "cena"

uniform vec2 uMargem;       // quanto o desenho passa da tela de cada lado (px CSS)

out vec4 corFinal;

void main() {
  vec2 escala = uResolucao / (uTamanho + 2.0 * uMargem);
  vec2 p = vec2(gl_FragCoord.x, uResolucao.y - gl_FragCoord.y) / escala - uMargem;
  corFinal = finalizar(cena(p, escala.x));
}
