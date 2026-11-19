import fonteCena from './cena.glsl?raw'
import comum from './comum.glsl?raw'
import fonteComposicao from './composicao.frag?raw'
import fonteDisco from './disco.frag?raw'
import fonteEntrada from './entrada.frag?raw'
import fonteGeodesicas from './geodesicas.frag?raw'
import fonteNevoa from './nevoa.frag?raw'
import fonteQueda from './queda.frag?raw'
import { INCLINACAO, SENTIDO, SUBIDA } from './trajeto.ts'

// Um triângulo que cobre a tela inteira, sem buffers: os vértices saem do gl_VertexID.
const fonteVertice = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

export type Rgb = readonly [number, number, number]
export type Rgba = readonly [number, number, number, number]

/** A entrada neste quadro (veja entrada.ts e entrada.frag). Medidas em px CSS. */
export interface Entrada {
  /** De 0 a 1: quanto a entrada já andou. */
  u: number
  /** O meio da tela, em volta do qual o site cresce e gira. */
  vistaX: number
  vistaY: number
  /** O tamanho do site (fração do normal) e quanto os riscos do túnel ainda torcem (rad). */
  escala: number
  torcao: number
  /** O raio da janela em volta do site. */
  janela: number
}

/** Tudo o que o desenho de um quadro precisa. Medidas em px CSS, relativas ao canvas. */
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
  /** De -1 a 1: positivo enquanto a página desce, negativo enquanto sobe. */
  atividade: number
  /** De 0 a 1: quanto já se mergulhou (0 fora do mergulho: sem a queda). */
  mergulho: number
  /** O comprimento dos rastros da queda, em fração da distância ao meio da tela. */
  rastro: number
  /** A entrada (a volta ao topo, por dentro do buraco negro), ou null fora dela. */
  entrada: Entrada | null
  linha: Rgba
  tinta: Rgb
  texto: Rgb
  fundo: Rgb
  escuro: boolean
}

export interface Renderizador {
  /** Os programas terminaram de compilar (a compilação pode ser em paralelo, fora da thread). */
  pronto(): boolean
  /** O shader não compilou neste aparelho: fica valendo a malha em CSS. */
  falhou(): boolean
  /**
   * Traça mais um trecho do mapa dos raios (veja geodesicas.frag). Devolve se o mapa ficou pronto:
   * antes disso não há o que desenhar.
   */
  tracar(): boolean
  mapaPronto(): boolean
  desenhar(quadro: Quadro): void
  destruir(): void
}

/** Onde o renderizador desenha: o canvas da página ou, num worker, o que ele recebeu dela. */
export type Tela = HTMLCanvasElement | OffscreenCanvas

/**
 * O trecho do plano da imagem que o mapa dos raios cobre, em rs em volta do centro (canto de baixo
 * à esquerda e tamanho, y para cima): tudo o que o disco e as imagens dele alcançam. Fora dele os
 * raios não encontram o disco (o shader nem os traça).
 */
const DOMINIO = [-11, -6.5, 22, 13] as const
/**
 * A inclinação da câmera com que o mapa é traçado: a do meio da página. Ao longo dela (e com o
 * ponteiro) a câmera sobe e desce um ou dois graus, e a imagem do disco se abre e se achata na
 * vertical junto (veja cena.glsl): bem mais barato que traçar o mapa de novo, e com tão pouca
 * diferença de ângulo não se vê a troca.
 */
const INCLINACAO_DO_MAPA = INCLINACAO + SUBIDA / 2
/** Em quantos quadros o mapa é traçado: cada um traça uma faixa dele, sem pesar no quadro. */
const TRECHOS = 8
/**
 * No mergulho, quanto a cena passa da tela de cada lado, em frações da meia diagonal dela: o que a
 * queda traz de perto da beira (veja queda.frag) já vem desenhado.
 */
const MARGEM_DA_QUEDA = 0.15

