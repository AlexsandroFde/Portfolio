#version 300 es
// A queda: no mergulho, a cena (composicao.frag, desenhada antes numa textura) vista por quem cai no
// buraco negro. Tudo cresce com o quanto já se mergulhou e não pede traçar raio nenhum, só ler a
// textura da cena em outros pontos:
// - o espaço em volta do buraco negro se torce num redemoinho, no sentido em que o disco gira, mais
//   perto da sombra que longe dela;
// - as coisas correm para fora a partir do meio da tela, para onde se cai, em rastros que alongam
//   quanto mais depressa se cai (o buraco negro cresce cada vez mais rápido) e quanto mais rápida a
//   rolagem;
// - a luz se separa em cores nas bordas, como numa lente forte;
// - grãos de poeira passam por quem cai, correndo para fora em perspectiva, cada vez mais depressa:
//   eles andam com a rolagem, e parando de rolar, param também;
// - a visão se fecha num túnel, escurecendo as bordas, e no tema escuro a luz que vem de fora fica
//   mais azul e mais forte (o desvio para o azul de quem cai);
// - perto do horizonte, a vista treme.
precision highp float;
precision highp sampler2D;

#include "comum"

uniform sampler2D uCena;    // a cena deste quadro (pré-multiplicada), com uMargem px a mais de cada lado da tela
uniform vec2 uMargem;       // quanto a cena passa da tela de cada lado (px CSS)
uniform vec2 uResolucao;    // tamanho do canvas, em pixels do dispositivo
uniform vec2 uTamanho;      // tamanho do canvas, em px CSS
uniform vec2 uCentro;       // centro do buraco negro (px CSS, y para baixo)
uniform float uRaio;        // raio da sombra (px CSS)
uniform float uMergulho;    // de 0 a 1: quanto já se mergulhou
uniform float uRastro;      // comprimento dos rastros, em fração da distância ao meio da tela
uniform float uTempo;       // segundos, em laço de 0 a 2π
uniform float uSentido;     // lado do disco que vem na direção da câmera: -1 esquerdo, 1 direito
uniform vec3 uFundo;        // cor do fundo da página
uniform vec3 uTinta;        // cor de destaque do tema
uniform float uEscuro;      // 1 no tema escuro, 0 no claro

out vec4 corFinal;

// Uma camada de grãos de poeira em volta do meio da tela (`dq` a partir dele): `n` direções, metade
// delas com um grão, cada um a uma fundura sorteada (z, para dentro da tela). Andando `viagem` para
// a frente, os grãos de perto correm para fora e se alongam, em perspectiva.
float graos(vec2 dq, float viagem, float n, float semente, float rastro) {
  float r = length(dq);
  float z = 220.0 / max(r, 1.0);
  float faixa = mod((atan(dq.y, dq.x) / TAU + 0.5) * n, n);
  float qual = floor(faixa);
  float sorte = hash(vec2(qual, semente));
  if (sorte < 0.5) return 0.0;
  float lado = abs(fract(faixa) - (0.15 + 0.7 * hash(vec2(qual, semente + 3.0)))) * TAU / n * r;
  float fino = 1.0 - smoothstep(0.4, 1.3, lado);
  float fase = fract(z * 0.3 + viagem + sorte * 5.71);
  float comprimento = 0.015 + rastro * (0.6 + 0.8 * hash(vec2(qual, semente + 1.0)));
  float aceso = smoothstep(0.0, 0.01, fase) * (1.0 - smoothstep(comprimento * 0.5, comprimento, fase));
  return fino * aceso * (1.0 - smoothstep(0.3, 3.5, z));
}

// A cena no ponto p (px CSS), já sobre o fundo da página: na queda o canvas cobre a tela toda.
vec3 ler(vec2 p) {
  vec2 total = uTamanho + 2.0 * uMargem;
  vec4 c = texture(uCena, vec2(p.x + uMargem.x, total.y - p.y - uMargem.y) / total);
  return c.rgb + (1.0 - c.a) * uFundo;
}

