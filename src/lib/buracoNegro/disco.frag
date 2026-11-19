#version 300 es
// O disco neste quadro, sobre o mapa dos raios (veja geodesicas.frag): para cada ponto da imagem, o
// gás dos pontos do disco que o mapa guarda, na posição em que a rotação os deixou agora, com o
// brilho fixo de cada um e as cores do tema. É a única parte do desenho que muda com o tempo, e é
// barata: o caminho da luz já foi traçado, aqui só se lê o mapa. Sai na resolução do mapa, e o
// desenho da tela (composicao.frag) a lê interpolada.
precision highp float;
precision highp int;
precision highp usampler2D;

#include "comum"

// Um ciclo de rotação do disco dura VOLTAS·2π unidades de fase (umas 3 horas). Nesse tempo cada
// anel dá um número inteiro de voltas, então o fim do ciclo emenda no começo sem salto.
const float VOLTAS = 4000.0;

uniform usampler2D uCruzamento1;
uniform usampler2D uCruzamento2;
uniform vec4 uDominio;      // o trecho do plano da imagem coberto pelo mapa (rs, y para cima)
uniform vec2 uTexels;       // tamanho do mapa, em texels
uniform float uCiclo;       // de 0 a 1: em que ponto do ciclo de rotação o disco está
uniform float uSentido;     // lado do disco que vem na direção da câmera: -1 esquerdo, 1 direito
uniform float uAlimento;    // enquanto a página desce, o disco esquenta (1 parado)
uniform float uAchatar;     // quanto a imagem do disco está achatada na vertical em relação à tela (veja composicao.frag)
uniform vec3 uTinta;        // cor de destaque do tema
uniform vec3 uFundo;        // cor do fundo da página
uniform float uEscuro;      // 1 no tema escuro, 0 no claro

out vec4 corFinal;

// Fração de volta que o anel de raio r já deu. A velocidade é a da órbita, arredondada para
// um número inteiro de voltas por ciclo.
float voltas(float r) {
  float porCiclo = floor(sqrt(0.5 / (r * r * r)) * VOLTAS + 0.5);
  return fract(porCiclo * uCiclo);
}

// Uma linha da grade de ruído do disco: o anel de raio `linha / escala`, que gira inteiro.
float linhaDoAnel(float a, float linha, float periodo, float escala) {
  float r = max(linha / escala, 2.0);
  float x = (a - uSentido * voltas(r)) * periodo;
  float i = floor(x);
  float f = x - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(vec2(mod(i, periodo), linha)), hash(vec2(mod(i + 1.0, periodo), linha)), f);
}

// Ruído do gás em (ângulo em voltas, raio). Cada linha da grade é um anel que gira com a
// velocidade da própria órbita, deslizando sobre os vizinhos. Torcer a textura inteira pela
// diferença de velocidade (como faria um fluido de verdade) enrolaria o desenho sem parar, até
// virar sulcos finos e depois ruído; assim ele se renova o tempo todo e nunca se perde.
float gas(float a, float r) {
  float soma = 0.0;
  float amplitude = 0.5;
  float periodo = 18.0;
  float escala = 1.5;
  for (int o = 0; o < 3; o++) {
    float y = r * escala;
    float linha = floor(y);
    float f = y - linha;
    f = f * f * (3.0 - 2.0 * f);
    soma += amplitude * mix(linhaDoAnel(a, linha, periodo, escala), linhaDoAnel(a, linha + 1.0, periodo, escala), f);
    periodo *= 2.0;
    escala *= 2.0;
    amplitude *= 0.5;
  }
  return soma / 0.875;
}

// Tema escuro: o gás brilha, do azul de destaque ao branco nas partes mais quentes.
vec4 luz(float t, float a) {
  vec3 c = mix(uTinta * 0.6, uTinta, smoothstep(0.0, 0.4, t));
  c = mix(c, vec3(1.0, 0.985, 0.965), smoothstep(0.45, 1.25, t));
  return vec4(c * clamp(t * 1.2 + 0.1, 0.0, 1.3) * a, a);
}

// Tema claro: o mesmo desenho como uma gravura. Sobre o papel, o gás quente vira nanquim na cor
// de destaque e o frio fica na cor do papel; na frente da sombra preta, ao contrário, o quente é
// um traço claro e o frio, nanquim azul, para a faixa da frente aparecer com borda nítida.
vec4 nanquim(float t, float a, float sobreSombra) {
  float quente = smoothstep(0.02, 0.85, t);
  vec3 papel = mix(mix(uFundo, uTinta, quente), uTinta * 0.45, smoothstep(0.85, 1.6, t));
  vec3 sombra = mix(uTinta * 0.85, uFundo, quente);
  return vec4(mix(papel, sombra, sobreSombra) * a, a);
}

// Um ponto do disco guardado no mapa: a textura do gás que gira, com o brilho fixo dele.
vec4 ponto(uvec4 c, float sombra) {
  float r = float(c.x) / 4096.0;
  float a = densidade(r) * 0.97;
  float n = gas(float(c.y) / 65536.0, r);
  float faixas = 0.8 + 0.2 * sin(r * 4.5 + n * 4.0);
  float t = float(c.z) / 8192.0 * (0.3 + 1.1 * n * n) * faixas * uAlimento;
  return uEscuro > 0.5 ? luz(t, a) : nanquim(t, a, sombra);
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  uvec4 c1 = texelFetch(uCruzamento1, texel, 0);
  vec4 disco = vec4(0.0);
  if (c1.x != 0u) {
    vec2 b = uDominio.xy + gl_FragCoord.xy / uTexels * uDominio.zw;
    float e = uDominio.z / uTexels.x;   // um texel, em rs
    // a sombra é redonda na tela, e não no mapa: lá a imagem do disco pode estar achatada
    float sombra = 1.0 - smoothstep(SOMBRA - e, SOMBRA + e, length(vec2(b.x, b.y / uAchatar)));
    disco = ponto(c1, sombra);
    uvec4 c2 = texelFetch(uCruzamento2, texel, 0);
    if (c2.x != 0u) disco = sobre(disco, ponto(c2, sombra));
  }
  corFinal = disco;
}
