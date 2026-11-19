#version 300 es
// A entrada (veja entrada.ts), dentro do buraco negro: a página já voltou ao topo, e o site vem lá do
// fundo, pequeno, crescendo até chegar. O cabeçalho e o conteúdo são animados pelo navegador; daqui,
// atrás deles, vem o resto: dentro da janela redonda em volta do site, o fundo da página e a cena (o
// buraco negro de volta ao canto, a malha), do mesmo tamanho que o site; fora dela, o túnel por onde
// se sai, escuro, com riscos de luz correndo para fora, em perspectiva, cada vez mais depressa,
// torcidos em hélice e desenrolando como quem sai de um redemoinho, e a borda da janela brilhando
// como o anel de luz em volta da sombra. No começo, um ponto de luz se acende no meio do escuro.
precision highp float;
precision highp sampler2D;

#include "comum"
#include "cena"

uniform float uEntrada;     // de 0 a 1: quanto a entrada já andou
uniform vec2 uVista;        // o meio da tela, em volta do qual o site cresce (px CSS)
uniform float uEscalaVista; // o tamanho do site agora (fração do normal)
uniform float uTorcao;      // quanto os riscos do túnel ainda torcem (rad)
uniform float uJanela;      // o raio da janela (px CSS)

out vec4 corFinal;

// Os riscos do túnel: uma camada de `n` riscos em volta do meio, cada um num ângulo, e para cada
// ponto da parede do túnel (a fundura z, para dentro da tela) se ele está num risco. A parede anda
// para trás (a viagem `viagem`), e em perspectiva os riscos de perto correm e se alongam.
float riscos(float angulo, float r, float z, float viagem, float n, float semente) {
  float faixa = (angulo / TAU + 0.5) * n;
  float qual = floor(faixa);
  float sorte = hash(vec2(qual, semente));
  // o risco fica num lugar sorteado dentro da sua faixa de ângulo, com um pixel e pouco de largura
  float lado = abs(fract(faixa) - (0.2 + 0.6 * sorte)) * TAU / n * r;
  float fino = 1.0 - smoothstep(0.5, 1.4, lado);
  // ao longo da parede, um trecho aceso a cada volta do padrão, de comprimento sorteado
  float fase = fract(z * 0.35 + viagem + sorte * 7.13);
  float comprimento = 0.08 + 0.14 * hash(vec2(qual, semente + 1.0));
  float aceso = smoothstep(0.0, 0.015, fase) * (1.0 - smoothstep(comprimento * 0.6, comprimento, fase));
  return fino * aceso * (0.35 + 0.65 * hash(vec2(qual, semente + 2.0)));
}

void main() {
  vec2 escala = uResolucao / uTamanho;
  vec2 q = vec2(gl_FragCoord.x, uResolucao.y - gl_FragCoord.y) / escala;
  vec2 dq = q - uVista;
  float r = length(dq);
  float u = uEntrada;

  // Dentro da janela: o ponto da página que está aqui, desfeito o tamanho do site, sobre o fundo
  // dela. (A cena é lida em todo pixel: as linhas da malha pedem que todos os vizinhos a leiam.)
  vec2 p = uVista + dq / uEscalaVista;
  vec4 pagina = cena(p, escala.x * uEscalaVista);
  vec3 dentro = pagina.rgb + (1.0 - pagina.a) * uFundo;

  // Fora dela: o túnel. A parede, vista daqui, está tanto mais funda quanto mais perto do meio da
  // tela, e torce em hélice, mais quanto mais funda, enquanto o site ainda vem de longe.
  float z = 260.0 / max(r, 1.0);
  float angulo = atan(dq.y, dq.x) - uTorcao * (1.0 + 0.6 * z);
  // a viagem acelera no meio e assenta no fim, junto com o site
  float viagem = 0.25 * u + 2.6 * u * u * (3.0 - 2.0 * u);
  float perto = 1.0 - smoothstep(0.2, 3.0, z);   // os de perto brilham mais
  float luz = (riscos(angulo, r, z, viagem, 96.0, 3.1) + 0.7 * riscos(angulo, r, z, viagem * 1.3, 160.0, 8.7)) * (0.25 + 0.75 * perto);
  // o túnel acende logo no começo e se apaga quando a janela já toma a tela
  luz *= smoothstep(0.02, 0.12, u) * (1.0 - smoothstep(0.55, 0.9, u));
  vec3 brilho = mix(uTinta, vec3(1.0), 0.55);
  vec3 fora = brilho * luz;
  // o ponto de luz que se acende no meio do escuro, no começo
  float faisca = (1.0 - smoothstep(0.03, 0.14, u)) * smoothstep(0.0, 0.03, u);
  fora += mix(uTinta, vec3(1.0), 0.8) * exp(-r / (6.0 + 260.0 * u)) * 1.6 * faisca;
  // e a luz que sai da janela, espalhada pelo escuro em volta dela
  fora += brilho * 0.35 * exp(-max(r - uJanela, 0.0) / 22.0) * smoothstep(0.0, 0.1, u);

  // A borda da janela: um fio de luz como o anel em volta da sombra, com as cores um pouco
  // separadas (o vermelho por fora, o azul por dentro), tremeluzindo de leve.
  float px = 1.0 / escala.x;
  float tremula = 0.85 + 0.15 * sin(atan(dq.y, dq.x) * 7.0 + uTempo * 9.0);
  vec3 anel = vec3(
    sino(r - uJanela - 1.6 * px, 1.1 * px + 0.5),
    sino(r - uJanela, 1.1 * px + 0.5),
    sino(r - uJanela + 1.6 * px, 1.1 * px + 0.5)
  ) * mix(uTinta, vec3(1.0), 0.65) * 1.4 * tremula * smoothstep(0.0, 0.06, u);

  vec3 cor = mix(dentro, fora, smoothstep(uJanela - 0.6 * px, uJanela + 0.6 * px, r)) + anel;
  cor += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  corFinal = vec4(clamp(cor, 0.0, 1.0), 1.0);
}