const UNIFORMS_GEODESICAS = ['uDominio', 'uTexels', 'uInclinacao', 'uSentido'] as const
const UNIFORMS_NEVOA = ['uCruzamento1'] as const
const UNIFORMS_DISCO = [
  'uCruzamento1',
  'uCruzamento2',
  'uDominio',
  'uTexels',
  'uCiclo',
  'uSentido',
  'uAlimento',
  'uAchatar',
  'uTinta',
  'uFundo',
  'uEscuro',
] as const
/** Os uniforms da cena (cena.glsl), que a composição e a entrada leem. */
const UNIFORMS_CENA = [
  'uResolucao',
  'uTamanho',
  'uCentro',
  'uRaio',
  'uTempo',
  'uAchatar',
  'uGiro',
  'uAtividade',
  'uCelula',
  'uMalhaX',
  'uDesloc',
  'uAlturaHero',
  'uLinha',
  'uTinta',
  'uTexto',
  'uFundo',
  'uEscuro',
  'uDominio',
  'uDisco',
  'uNevoa',
] as const
const UNIFORMS_COMPOSICAO = [...UNIFORMS_CENA, 'uMargem'] as const
const UNIFORMS_ENTRADA = [...UNIFORMS_CENA, 'uEntrada', 'uVista', 'uEscalaVista', 'uTorcao', 'uJanela'] as const
const UNIFORMS_QUEDA = [
  'uCena',
  'uMargem',
  'uResolucao',
  'uTamanho',
  'uCentro',
  'uRaio',
  'uMergulho',
  'uRastro',
  'uTempo',
  'uSentido',
  'uFundo',
  'uTinta',
  'uEscuro',
] as const

type Locais<T extends readonly string[]> = Record<T[number], WebGLUniformLocation | null>

interface Programa<T extends readonly string[]> {
  programa: WebGLProgram
  shaders: WebGLShader[]
  nomes: T
  locais?: Locais<T>
}

const PARTES: Record<string, string> = { comum, cena: fonteCena }

