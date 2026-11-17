import fonteFragmento from './buracoNegro.frag?raw'

// Um triângulo que cobre a tela inteira, sem buffers: os vértices saem do gl_VertexID.
const fonteVertice = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

export type Rgb = readonly [number, number, number]
export type Rgba = readonly [number, number, number, number]

/** Em quantas direções em volta do buraco negro os fluxos são descritos (o tamanho de uFluxos no shader). */
export const DIRECOES = 64

/** Matéria da página caindo no disco, por direção em volta do buraco negro, no plano do disco. */
export interface Fluxos {
  /** Para cada direção: a força do fluxo (0 a 1) e o raio em que ele começa (em rs). */
  dados: Float32Array
  /** A maior força entre as direções; 0 quando nada está sendo absorvido. */
  forca: number
  /** O maior raio de início (rs). */
  raio: number
}

/** Tudo o que o shader precisa para desenhar um quadro. Medidas em px CSS, relativas ao canvas. */
export interface Quadro {
  largura: number
  altura: number
  centroX: number
  centroY: number
  /** Raio da sombra; 0 desenha só a malha. */
  raio: number
  celula: number
  malhaX: number
  /** Quanto a malha já subiu com a rolagem. */
  desloc: number
  /** Altura da apresentação, onde a malha aparece no topo da página. */
  alturaHero: number
  /** De 0 a 1: em que ponto do ciclo de rotação o disco está. */
  ciclo: number
  /** Segundos, em laço de 0 a 2π. */
  tempo: number
  inclinacao: number
  giro: number
  /** Lado do disco que vem na direção da câmera (e brilha mais): -1 esquerdo, 1 direito. */
  sentido: number
  /** De -1 a 1: positivo enquanto a página desce rápido, negativo enquanto sobe rápido. */
  atividade: number
  /** Matéria da página caindo no disco (ver absorcao.ts). */
  fluxos: Fluxos
  /** Faz os filamentos correrem para dentro (crescendo) ou para fora (diminuindo). */
  fluxoFase: number
  linha: Rgba
  tinta: Rgb
  texto: Rgb
  fundo: Rgb
  escuro: boolean
}

export interface Renderizador {
  /** O programa terminou de compilar (a compilação pode ser em paralelo, fora da thread principal). */
  pronto(): boolean
  /** O shader não compilou neste aparelho: fica valendo a malha em CSS. */
  falhou(): boolean
  desenhar(quadro: Quadro): void
  destruir(): void
}

const UNIFORMS = [
  'uResolucao',
  'uTamanho',
  'uCentro',
  'uRaio',
  'uCiclo',
  'uTempo',
  'uInclinacao',
  'uGiro',
  'uSentido',
  'uAtividade',
  'uFluxos',
  'uFluxo',
  'uFluxoRaio',
  'uFluxoFase',
  'uCelula',
  'uMalhaX',
  'uDesloc',
  'uAlturaHero',
  'uLinha',
  'uTinta',
  'uTexto',
  'uFundo',
  'uEscuro',
] as const

type Locais = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>

function compilar(gl: WebGL2RenderingContext, tipo: number, fonte: string): WebGLShader {
  const shader = gl.createShader(tipo)
  if (!shader) throw new Error('Não foi possível criar o shader.')
  gl.shaderSource(shader, fonte)
  gl.compileShader(shader)
  return shader
}

/**
 * Cria o renderizador no canvas, ou devolve `null` se não houver WebGL 2 com aceleração
 * de hardware (nesse caso o site fica com a malha em CSS).
 */
export function criarRenderizador(canvas: HTMLCanvasElement): Renderizador | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    // É enfeite: não vale acordar a placa de vídeo dedicada do notebook.
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  })
  if (!gl) return null

  const paralelo = gl.getExtension('KHR_parallel_shader_compile')
  const vertice = compilar(gl, gl.VERTEX_SHADER, fonteVertice)
  // sem os comentários, que têm acentos: o código do shader em si é só ASCII
  const fragmento = compilar(gl, gl.FRAGMENT_SHADER, fonteFragmento.replace(/\/\/.*$/gm, ''))
  const programa = gl.createProgram()
  gl.attachShader(programa, vertice)
  gl.attachShader(programa, fragmento)
  gl.linkProgram(programa)

  let locais: Locais | undefined
  let erro = false

  const pronto = (): boolean => {
    if (locais) return true
    if (erro) return false
    if (paralelo && !gl.getProgramParameter(programa, paralelo.COMPLETION_STATUS_KHR)) return false

    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
      erro = true
      if (import.meta.env.DEV) {
        console.error(
          '[buraco negro]',
          gl.getShaderInfoLog(fragmento) || gl.getShaderInfoLog(vertice) || gl.getProgramInfoLog(programa),
        )
      }
      return false
    }

    locais = Object.fromEntries(UNIFORMS.map((nome) => [nome, gl.getUniformLocation(programa, nome)])) as Locais
    gl.useProgram(programa)
    return true
  }

  return {
    pronto,

    falhou: () => erro,

    desenhar(q) {
      if (!locais) return
      const w = canvas.width
      const h = canvas.height
      gl.viewport(0, 0, w, h)
      gl.uniform2f(locais.uResolucao, w, h)
      gl.uniform2f(locais.uTamanho, q.largura, q.altura)
      gl.uniform2f(locais.uCentro, q.centroX, q.centroY)
      gl.uniform1f(locais.uRaio, q.raio)
      gl.uniform1f(locais.uCiclo, q.ciclo)
      gl.uniform1f(locais.uTempo, q.tempo)
      gl.uniform1f(locais.uInclinacao, q.inclinacao)
      gl.uniform1f(locais.uGiro, q.giro)
      gl.uniform1f(locais.uSentido, q.sentido)
      gl.uniform1f(locais.uAtividade, q.atividade)
      gl.uniform1f(locais.uFluxo, q.fluxos.forca)
      // sem nada sendo absorvido o shader nem consulta os fluxos: não precisa reenviar
      if (q.fluxos.forca > 0) {
        gl.uniform2fv(locais.uFluxos, q.fluxos.dados)
        gl.uniform1f(locais.uFluxoRaio, q.fluxos.raio)
        gl.uniform1f(locais.uFluxoFase, q.fluxoFase)
      }
      gl.uniform1f(locais.uCelula, q.celula)
      gl.uniform1f(locais.uMalhaX, q.malhaX)
      gl.uniform1f(locais.uDesloc, q.desloc)
      gl.uniform1f(locais.uAlturaHero, q.alturaHero)
      gl.uniform4f(locais.uLinha, ...q.linha)
      gl.uniform3f(locais.uTinta, ...q.tinta)
      gl.uniform3f(locais.uTexto, ...q.texto)
      gl.uniform3f(locais.uFundo, ...q.fundo)
      gl.uniform1f(locais.uEscuro, q.escuro ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },

    destruir() {
      // O contexto continua com o canvas (o React pode montar o componente de novo nele).
      gl.deleteProgram(programa)
      gl.deleteShader(vertice)
      gl.deleteShader(fragmento)
      locais = undefined
    },
  }
}