void main() {
  vec2 escala = uResolucao / uTamanho;
  vec2 tela = vec2(gl_FragCoord.x, uResolucao.y - gl_FragCoord.y) / escala;
  vec2 meio = uTamanho * 0.5;   // para onde se cai
  float meiaDiagonal = length(meio);
  float m = uMergulho;
  float daBorda = length(tela - meio) / meiaDiagonal;   // 0 no meio da tela, 1 nos cantos

  // perto do horizonte, a vista treme (só frequências inteiras: o tempo dá a volta em 2π)
  vec2 p = tela + 1.8 * smoothstep(0.5, 0.9, m) *
    vec2(sin(uTempo * 23.0) + 0.6 * sin(uTempo * 41.0 + 1.3), sin(uTempo * 29.0 + 0.4) + 0.6 * sin(uTempo * 37.0 + 2.1));

  // O redemoinho: o espaço gira em volta do buraco negro, tanto mais quanto mais perto da sombra,
  // sem quinas. Ele é mais forte no meio da queda, com o disco à vista, e acalma quando a sombra já
  // toma a tela. O quanto cada ponto anda fica dentro da margem da cena: com a sombra maior que a
  // tela, girar tudo levaria a leitura para longe da beira, onde nada foi desenhado.
  vec2 d = p - uCentro;
  float r = length(d);
  float x = r / uRaio;
  float torcao = 0.9 * smoothstep(0.05, 0.45, m) * (1.0 - 0.6 * smoothstep(0.5, 0.9, m)) / (1.0 + x * x);
  float limite = max(0.9 * min(uMargem.x, uMargem.y), 1.0);
  if (r > 1.0) torcao = limite * tanh(r * torcao / limite) / r;
  float ct = cos(torcao * uSentido);
  float st = sin(torcao * uSentido);
  p = uCentro + vec2(ct * d.x - st * d.y, st * d.x + ct * d.y);

  // Os rastros: cada pixel junta o que está entre ele e um pouco mais perto do meio da tela (as
  // coisas correm para fora), e cada cor anda um pouco diferente, abrindo nas bordas. As leituras
  // começam num ponto sorteado por pixel: com poucas, o rastro sai liso, e não em cópias.
  float separa = 0.007 * smoothstep(0.15, 0.85, m);
  vec2 v = p - meio;
  vec3 soma = vec3(0.0);
  float pesos = 0.0;
  float sorte = hash(gl_FragCoord.xy * 1.37 + 11.0);
  for (int i = 0; i < 8; i++) {
    float t = (float(i) + sorte) / 8.0;
    float f = 1.0 - uRastro * t;
    float w = 1.0 - 0.75 * t;
    soma += vec3(
      ler(meio + v * f * (1.0 + separa)).r,
      ler(meio + v * f).g,
      ler(meio + v * f * (1.0 - separa)).b
    ) * w;
    pesos += w;
  }
  vec3 cor = soma / pesos;

  // A poeira, que aparece quando a queda engrena e some no horizonte. A viagem acelera com o
  // mergulho (o buraco negro também cresce cada vez mais rápido).
  float viagem = 4.0 * m * m;
  vec2 dq = tela - meio;
  float poeira = (graos(dq, viagem, 70.0, 2.3, uRastro) + 0.6 * graos(dq, viagem * 1.4, 120.0, 6.1, uRastro));
  poeira *= smoothstep(0.08, 0.35, m) * (1.0 - smoothstep(0.88, 0.97, m));
  // cada grão claro sobre o escuro (a sombra, o espaço) e escuro sobre o claro (o papel do tema claro)
  float fundoDoGrao = dot(cor, vec3(0.299, 0.587, 0.114));
  vec3 claro = uEscuro > 0.5 ? mix(uTinta, vec3(1.0), 0.6) : mix(uFundo, vec3(1.0), 0.5);
  vec3 escuro = uTinta * (uEscuro > 0.5 ? 0.4 : 0.55);
  cor = mix(cor, mix(claro, escuro, smoothstep(0.35, 0.75, fundoDoGrao)), clamp(poeira * 0.85, 0.0, 1.0));

  // a luz de fora, no tema escuro, mais azul e mais forte
  if (uEscuro > 0.5) {
    float azul = smoothstep(0.35, 0.95, m);
    float luz = dot(cor, vec3(0.299, 0.587, 0.114));
    cor = mix(cor, cor * mix(vec3(1.0), vec3(0.75, 1.0, 1.35), azul) * (1.0 + 0.5 * azul), smoothstep(0.08, 0.6, luz));
  }
  // a visão se fecha num túnel
  cor *= 1.0 - 0.55 * smoothstep(0.2, 0.95, m) * smoothstep(0.25, 1.05, daBorda);

  cor += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  corFinal = vec4(clamp(cor, 0.0, 1.0), 1.0);
}
