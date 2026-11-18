#version 300 es
// Buraco negro de Schwarzschild com disco de acreção, no fundo da página, e a malha do site,
// curvada pela gravidade em volta dele.
//
// Unidade da cena: o raio de Schwarzschild (rs = 1). Visto de longe, o raio da sombra é
// 3√3/2 rs; o disco vai da órbita estável mais interna (3 rs) até 10 rs. Cada pixel perto do
// buraco negro dispara um raio de luz, integrado passo a passo na trajetória curva.
precision highp float;

uniform vec2 uResolucao;    // tamanho do canvas, em pixels do dispositivo
uniform vec2 uTamanho;      // tamanho do canvas, em px CSS
uniform vec2 uCentro;       // centro do buraco negro (px CSS, y para baixo)
uniform float uRaio;        // raio da sombra (px CSS); 0 desliga o buraco negro
uniform float uCiclo;       // de 0 a 1: em que ponto do ciclo de rotação o disco está (ver VOLTAS)
uniform float uTempo;       // segundos, em laço de 0 a 2π
uniform float uInclinacao;  // ângulo da câmera acima do plano do disco (rad)
uniform float uGiro;        // rotação da imagem na tela (rad)
uniform float uSentido;     // lado do disco que vem na direção da câmera e brilha mais: -1 esquerdo, 1 direito
uniform float uAtividade;   // > 0 enquanto a página desce (o disco esquenta), < 0 enquanto sobe (jatos), qualquer que seja a velocidade
uniform float uCelula;      // lado do quadrado da malha (px CSS)
uniform float uMalhaX;      // x de uma das linhas verticais da malha (px CSS)
uniform float uDesloc;      // quanto a malha já subiu com a rolagem (px CSS)
uniform float uAlturaHero;  // altura da apresentação, onde a malha aparece no topo da página (px CSS)
uniform vec4 uLinha;        // cor das linhas da malha (rgb + alfa)
uniform vec3 uTinta;        // cor de destaque do tema
uniform vec3 uTexto;        // cor do texto (a sombra, no tema claro)
uniform vec3 uFundo;        // cor do fundo da página
uniform float uEscuro;      // 1 no tema escuro, 0 no claro

out vec4 corFinal;

const float SOMBRA = 2.5980762;   // 3√3/2: raio da sombra, em rs
const float R_DENTRO = 3.0;       // borda interna do disco
const float R_FORA = 10.0;        // borda externa do disco
const float DISTANCIA = 30.0;     // de onde partem os raios
const float TAU = 6.2831853;
// Um ciclo de rotação do disco dura VOLTAS·2π unidades de fase (umas 3 horas). Nesse tempo cada
// anel dá um número inteiro de voltas, então o fim do ciclo emenda no começo sem salto.
const float VOLTAS = 4000.0;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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

// Curva em sino: 1 no centro, caindo dos dois lados. (pow com base negativa é indefinido em
// GLSL e vira NaN em algumas placas de vídeo; por isso a multiplicação.)
float sino(float x, float largura) {
  float u = x / largura;
  return exp(-u * u);
}

vec4 sobre(vec4 frente, vec4 fundo) {
  return frente + (1.0 - frente.a) * fundo;
}

// Brilho do disco em função do raio: forte na borda interna e ainda luminoso até perto da borda
// de fora (a faixa que passa na frente da sombra precisa aparecer).
float perfil(float r) {
  float x = R_DENTRO / max(r, 0.5);
  return smoothstep(R_DENTRO * 0.92, R_DENTRO * 1.2, r) * (1.0 - smoothstep(R_FORA * 0.55, R_FORA, r)) * pow(x, 1.25) * 1.7;
}

// O gás do disco é opaco: a parte da frente tampa a sombra e as imagens que ficam atrás dela.
// Só fica translúcido bem perto da borda de fora.
float densidade(float r) {
  return smoothstep(R_DENTRO * 0.9, R_DENTRO * 1.04, r) * (1.0 - smoothstep(R_FORA * 0.78, R_FORA, r));
}

