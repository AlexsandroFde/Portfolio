#version 300 es
// O mapa dos raios, traçado uma vez só, antes de o buraco negro aparecer (veja renderizador.ts).
//
// Cada texel é um ponto da imagem do buraco negro, em rs em volta do centro dele: o raio de luz
// que chega à câmera ali é integrado de trás para a frente, passo a passo, na trajetória curva em
// volta do buraco negro (Schwarzschild), e o mapa guarda o que ele encontrou no caminho: onde
// cruzou o disco (o raio da órbita e o ângulo em volta do centro) nas duas primeiras vezes em que
// o disco aparece ali, o brilho fixo de cada um desses pontos (o perfil do disco, o efeito Doppler
// e o desvio gravitacional, que não mudam com a rotação) e a névoa somada ao longo do raio.
// Nada disso depende do tempo nem de onde o buraco negro está na tela: a cada quadro, o desenho só
// lê o mapa e põe o gás que gira em cima dele (veja disco.frag).
precision highp float;
precision highp int;

#include "comum"

const float DISTANCIA = 30.0;     // de onde partem os raios

uniform vec4 uDominio;      // o trecho do plano da imagem coberto pelo mapa: canto de baixo à esquerda e tamanho (rs, y para cima)
uniform vec2 uTexels;       // tamanho do mapa, em texels
uniform float uInclinacao;  // ângulo da câmera acima do plano do disco (rad)
uniform float uSentido;     // lado do disco que vem na direção da câmera e brilha mais: -1 esquerdo, 1 direito

layout(location = 0) out uvec4 cruzamento1;  // o primeiro ponto do disco: raio, ângulo, brilho, e a névoa do raio
layout(location = 1) out uvec4 cruzamento2;  // o segundo: raio, ângulo e brilho

// O brilho fixo de um ponto do disco (phi é o ângulo dele em volta do buraco negro): o perfil do
// disco, mais o efeito Doppler (o gás que vem na direção da câmera brilha mais) e o desvio
// gravitacional. A textura do gás, que gira, entra por cima disso a cada quadro.
float brilho(vec3 q, float r, vec3 direcao) {
  vec3 v = uSentido * vec3(-q.z, 0.0, q.x) / r;
  float beta = 0.55 * sqrt(0.5 / max(r - 1.0, 0.5));
  float gama = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gama * (1.0 - beta * dot(v, -direcao)));
  float g = doppler * sqrt(1.0 - 1.0 / r);
  return perfil(r) * g * g * sqrt(g);
}

// Em inteiros de 16 bits: o raio em 1/4096 de rs (0 fica para "sem ponto do disco"), o ângulo em
// voltas, o brilho em 1/8192 e a névoa em 1/4096.
uvec4 codificar(float r, float angulo, float b) {
  return uvec4(
    uint(clamp(r * 4096.0 + 0.5, 1.0, 65535.0)),
    uint(clamp(angulo * 65536.0, 0.0, 65535.0)),
    uint(clamp(b * 8192.0 + 0.5, 0.0, 65535.0)),
    0u);
}

void main() {
  vec2 b = uDominio.xy + gl_FragCoord.xy / uTexels * uDominio.zw;   // parâmetro de impacto do raio, y para cima
  float bl = length(b);
  float si = sin(uInclinacao);
  float ci = cos(uInclinacao);
  uvec4 primeiro = uvec4(0u);
  uvec4 segundo = uvec4(0u);
  int guardados = 0;
  float nevoa = 0.0;

  // Só vale traçar o raio onde o disco ou suas imagens podem aparecer.
  if (bl < 6.5 || (abs(b.x) < R_FORA + 1.0 && abs(b.y) < R_FORA * si + 1.3)) {
    vec3 pos = vec3(0.0, si, ci) * DISTANCIA + vec3(b.x, b.y * ci, -b.y * si);
    vec3 vel = -vec3(0.0, si, ci);
    float h2 = dot(b, b);   // momento angular ao quadrado (conservado)
    // A parte de baixo do disco só aparece por baixo da de cima. A luz dela chega dando a volta por
    // baixo do buraco negro (o raio cruza o plano do disco de novo, já do outro lado) e forma o arco
    // que contorna a sombra por baixo; pelas laterais, ela continuaria subindo, rente à sombra, acima
    // da faixa da frente. Esses raios, os de acima da faixa, cruzam o plano pela primeira vez por
    // dentro do disco, no vão entre ele e a sombra: deles, só vale o primeiro cruzamento.
    int cruzamentos = 0;
    bool porDentro = false;
    float alfa = 0.0;

    for (int i = 0; i < 160; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) break;   // caiu no horizonte de eventos
      float dt = 0.075 * r;
      // trajetória da luz em Schwarzschild: x'' = -3/2 h² x / r⁵
      vel += (-1.5 * h2 / (r2 * r2 * r)) * pos * dt;
      vec3 proximo = pos + vel * dt;

      if (pos.y * proximo.y < 0.0) {   // cruzou o plano do disco
        vec3 q = mix(pos, proximo, pos.y / (pos.y - proximo.y));
        float rq = length(q.xz);
        cruzamentos++;
        // por dentro da borda de dentro do disco, até onde ele fica opaco
        if (cruzamentos == 1) porDentro = rq < R_DENTRO * 1.04;
        float a = porDentro && cruzamentos > 1 ? 0.0 : densidade(rq) * 0.97;
        if (a > 0.0) {
          uvec4 ponto = codificar(rq, fract(atan(q.z, q.x) / TAU), brilho(q, rq, normalize(vel)));
          if (guardados == 0) primeiro = ponto;
          else if (guardados == 1) segundo = ponto;
          guardados++;
          // o que vem depois está escondido (a opacidade não depende da rotação)
          alfa += (1.0 - alfa) * a;
          if (alfa > 0.985) break;
        }
      }
      // gás difuso em volta do disco, que dá o brilho suave
      nevoa += exp(-abs(pos.y) * 3.5) * perfil(length(pos.xz)) * dt;

      pos = proximo;
      if (r > 13.0 && dot(pos, vel) > 0.0) break;   // já passou e está indo embora
    }
  }

  primeiro.w = uint(clamp(nevoa * 4096.0 + 0.5, 0.0, 65535.0));
  cruzamento1 = primeiro;
  cruzamento2 = segundo;
}
