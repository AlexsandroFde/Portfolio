#version 300 es
// Passa a névoa do mapa dos raios (inteiros, que a placa de vídeo não interpola) para uma textura
// comum, que o desenho lê interpolada entre os texels: em R a parte alta e em G a baixa, 16 bits ao
// todo. Roda uma vez, logo depois do mapa.
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D uCruzamento1;

out vec4 corFinal;

void main() {
  // de 0 a 1: a névoa dividida por 16
  float n = float(texelFetch(uCruzamento1, ivec2(gl_FragCoord.xy), 0).w) / 65535.0;
  corFinal = vec4(floor(n * 255.0) / 255.0, fract(n * 255.0), 0.0, 1.0);
}