// Intensidade observada num ponto do disco (phi é o ângulo dele em volta do buraco negro):
// textura que gira com a velocidade de cada órbita, mais o efeito Doppler (o gás que vem na
// direção da câmera brilha mais) e o desvio gravitacional.
float emissao(vec3 q, float r, float phi, vec3 direcao) {
  float n = gas(phi / TAU, r);
  float faixas = 0.8 + 0.2 * sin(r * 4.5 + n * 4.0);
  float base = perfil(r) * (0.3 + 1.1 * n * n) * faixas;

  vec3 v = uSentido * vec3(-q.z, 0.0, q.x) / r;
  float beta = 0.55 * sqrt(0.5 / max(r - 1.0, 0.5));
  float gama = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gama * (1.0 - beta * dot(v, -direcao)));
  float g = doppler * sqrt(1.0 - 1.0 / r);
  return base * g * g * sqrt(g);
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

void main() {
  vec2 escala = uResolucao / uTamanho;
  vec2 p = vec2(gl_FragCoord.x, uResolucao.y - gl_FragCoord.y) / escala;
  vec2 d = p - uCentro;
  float rp = length(d);
  bool temBuraco = uRaio > 0.0;

  // ---------------- malha ----------------
  // Lente gravitacional: cada pixel mostra o ponto da malha de onde a luz realmente veio.
  // Perto da sombra a luz dá a volta, e a malha aparece comprimida e invertida.
  vec2 fonte = p;
  if (temBuraco) {
    float einstein = uRaio * 1.75;
    float k = einstein * (einstein - uRaio);
    float desvio = k / max(rp - uRaio, 1e-3) * sino(rp, uRaio * 9.0);
    fonte -= d / max(rp, 1e-3) * desvio;
  }
  vec2 g = (fonte + vec2(0.0, uDesloc) - vec2(uMalhaX + 0.5, 0.5)) / uCelula;
  vec2 fw = max(fwidth(g), vec2(1e-6));
  vec2 dist = abs(fract(g + 0.5) - 0.5) / fw;
  vec2 cobertura = clamp(0.5 * escala.x + 0.5 - dist, 0.0, 1.0);
  float linha = max(cobertura.x, cobertura.y);
  // onde a lente comprime muito, as linhas virariam ruído: somem aos poucos
  linha *= 1.0 - smoothstep(2.5, 6.0, max(fw.x, fw.y) * uCelula * escala.x);
  // Onde a malha aparece: no alto da apresentação (a mesma máscara da .hero-grid, subindo junto
  // com a malha) e em volta do buraco negro, por toda a página.
  vec2 m = (p - vec2(0.75 * uTamanho.x, -uDesloc)) / vec2(0.75 * uTamanho.x, 0.85 * uAlturaHero);
  float mascara = clamp(1.0 - length(m) / 0.72, 0.0, 1.0);
  if (temBuraco) mascara = max(mascara, 0.85 * (1.0 - smoothstep(uRaio * 3.0, uRaio * 8.0, rp)));
  float reforco = temBuraco ? 1.0 + 1.4 * sino(rp, uRaio * 4.5) : 1.0;
  float aMalha = linha * mascara * 0.7 * uLinha.a * reforco;
  vec4 cor = vec4(uLinha.rgb * aMalha, aMalha);

  // ---------------- buraco negro ----------------
  if (temBuraco) {
    float pxPorRs = uRaio / SOMBRA;
    vec2 b = vec2(d.x, -d.y) / pxPorRs;   // parâmetro de impacto do raio, y para cima
    float cg = cos(uGiro);
    float sg = sin(uGiro);
    b = vec2(cg * b.x - sg * b.y, sg * b.x + cg * b.y);
    float bl = length(b);
    float e = 1.0 / (pxPorRs * escala.x);   // um pixel do dispositivo, em rs

    float sombra = 1.0 - smoothstep(SOMBRA - e, SOMBRA + e, bl);
    float anel = sino(bl - SOMBRA - 1.5 * e, 1.4 * e + 0.015);
    float halo = exp(-max(bl - SOMBRA, 0.0) * 1.5) * (1.0 - sombra);
    // enquanto absorve a página, o disco fica um pouco mais quente (a atividade muda devagar)
    float alimento = 1.0 + 0.2 * max(uAtividade, 0.0);

    float si = sin(uInclinacao);
    float ci = cos(uInclinacao);
    vec4 disco = vec4(0.0);
    float nevoa = 0.0;
    // A parte de baixo do disco só aparece por baixo da de cima. A luz dela chega dando a volta por
    // baixo do buraco negro (o raio cruza o plano do disco de novo, já do outro lado) e forma o arco
    // que contorna a sombra por baixo; pelas laterais, ela continuaria subindo, rente à sombra, acima
    // da faixa da frente. Esses raios, os de acima da faixa, cruzam o plano pela primeira vez por
    // dentro do disco, no vão entre ele e a sombra: deles, só vale o primeiro cruzamento.
    int cruzamentos = 0;
    bool porDentro = false;

    // Só vale traçar o raio onde o disco ou suas imagens podem aparecer.
    if (bl < 6.5 || (abs(b.x) < R_FORA + 1.0 && abs(b.y) < R_FORA * si + 1.3)) {
      vec3 pos = vec3(0.0, si, ci) * DISTANCIA + vec3(b.x, b.y * ci, -b.y * si);
      vec3 vel = -vec3(0.0, si, ci);
      float h2 = dot(b, b);   // momento angular ao quadrado (conservado)

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
            float t = emissao(q, rq, atan(q.z, q.x), normalize(vel)) * alimento;
            disco = sobre(disco, uEscuro > 0.5 ? luz(t, a) : nanquim(t, a, sombra));
            if (disco.a > 0.985) break;   // o que vem depois está escondido
          }
        }
        // gás difuso em volta do disco, que dá o brilho suave
        nevoa += exp(-abs(pos.y) * 3.5) * perfil(length(pos.xz)) * dt;

        pos = proximo;
        if (r > 13.0 && dot(pos, vel) > 0.0) break;   // já passou e está indo embora
      }
    }

    // Jatos: quando a página é cuspida de volta (rolando para cima), saem dois jatos ao longo
    // do eixo do disco. O de cima vem na direção da câmera e passa na frente da sombra; o de
    // baixo fica atrás dela.
    float jato = 0.0;
    float forcaJato = smoothstep(0.0, 0.9, -uAtividade);
    if (forcaJato > 0.0) {
      float ao = abs(b.y) - SOMBRA * 0.55;   // distância ao longo do eixo
      if (ao > 0.0) {
        // núcleo fino e brilhante que vai se abrindo, com um brilho largo em volta e um leve
        // tremor de matéria correndo para fora
        float tremor = 0.85 + 0.15 * sin(ao * 1.3 - uTempo * 8.0) * sin(ao * 0.7 + uTempo * 3.0);
        // curto: com o buraco negro no canto, um jato longo viraria um risco na borda da tela toda
        float nucleo = sino(b.x, 0.07 + 0.035 * ao) * exp(-ao / 3.5);
        float envolta = sino(b.x, 0.35 + 0.12 * ao) * exp(-ao / 2.5) * 0.3;
        jato = (nucleo + envolta) * smoothstep(0.0, 1.0, ao) * tremor * forcaJato;
        if (b.y < 0.0) jato *= 1.0 - sombra;
      }
    }

    vec4 fundo = cor * (1.0 - sombra);   // a sombra esconde a malha
    if (uEscuro > 0.5) {
      fundo = sobre(vec4(0.0, 0.0, 0.0, 0.62 * sombra), fundo);   // mais escura que a página
      vec3 brilho = mix(uTinta, vec3(1.0), 0.65) * anel * 0.95 + uTinta * (halo * 0.14 + nevoa * 0.08 * alimento);
      brilho += mix(uTinta, vec3(1.0), 0.55) * jato;
      fundo = sobre(vec4(brilho, max(brilho.r, max(brilho.g, brilho.b))), fundo);
    } else {
      float aNevoa = clamp(nevoa * 0.025 + halo * 0.04, 0.0, 0.35) * (1.0 - sombra);
      fundo = sobre(vec4(uTinta * aNevoa, aNevoa), fundo);
      fundo = sobre(vec4(uTexto, 1.0) * sombra, fundo);   // a sombra na cor do texto
      // o anel de fótons: um fio claro logo na borda de dentro da sombra
      float fio = sino(bl - SOMBRA + 1.6 * e, 1.2 * e + 0.012) * 0.9;
      fundo = sobre(vec4(uFundo, 1.0) * fio, fundo);
      float aJato = clamp(jato * 0.8, 0.0, 0.85);
      fundo = sobre(vec4(mix(uTinta, uFundo, sombra) * aJato, aJato), fundo);   // claro sobre a sombra
    }
    cor = sobre(disco, fundo);
  }

  // um pouco de ruído contra faixas no degradê, e alfa válido para a composição pré-multiplicada
  if (cor.a > 0.004) cor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  cor = clamp(cor, 0.0, 1.0);
  cor.a = max(cor.a, max(cor.r, max(cor.g, cor.b)));
  corFinal = cor;
}
