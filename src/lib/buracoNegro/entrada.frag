#version 300 es
// A entrada (veja entrada.ts), dentro do buraco negro: a página já voltou ao topo, e o site vem lá do
// fundo, pequeno, crescendo até chegar. Daqui sai a imagem da entrada, numa textura, que a vista de
// quem cai (queda.frag) leva à tela, com os rastros, a poeira e as cores separadas da queda: dentro
// da janela redonda, o site (a foto do topo dele, veja fotos.ts, sobre a cena: o buraco negro de
// volta ao canto e a malha), do tamanho em que ele está; fora dela, o escuro de dentro do buraco
// negro, com a luz que sai da janela, e a borda da janela brilhando como o anel de luz em volta da
// sombra. No começo, um ponto de luz se acende no meio do escuro.
//
// O site vem arredondado, como pintado numa bola: o meio dele ampliado e as beiras apertadas contra a
// borda da janela (a projeção de uma esfera vista de frente). Ao chegar, a bola se achata, e no fim a
// imagem é a página como ela é, pixel por pixel: quem estiver por cima (a página de verdade) aparece
// no lugar dela sem salto. Sem a foto (a página traz o site com as próprias animações, por cima
// desta imagem), a cena fica plana, para ficar alinhada com ele.
precision highp float;
precision highp sampler2D;

#include "comum"
#include "cena"

uniform vec2 uMargem;       // quanto a imagem passa da tela de cada lado (px CSS)
uniform float uEntrada;     // de 0 a 1: quanto a entrada já andou
uniform vec2 uVista;        // o meio da tela, em volta do qual o site cresce (px CSS)
uniform float uEscalaVista; // o tamanho do site agora (fração do normal)
uniform float uJanela;      // o raio da janela (px CSS)
uniform float uBojo;        // de 0 a 1: quanto o site vem arredondado
uniform sampler2D uFoto;    // a foto do topo do site, pré-multiplicada (sem ela, um pixel transparente)
uniform vec2 uTamanhoDaFoto; // a tela que a foto cobre (px CSS, a partir do canto de cima à esquerda)

out vec4 corFinal;

void main() {
  vec2 escala = uResolucao / (uTamanho + 2.0 * uMargem);
  vec2 q = vec2(gl_FragCoord.x, uResolucao.y - gl_FragCoord.y) / escala - uMargem;
  vec2 dq = q - uVista;
  float r = length(dq);
  float u = uEntrada;

  // Dentro da janela: o ponto da página que está aqui. Na bola, a fração `rho` do raio da janela em
  // que o pixel está é o seno do ângulo dele na esfera, e o ponto da página fica na fração do arco
  // (asin(rho) sobre um quarto de volta). Com a bola achatada, é a página plana, desfeito o tamanho
  // do site. Longe da janela não há página para ler, e a cena e a foto, que custam, ficam de fora: a
  // maior parte da entrada, a janela é pequena. (As linhas da malha e a leitura da foto em vários
  // tamanhos pedem que os vizinhos de cada pixel também as leiam; onde uns leem e outros não, a uns
  // pixels da borda, o que elas dariam já não é usado.)
  float px = 1.0 / escala.x;
  bool naJanela = r < uJanela + 6.0 * px;
  vec3 dentro = vec3(0.0);
  if (naJanela) {
    float rho = r / max(uJanela, 1e-3);
    float arco = asin(min(rho, 1.0)) * (4.0 / TAU);
    float plano = rho < 1.0 ? mix(rho, arco, uBojo) : rho;
    vec2 p = uVista + dq * (plano / max(rho, 1e-6)) / uEscalaVista;
    vec4 pagina = cena(p, escala.x * uEscalaVista);
    vec2 uv = p / uTamanhoDaFoto;
    float naFoto = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    pagina = sobre(texture(uFoto, uv) * naFoto, pagina);
    dentro = pagina.rgb + (1.0 - pagina.a) * uFundo;
  }

  // Fora dela: o escuro, com a luz que sai da janela, espalhada em volta dela, e o ponto de luz que se
  // acende no começo. (Os rastros e a poeira vêm da vista de quem cai.)
  vec3 brilho = mix(uTinta, vec3(1.0), 0.55);
  float faisca = (1.0 - smoothstep(0.03, 0.14, u)) * smoothstep(0.0, 0.03, u);
  vec3 fora = mix(uTinta, vec3(1.0), 0.8) * exp(-r / (6.0 + 260.0 * u)) * 1.6 * faisca;
  fora += brilho * 0.35 * exp(-max(r - uJanela, 0.0) / 22.0) * smoothstep(0.0, 0.1, u);

  // A borda da janela: um fio de luz como o anel em volta da sombra, com as cores um pouco
  // separadas (o vermelho por fora, o azul por dentro), tremeluzindo de leve. (Longe dela, nada.)
  vec3 anel = vec3(0.0);
  if (abs(r - uJanela) < 6.0 * px + 4.0) {
    float tremula = 0.85 + 0.15 * sin(atan(dq.y, dq.x) * 7.0 + uTempo * 9.0);
    anel = vec3(
      sino(r - uJanela - 1.6 * px, 1.1 * px + 0.5),
      sino(r - uJanela, 1.1 * px + 0.5),
      sino(r - uJanela + 1.6 * px, 1.1 * px + 0.5)
    ) * mix(uTinta, vec3(1.0), 0.65) * 1.4 * tremula * smoothstep(0.0, 0.06, u);
  }

  vec3 cor = (naJanela ? mix(dentro, fora, smoothstep(uJanela - 0.6 * px, uJanela + 0.6 * px, r)) : fora) + anel;
  cor += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  corFinal = vec4(clamp(cor, 0.0, 1.0), 1.0);
}
