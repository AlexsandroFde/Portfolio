// A cena do fundo da página: o buraco negro, com o disco e a névoa já prontos no mapa dos raios
// (veja disco.frag), e a malha do site, curvada pela gravidade em volta dele. O que fica aqui é
// barato e não pede traçar raio nenhum: a sombra, o anel de luz e o halo dependem só da distância ao
// centro, a malha se curva por uma fórmula, e os jatos são um desenho por cima. Os shaders da tela a
// chamam (composicao.frag, entrada.frag); o renderizador põe este texto no lugar do #include "cena".

uniform vec2 uResolucao;    // tamanho do canvas, em pixels do dispositivo
uniform vec2 uTamanho;      // tamanho do canvas, em px CSS
uniform vec2 uCentro;       // centro do buraco negro (px CSS, y para baixo)
uniform float uRaio;        // raio da sombra (px CSS); 0 desliga o buraco negro
uniform float uTempo;       // segundos, em laço de 0 a 2π
uniform float uAchatar;     // a imagem do disco com a câmera mais alta ou mais baixa que a do mapa, na vertical
uniform float uGiro;        // rotação da imagem na tela (rad)
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
uniform vec4 uDominio;      // o trecho do plano da imagem coberto pelo mapa (rs, y para cima)
uniform sampler2D uDisco;   // o disco neste quadro, pré-multiplicado (veja disco.frag)
uniform sampler2D uNevoa;   // a névoa do mapa: em R a parte alta, em G a baixa (veja nevoa.frag)

// A cena no ponto p (px CSS, y para baixo), pré-multiplicada. `escala` são os pixels da tela por px
// CSS da cena: as bordas finas (as linhas da malha, a da sombra) ficam com um pixel da tela.
vec4 cena(vec2 p, float escala) {
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
  vec2 cobertura = clamp(0.5 * escala + 0.5 - dist, 0.0, 1.0);
  float linha = max(cobertura.x, cobertura.y);
  // onde a lente comprime muito, as linhas virariam ruído: somem aos poucos
  linha *= 1.0 - smoothstep(2.5, 6.0, max(fw.x, fw.y) * uCelula * escala);
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
    float e = 1.0 / (pxPorRs * escala);   // um pixel da tela, em rs

    float sombra = 1.0 - smoothstep(SOMBRA - e, SOMBRA + e, bl);
    float anel = sino(bl - SOMBRA - 1.5 * e, 1.4 * e + 0.015);
    float halo = exp(-max(bl - SOMBRA, 0.0) * 1.5) * (1.0 - sombra);
    // enquanto absorve a página, o disco fica um pouco mais quente (a atividade muda devagar)
    float alimento = 1.0 + 0.2 * max(uAtividade, 0.0);

    // O disco e a névoa vêm prontos do mapa. Com a câmera um pouco mais alta ou mais baixa que a
    // dele (o ponteiro, a subida ao longo da página), a imagem do disco se abre ou se achata.
    vec2 uv = (vec2(b.x, b.y * uAchatar) - uDominio.xy) / uDominio.zw;
    vec4 disco = texture(uDisco, uv);
    vec2 nv = texture(uNevoa, uv).rg;
    float nevoa = (nv.r + nv.g / 255.0) * 16.0;

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
  return cor;
}

// Um pouco de ruído contra faixas no degradê, e alfa válido para a composição pré-multiplicada.
vec4 finalizar(vec4 cor) {
  if (cor.a > 0.004) cor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  cor = clamp(cor, 0.0, 1.0);
  cor.a = max(cor.a, max(cor.r, max(cor.g, cor.b)));
  return cor;
}