/** Põe as partes comuns no lugar de cada #include e tira os comentários, que têm acentos: o código do shader em si é só ASCII. */
function montarFonte(fonte: string): string {
  return fonte.replace(/#include "(\w+)"/g, (_, nome: string) => PARTES[nome] ?? '').replace(/\/\/.*$/gm, '')
}

/**
 * Cria o renderizador no canvas, ou devolve `null` se não houver WebGL 2 com aceleração de
 * hardware (nesse caso o site fica com a malha em CSS). `densidade` é a resolução do mapa dos raios,
 * em texels por rs.
 */
export function criarRenderizador(canvas: Tela, densidade: number): Renderizador | null {
  // (o OffscreenCanvas tem o mesmo getContext; a união dos dois tipos é que não tem)
  const gl = (canvas as HTMLCanvasElement).getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    // É enfeite: não vale acordar a placa de vídeo dedicada do notebook.
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  }) as WebGL2RenderingContext | null
  if (!gl) return null

  const paralelo = gl.getExtension('KHR_parallel_shader_compile')

  function compilar<T extends readonly string[]>(fonte: string, nomes: T): Programa<T> {
    const shaders = [
      [gl!.VERTEX_SHADER, fonteVertice],
      [gl!.FRAGMENT_SHADER, montarFonte(fonte)],
    ].map(([tipo, texto]) => {
      const shader = gl!.createShader(tipo as number)
      if (!shader) throw new Error('Não foi possível criar o shader.')
      gl!.shaderSource(shader, texto as string)
      gl!.compileShader(shader)
      return shader
    })
    const programa = gl!.createProgram()
    for (const shader of shaders) gl!.attachShader(programa, shader)
    gl!.linkProgram(programa)
    return { programa, shaders, nomes }
  }

  const programas = {
    geodesicas: compilar(fonteGeodesicas, UNIFORMS_GEODESICAS),
    nevoa: compilar(fonteNevoa, UNIFORMS_NEVOA),
    disco: compilar(fonteDisco, UNIFORMS_DISCO),
    composicao: compilar(fonteComposicao, UNIFORMS_COMPOSICAO),
    queda: compilar(fonteQueda, UNIFORMS_QUEDA),
    entrada: compilar(fonteEntrada, UNIFORMS_ENTRADA),
  }
  const todos = Object.values(programas) as Programa<readonly string[]>[]

  // O mapa (inteiros de 16 bits, lidos texel a texel), e o disco de cada quadro e a névoa, na
  // mesma resolução, lidos interpolados pelo desenho da tela.
  const largura = Math.max(2, Math.round(DOMINIO[2] * densidade))
  const altura = Math.max(2, Math.round(DOMINIO[3] * densidade))

  function textura(formato: number, filtro: number, w = largura, h = altura): WebGLTexture {
    const textura = gl!.createTexture()
    gl!.bindTexture(gl!.TEXTURE_2D, textura)
    gl!.texStorage2D(gl!.TEXTURE_2D, 1, formato, w, h)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filtro)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filtro)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    return textura
  }

  function quadroDe(...texturas: WebGLTexture[]): WebGLFramebuffer {
    const fb = gl!.createFramebuffer()
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb)
    texturas.forEach((t, i) => gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0 + i, gl!.TEXTURE_2D, t, 0))
    gl!.drawBuffers(texturas.map((_, i) => gl!.COLOR_ATTACHMENT0 + i))
    return fb
  }

  const cruzamento1 = textura(gl.RGBA16UI, gl.NEAREST)
  const cruzamento2 = textura(gl.RGBA16UI, gl.NEAREST)
  const nevoa = textura(gl.RGBA8, gl.LINEAR)
  const disco = textura(gl.RGBA8, gl.LINEAR)
  const quadroDoMapa = quadroDe(cruzamento1, cruzamento2)
  const quadroDaNevoa = quadroDe(nevoa)
  const quadroDoDisco = quadroDe(disco)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  /**
   * A cena do quadro, do tamanho do canvas, para a queda distorcer (veja queda.frag). Criada na
   * primeira vez que se mergulha, e refeita quando o canvas muda de tamanho.
   */
  let cenaDoMergulho: { textura: WebGLTexture; quadro: WebGLFramebuffer; w: number; h: number } | null = null

  function soltarCenaDoMergulho() {
    if (!cenaDoMergulho) return
    gl!.deleteTexture(cenaDoMergulho.textura)
    gl!.deleteFramebuffer(cenaDoMergulho.quadro)
    cenaDoMergulho = null
  }

  function obterCenaDoMergulho(w: number, h: number) {
    if (cenaDoMergulho?.w !== w || cenaDoMergulho.h !== h) {
      soltarCenaDoMergulho()
      const t = textura(gl!.RGBA8, gl!.LINEAR, w, h)
      // a queda às vezes lê um pouco além da beira da tela: ali vale o espelho do que está dentro
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.MIRRORED_REPEAT)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.MIRRORED_REPEAT)
      cenaDoMergulho = { textura: t, quadro: quadroDe(t), w, h }
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
    }
    return cenaDoMergulho
  }

  let erro = false
  let compilado = false
  /**
   * Quantos passos da preparação já foram dados: as faixas do mapa (TRECHOS), a névoa, e o
   * aquecimento dos programas de cada quadro (veja tracar).
   */
  let tracadas = 0

  const pronto = (): boolean => {
    if (compilado) return true
    if (erro) return false
    if (paralelo && todos.some(({ programa }) => !gl.getProgramParameter(programa, paralelo.COMPLETION_STATUS_KHR))) return false

    const ruim = todos.find(({ programa }) => !gl.getProgramParameter(programa, gl.LINK_STATUS))
    if (ruim) {
      erro = true
      if (import.meta.env.DEV) {
        const [vertice, fragmento] = ruim.shaders
        console.error(
          '[buraco negro]',
          (fragmento && gl.getShaderInfoLog(fragmento)) || (vertice && gl.getShaderInfoLog(vertice)) || gl.getProgramInfoLog(ruim.programa),
        )
      }
      return false
    }
    for (const p of todos) {
      p.locais = Object.fromEntries(p.nomes.map((nome) => [nome, gl.getUniformLocation(p.programa, nome)])) as Locais<typeof p.nomes>
    }
    compilado = true
    return true
  }

  const mapaPronto = () => tracadas > TRECHOS + 1

  /** Liga o programa e devolve os locais dos uniforms dele. */
  const usar = <T extends readonly string[]>(p: Programa<T>): Locais<T> => {
    gl.useProgram(p.programa)
    return p.locais!
  }

  /**
   * O retângulo do mapa (em texels) que aparece na tela neste quadro, com uma margem, ou null. Em
   * px CSS da cena, a tela vai de (x0, y0) a (x1, y1).
   */
  function trechoVisivel(q: Quadro, achatar: number, [x0, y0, x1, y1]: readonly number[]): [number, number, number, number] | null {
    const pxPorRs = q.raio / 2.5980762
    const cg = Math.cos(q.giro)
    const sg = Math.sin(q.giro)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [px, py] of [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ] as const) {
      const bx = (px - q.centroX) / pxPorRs
      const by = -(py - q.centroY) / pxPorRs
      const x = ((cg * bx - sg * by - DOMINIO[0]) / DOMINIO[2]) * largura
      const y = (((sg * bx + cg * by) * achatar - DOMINIO[1]) / DOMINIO[3]) * altura
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    // dois texels a mais de cada lado: a leitura interpolada pega os vizinhos
    const esquerda = Math.max(0, Math.floor(minX) - 2)
    const baixo = Math.max(0, Math.floor(minY) - 2)
    const direita = Math.min(largura, Math.ceil(maxX) + 2)
    const cima = Math.min(altura, Math.ceil(maxY) + 2)
    return direita > esquerda && cima > baixo ? [esquerda, baixo, direita - esquerda, cima - baixo] : null
  }

  /** Os uniforms da cena (cena.glsl), num programa que a lê. */
  const definirCena = (u: Locais<typeof UNIFORMS_CENA>, q: Quadro, achatar: number, w: number, h: number) => {
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, disco)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, nevoa)
    gl.uniform1i(u.uDisco, 2)
    gl.uniform1i(u.uNevoa, 3)
    gl.uniform4f(u.uDominio, ...DOMINIO)
    gl.uniform2f(u.uResolucao, w, h)
    gl.uniform2f(u.uTamanho, q.largura, q.altura)
    gl.uniform2f(u.uCentro, q.centroX, q.centroY)
    gl.uniform1f(u.uRaio, q.raio)
    gl.uniform1f(u.uTempo, q.tempo)
    gl.uniform1f(u.uAchatar, achatar)
    gl.uniform1f(u.uGiro, q.giro)
    gl.uniform1f(u.uAtividade, q.atividade)
    gl.uniform1f(u.uCelula, q.celula)
    gl.uniform1f(u.uMalhaX, q.malhaX)
    gl.uniform1f(u.uDesloc, q.desloc)
    gl.uniform1f(u.uAlturaHero, q.alturaHero)
    gl.uniform4f(u.uLinha, ...q.linha)
    gl.uniform3f(u.uTinta, ...q.tinta)
    gl.uniform3f(u.uTexto, ...q.texto)
    gl.uniform3f(u.uFundo, ...q.fundo)
    gl.uniform1f(u.uEscuro, q.escuro ? 1 : 0)
  }

  return {
    pronto,

    falhou: () => erro,

    mapaPronto,

    tracar() {
      if (!pronto()) return false
      if (mapaPronto()) return true
      gl.viewport(0, 0, largura, altura)
      if (tracadas < TRECHOS) {
        // uma faixa do mapa por vez
        const de = Math.floor((tracadas * altura) / TRECHOS)
        const ate = Math.floor(((tracadas + 1) * altura) / TRECHOS)
        gl.bindFramebuffer(gl.FRAMEBUFFER, quadroDoMapa)
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(0, de, largura, ate - de)
        const u = usar(programas.geodesicas)
        gl.uniform4f(u.uDominio, ...DOMINIO)
        gl.uniform2f(u.uTexels, largura, altura)
        gl.uniform1f(u.uInclinacao, INCLINACAO_DO_MAPA)
        gl.uniform1f(u.uSentido, SENTIDO)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.disable(gl.SCISSOR_TEST)
      } else if (tracadas === TRECHOS) {
        // a névoa passa para uma textura que o desenho lê interpolada
        gl.bindFramebuffer(gl.FRAMEBUFFER, quadroDaNevoa)
        const u = usar(programas.nevoa)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, cruzamento1)
        gl.uniform1i(u.uCruzamento1, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      } else {
        // Os programas de cada quadro desenham uma vez, num pixel só da tela (que ainda não aparece):
        // a placa de vídeo termina de prepará-los agora, e não no primeiro quadro em que cada um entra
        // (a queda e a entrada só entram lá no fim da página, e esse quadro travava).
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, 1, 1)
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(0, 0, 1, 1)
        const unidades = [cruzamento1, cruzamento2, disco, nevoa, nevoa]
        unidades.forEach((t, i) => {
          gl.activeTexture(gl.TEXTURE0 + i)
          gl.bindTexture(gl.TEXTURE_2D, t)
        })
        const aquecer = <T extends readonly string[]>(p: Programa<T>, amostras: Partial<Record<T[number], number>>) => {
          const u = usar(p)
          for (const [nome, unidade] of Object.entries(amostras) as [T[number], number][]) gl.uniform1i(u[nome], unidade)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        aquecer(programas.disco, { uCruzamento1: 0, uCruzamento2: 1 })
        aquecer(programas.composicao, { uDisco: 2, uNevoa: 3 })
        aquecer(programas.entrada, { uDisco: 2, uNevoa: 3 })
        aquecer(programas.queda, { uCena: 4 })
        gl.disable(gl.SCISSOR_TEST)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      tracadas++
      return mapaPronto()
    },

    desenhar(q) {
      if (!mapaPronto()) return
      const achatar = Math.sin(INCLINACAO_DO_MAPA) / Math.sin(q.inclinacao)
      const w = canvas.width
      const h = canvas.height
      const s = q.entrada
      // no mergulho, a cena passa um pouco da tela de cada lado (px CSS)
      const margem = !s && q.mergulho > 0 ? Math.round(MARGEM_DA_QUEDA * Math.hypot(q.largura / 2, q.altura / 2)) : 0

      // 1. O disco deste quadro, no trecho do mapa que aparece. Na entrada, a cena aparece pela janela,
      // reduzida: o que se vê dela é o círculo da janela, desfeito o tamanho.
      const raioVisto = s ? s.janela / s.escala + 2 : 0
      const tela = s
        ? [s.vistaX - raioVisto, s.vistaY - raioVisto, s.vistaX + raioVisto, s.vistaY + raioVisto]
        : [-margem, -margem, q.largura + margem, q.altura + margem]
      const visivel = trechoVisivel(q, achatar, tela)
      if (visivel) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, quadroDoDisco)
        gl.viewport(0, 0, largura, altura)
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(...visivel)
        const u = usar(programas.disco)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, cruzamento1)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, cruzamento2)
        gl.uniform1i(u.uCruzamento1, 0)
        gl.uniform1i(u.uCruzamento2, 1)
        gl.uniform4f(u.uDominio, ...DOMINIO)
        gl.uniform2f(u.uTexels, largura, altura)
        gl.uniform1f(u.uCiclo, q.ciclo)
        gl.uniform1f(u.uSentido, q.sentido)
        gl.uniform1f(u.uAlimento, 1 + 0.2 * Math.max(q.atividade, 0))
        gl.uniform1f(u.uAchatar, achatar)
        gl.uniform3f(u.uTinta, ...q.tinta)
        gl.uniform3f(u.uFundo, ...q.fundo)
        gl.uniform1f(u.uEscuro, q.escuro ? 1 : 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.disable(gl.SCISSOR_TEST)
      }

      // 2a. Na entrada: a cena pela janela, e o túnel em volta dela.
      if (s) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, w, h)
        const u = usar(programas.entrada)
        definirCena(u, q, achatar, w, h)
        gl.uniform1f(u.uEntrada, s.u)
        gl.uniform2f(u.uVista, s.vistaX, s.vistaY)
        gl.uniform1f(u.uEscalaVista, s.escala)
        gl.uniform1f(u.uTorcao, s.torcao)
        gl.uniform1f(u.uJanela, s.janela)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        return
      }

      // 2b. Fora do mergulho: a cena, como ela é.
      if (q.mergulho <= 0) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, w, h)
        const u = usar(programas.composicao)
        definirCena(u, q, achatar, w, h)
        gl.uniform2f(u.uMargem, 0, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        return
      }

      // 2c. No mergulho: a cena numa textura um pouco maior que a tela, e a queda, que a distorce, na tela.
      const pixelsDaMargem = Math.round(margem * (w / q.largura))
      const cenaDaQueda = obterCenaDoMergulho(w + 2 * pixelsDaMargem, h + 2 * pixelsDaMargem)
      // (a margem em px CSS, medida de volta nos pixels inteiros da textura)
      const margemX = pixelsDaMargem / (w / q.largura)
      const margemY = pixelsDaMargem / (h / q.altura)
      gl.bindFramebuffer(gl.FRAMEBUFFER, cenaDaQueda.quadro)
      gl.viewport(0, 0, cenaDaQueda.w, cenaDaQueda.h)
      const uc = usar(programas.composicao)
      definirCena(uc, q, achatar, cenaDaQueda.w, cenaDaQueda.h)
      gl.uniform2f(uc.uMargem, margemX, margemY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      const u = usar(programas.queda)
      gl.activeTexture(gl.TEXTURE4)
      gl.bindTexture(gl.TEXTURE_2D, cenaDaQueda.textura)
      gl.uniform1i(u.uCena, 4)
      gl.uniform2f(u.uMargem, margemX, margemY)
      gl.uniform2f(u.uResolucao, w, h)
      gl.uniform2f(u.uTamanho, q.largura, q.altura)
      gl.uniform2f(u.uCentro, q.centroX, q.centroY)
      gl.uniform1f(u.uRaio, q.raio)
      gl.uniform1f(u.uMergulho, q.mergulho)
      gl.uniform1f(u.uRastro, q.rastro)
      gl.uniform1f(u.uTempo, q.tempo)
      gl.uniform1f(u.uSentido, q.sentido)
      gl.uniform3f(u.uFundo, ...q.fundo)
      gl.uniform3f(u.uTinta, ...q.tinta)
      gl.uniform1f(u.uEscuro, q.escuro ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },

    destruir() {
      for (const p of todos) {
        gl.deleteProgram(p.programa)
        for (const shader of p.shaders) gl.deleteShader(shader)
      }
      for (const t of [cruzamento1, cruzamento2, nevoa, disco]) gl.deleteTexture(t)
      for (const f of [quadroDoMapa, quadroDaNevoa, quadroDoDisco]) gl.deleteFramebuffer(f)
      soltarCenaDoMergulho()
      tracadas = 0
      compilado = false
    },
  }
}
