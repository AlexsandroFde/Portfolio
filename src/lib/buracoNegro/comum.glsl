// Partes comuns aos shaders do buraco negro: o renderizador (renderizador.ts) as põe no lugar da
// linha #include "comum" de cada um.
//
// Unidade da cena: o raio de Schwarzschild (rs = 1). Visto de longe, o raio da sombra é
// 3√3/2 rs; o disco vai da órbita estável mais interna (3 rs) até 10 rs.

const float SOMBRA = 2.5980762;   // 3√3/2: raio da sombra, em rs
const float R_DENTRO = 3.0;       // borda interna do disco
const float R_FORA = 10.0;        // borda externa do disco
const float TAU = 6.2831853;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
