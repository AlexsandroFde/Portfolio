// As fotos dos blocos: a imagem de cada bloco da página, desenhada uma vez, de onde as fatias da
// absorção tiram o seu pedaço (veja absorcao.ts). Antes cada fatia tinha uma cópia viva do bloco
// inteiro, um clone de tudo o que há nele, e cada fatia nova custava estilo, layout e pintura no
// meio da rolagem. A foto é feita antes, longe da faixa, quando a página está parada ou sobra
// tempo entre os quadros; dali em diante cada fatia é só um retângulo com um pedaço dela.
//
// A foto sai de um SVG com o clone do bloco dentro de um foreignObject, com as regras de estilo da
// página (as fontes e as imagens embutidas: um SVG usado como imagem não busca nada fora dele) e da
// largura da janela, para as media queries e as unidades vw valerem o mesmo que na página. O
// navegador desenha esse SVG numa tela, na resolução da tela e alinhado aos pixels dela como o
// original, e a tela vira um PNG: decodificado uma vez, ele serve a todas as fatias do bloco.
//
// Uma imagem não tem mouse em cima: os elementos em que o mouse está são marcados no clone, e as
// regras com :hover passam a valer para a marca. As animações e as transições ficam paradas no fim.

/** O bloco e tudo dentro dele, na ordem do documento: a mesma no original e nos clones. */
export function elementosDe(raiz: Element): Element[] {
  return [raiz, ...raiz.querySelectorAll('*')]
}

/**
 * O retângulo da foto de um bloco em `x`, `y` (px CSS da página), de `largura` x `altura`: o menor
 * em pixels inteiros da tela que o contém. É também a grade das fatias.
 */
export function enquadrar(x: number, y: number, largura: number, altura: number, dpr: number) {
  const x0 = Math.floor(x * dpr + 1e-6)
  const y0 = Math.floor(y * dpr + 1e-6)
  const x1 = Math.max(x0 + 1, Math.ceil((x + largura) * dpr - 1e-6))
  const y1 = Math.max(y0 + 1, Math.ceil((y + altura) * dpr - 1e-6))
  return {
    /** O canto de cima à esquerda (px CSS, em pixels inteiros da tela). */
    esquerda: x0 / dpr,
    topo: y0 / dpr,
    /** O tamanho (px CSS, em pixels inteiros da tela). */
    largura: (x1 - x0) / dpr,
    altura: (y1 - y0) / dpr,
    /** Onde o bloco cai dentro dos pixels: duas fotos com a mesma fase têm os mesmos pixels. */
    fase: `${(x * dpr - x0).toFixed(3)} ${(y * dpr - y0).toFixed(3)} ${x1 - x0} ${y1 - y0} ${dpr}`,
  }
}

/** O que fotografar. */
export interface Pedido {
  elemento: HTMLElement
  /** A posição do bloco na página e o tamanho (px CSS, sem a translação da entrada). */
  x: number
  y: number
  largura: number
  altura: number
  dpr: number
  /**
   * Os elementos que ficam na frente dos vídeos, pela posição (veja elementosDe): ficam fora da
   * foto e vão para uma foto só deles, que as telas dos vídeos desenham por cima de cada quadro.
   */
  frente: number[]
  /**
   * Os elementos que se animam sem parar (o ponto que pulsa ao lado do status), pela posição: ficam
   * fora das duas fotos, e as fatias os mostram vivos (veja Vivo, em absorcao.ts).
   */
  vivos: number[]
  /**
   * O elemento mais fundo do bloco com o mouse em cima, ou null: ele e os ancestrais dele ficam com
   * as regras de :hover valendo na foto. É o estado do mouse quando a foto foi pedida, e não o da
   * hora em que ela sai: a foto fica guardada com ele (veja variantes, em absorcao.ts).
   */
  mouse: Element | null
  /** Quais fotos fazer. */
  foto: boolean
  fotoDaFrente: boolean
  /** Ela é para já (as fatias estão para aparecer): não espera a página ficar ociosa. */
  urgente(): boolean
}

/**
 * Uma foto pronta. O enquadramento é o de `enquadrar`: a imagem cobre exatamente esse retângulo,
 * um pixel dela para cada pixel da tela.
 */
export interface Foto {
  /** A imagem, para o background-image das fatias. */
  url: string
  /** A fase do enquadramento em que ela foi feita (veja enquadrar). */
  fase: string
}

export interface Fotos {
  foto: Foto | null
  /** O que fica na frente dos vídeos, sozinho, nos pixels do enquadramento. */
  frente: HTMLCanvasElement | null
}

/**
 * O que o bloco herda dos ancestrais e muda o desenho do texto: o clone fica fora da página e
 * recebe isso de volta.
 */
const HERDADOS = [
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant-ligatures',
  'font-variant-caps',
  'font-variant-numeric',
  'font-variant-east-asian',
  'font-feature-settings',
  'font-variation-settings',
  'font-kerning',
  'font-optical-sizing',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-transform',
  'text-indent',
  'text-shadow',
  'text-rendering',
  'text-wrap-mode',
  'text-wrap-style',
  'white-space-collapse',
  'word-break',
  'overflow-wrap',
  'hyphens',
  'line-break',
  'tab-size',
  'list-style-type',
  'list-style-position',
  'direction',
  'writing-mode',
  'visibility',
  '-webkit-font-smoothing',
  'text-underline-offset',
  'text-decoration-skip-ink',
]

/** A marca do mouse em cima, no clone (veja montarEstilo). */
const MOUSE = 'data-foto-mouse'

const temOcioso = typeof window !== 'undefined' && 'requestIdleCallback' in window

/** As imagens e fontes já lidas, como data: URL, pelo endereço. */
const dados = new Map<string, Promise<string>>()

function comoDado(url: string): Promise<string> {
  let dado = dados.get(url)
  if (!dado) {
    dado = fetch(url)
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`${resposta.status} ${url}`)
        return resposta.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolver, rejeitar) => {
            const leitor = new FileReader()
            leitor.onload = () => resolver(String(leitor.result))
            leitor.onerror = () => rejeitar(leitor.error)
            leitor.readAsDataURL(blob)
          }),
      )
    dados.set(url, dado)
    dado.catch(() => dados.delete(url))
  }
  return dado
}

/** As regras de estilo da página para as fotos, montadas uma vez (e de novo se a página mudar). */
let estilo: { chave: string; texto: Promise<string> } | null = null

/**
 * Muda quando a página ganha ou perde folhas e regras (o Vite troca as folhas durante o
 * desenvolvimento) e quando muda o que as media queries e as unidades da janela consultam.
 */
function chaveDoEstilo(): string {
  let chave = `${document.documentElement.clientWidth}x${window.innerHeight} ${document.styleSheets.length}`
  for (const folha of document.styleSheets) {
    try {
      chave += `,${folha.cssRules.length}`
    } catch {
      chave += ',x'
    }
  }
  for (const consulta of ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)', '(hover: hover)', '(pointer: fine)']) {
    chave += window.matchMedia(consulta).matches ? '1' : '0'
  }
  return chave
}

const UNIDADES_DA_JANELA = /(-?(?:\d+\.?\d*|\.\d+))(dvw|svw|lvw|vw|dvh|svh|lvh|vh|vmin|vmax)\b/g

/**
 * As unidades da janela (vw, vh...) em px da página: dentro do SVG elas seriam medidas na janela
 * dele, o tamanho da foto.
 */
function semUnidadesDaJanela(valores: string): string {
  if (!/v(w|h|min|max)\b/.test(valores)) return valores
  const largura = document.documentElement.clientWidth || window.innerWidth
  const altura = window.innerHeight
  return valores.replace(UNIDADES_DA_JANELA, (_, numero: string, unidade: string) => {
    const base = unidade.endsWith('w') ? largura : unidade.endsWith('h') ? altura : unidade === 'vmin' ? Math.min(largura, altura) : Math.max(largura, altura)
    return `${(Number(numero) * base) / 100}px`
  })
}

/**
 * Uma regra de estilo como texto para o SVG. As media queries são resolvidas aqui, na página (a do
 * SVG mediria o tamanho da foto, e não o da janela): as que valem saem sem a condição, e as outras
 * nem saem. O mouse em cima vira a marca no clone.
 */
function serializar(regra: CSSRule): string {
  if (regra instanceof CSSMediaRule) return window.matchMedia(regra.media.mediaText).matches ? serializarTodas(regra.cssRules) : ''
  if (regra instanceof CSSStyleRule) {
    const seletor = regra.selectorText.replaceAll(':hover', `[${MOUSE}]`)
    return `${seletor}{${semUnidadesDaJanela(regra.style.cssText)}${serializarTodas(regra.cssRules)}}`
  }
  if (typeof CSSNestedDeclarations !== 'undefined' && regra instanceof CSSNestedDeclarations) return semUnidadesDaJanela(regra.style.cssText)
  if (regra instanceof CSSLayerBlockRule) return `@layer ${regra.name}{${serializarTodas(regra.cssRules)}}`
  if (regra instanceof CSSSupportsRule) return `@supports ${regra.conditionText}{${serializarTodas(regra.cssRules)}}`
  return regra.cssText
}

function serializarTodas(regras: CSSRuleList): string {
  let texto = ''
  for (const regra of regras) texto += serializar(regra)
  return texto
}

async function montarEstilo(): Promise<string> {
  let css = ''
  for (const folha of [...document.styleSheets]) {
    if (folha.disabled) continue
    const media = folha.media.mediaText
    if (media && !window.matchMedia(media).matches) continue
    let regras: CSSRuleList
    try {
      regras = folha.cssRules
    } catch {
      // uma folha de outra origem não pode ser lida: fica de fora
      continue
    }
    const base = folha.href ?? document.baseURI
    let texto = serializarTodas(regras)
    // fontes e imagens vão embutidas (sem a fonte, o SVG usaria a do sistema)
    const urls = new Set(
      [...texto.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1] ?? '').filter((u) => u && !u.startsWith('data:')),
    )
    for (const url of urls) {
      try {
        texto = texto.split(url).join(await comoDado(new URL(url, base).href))
      } catch {
        // sem ela, fica a do sistema
      }
    }
    css += texto
  }
  css += '*,*::before,*::after{animation:none!important;transition:none!important}'
  return css.split(']]>').join(']] >')
}

function obterEstilo(): Promise<string> {
  const chave = chaveDoEstilo()
  if (!estilo || estilo.chave !== chave) {
    const texto = montarEstilo()
    estilo = { chave, texto }
    texto.catch(() => {
      if (estilo?.texto === texto) estilo = null
    })
  }
  return estilo.texto
}

/** O endereço da imagem que o <img> mostra, ou mostraria (um lazy que ainda não carregou). */
async function fonteDaImagem(imagem: HTMLImageElement): Promise<string> {
  if (imagem.currentSrc) return imagem.currentSrc
  if (!imagem.srcset) return imagem.src
  const sonda = new Image()
  sonda.sizes = imagem.sizes
  sonda.srcset = imagem.srcset
  if (imagem.getAttribute('src')) sonda.src = imagem.src
  try {
    await sonda.decode()
  } catch {
    // sem imagem, fica o fundo
  }
  return sonda.currentSrc || imagem.src
}

/**
 * Espera a vez de desenhar: um tempo ocioso da página, se a foto não for urgente (desenhar o SVG
 * leva alguns ms, e no meio de um quadro de rolagem atrasaria o quadro).
 */
function vez(urgente: boolean): Promise<void> {
  return new Promise((resolver) => {
    if (urgente || !temOcioso) setTimeout(resolver, 0)
    else requestIdleCallback(() => resolver(), { timeout: 400 })
  })
}

/**
 * O SVG com o clone do bloco, no modo pedido: o bloco sem a frente dos vídeos, ou só a frente. O
 * SVG tem o tamanho da foto em pixels da tela, e o clone, o zoom da tela: é assim que o navegador
 * desenha a página numa tela de alta densidade (com as bordas e o texto nos mesmos pixels). Um SVG
 * em px CSS esticado na hora de desenhar sairia borrado.
 */
async function montarSvg(pedido: Pedido, modo: 'foto' | 'frente', css: string): Promise<string> {
  const { elemento, x, y, largura, altura, dpr, frente, vivos, mouse } = pedido
  const quadro = enquadrar(x, y, largura, altura, dpr)
  const w = Math.round(quadro.largura * dpr)
  const h = Math.round(quadro.altura * dpr)
  const originais = elementosDe(elemento)
  const clone = elemento.cloneNode(true) as HTMLElement
  const copias = elementosDe(clone)
  originais.forEach((original, i) => {
    const copia = copias[i]
    if (!copia) return
    if (mouse && original.contains(mouse)) copia.setAttribute(MOUSE, '')
    // sem ids repetidos e sem as animações de entrada
    copia.removeAttribute('id')
    copia.removeAttribute('data-reveal')
    copia.removeAttribute('data-revealed')
    copia.classList.remove('enter')
  })
  // (o estilo no original é o deste efeito e o da entrada)
  clone.removeAttribute('style')
  const computado = getComputedStyle(elemento)
  for (const propriedade of HERDADOS) {
    const valor = computado.getPropertyValue(propriedade)
    if (valor) clone.style.setProperty(propriedade, valor)
  }
  // Na mesma fração de pixel da tela que o original: o texto cai nos mesmos pixels. (Com o zoom,
  // as medidas do clone são multiplicadas por ele.)
  Object.assign(clone.style, {
    zoom: String(dpr),
    position: 'absolute',
    left: `${x - quadro.esquerda}px`,
    top: `${y - quadro.topo}px`,
    width: `${largura}px`,
    height: `${altura}px`,
    margin: '0',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
  })
  // a frente dos vídeos fica numa foto à parte, desenhada por cima de cada quadro deles
  if (modo === 'frente') clone.style.visibility = 'hidden'
  for (const i of frente) (copias[i] as (Element & ElementCSSInlineStyle) | undefined)?.style.setProperty('visibility', modo === 'frente' ? 'visible' : 'hidden')
  // o que se anima sem parar fica fora das duas (as fatias o mostram vivo)
  for (const i of vivos) (copias[i] as (Element & ElementCSSInlineStyle) | undefined)?.style.setProperty('visibility', 'hidden')

  // Imagens: embutidas, na versão que a página mostra (ou mostraria).
  const imagens = [...elemento.querySelectorAll('img')]
  const copiasDasImagens = [...clone.querySelectorAll('img')]
  await Promise.all(
    imagens.map(async (imagem, i) => {
      const copia = copiasDasImagens[i]
      if (!copia) return
      for (const atributo of ['srcset', 'sizes', 'loading', 'decoding']) copia.removeAttribute(atributo)
      try {
        copia.setAttribute('src', await comoDado(await fonteDaImagem(imagem)))
      } catch {
        copia.removeAttribute('src')
      }
    }),
  )
  // Vídeos: um espaço vazio do mesmo tamanho (o pôster continua atrás); os quadros vão nas telas
  // das fatias. O <source> passa para o espaço: a ordem dos elementos continua a do original.
  const videos = [...elemento.querySelectorAll('video')]
  ;[...clone.querySelectorAll('video')].forEach((copia, i) => {
    const caixa = videos[i]?.getBoundingClientRect()
    const espaco = document.createElement('div')
    espaco.className = copia.className
    espaco.style.cssText = `position:relative;width:${caixa?.width ?? 0}px;height:${caixa?.height ?? 0}px`
    espaco.append(...copia.childNodes)
    copia.replaceWith(espaco)
  })

  const raiz = document.documentElement
  const fundo = document.createElement('div')
  // o tema (a classe dark) e o idioma vêm da raiz da página
  for (const { name, value } of raiz.attributes) if (name !== 'style' && name !== 'id') fundo.setAttribute(name, value)
  fundo.style.cssText = `position:relative;width:${w}px;height:${h}px;margin:0;padding:0;overflow:hidden`
  fundo.append(clone)
  const corpo = new XMLSerializer().serializeToString(fundo)
  const fonte = getComputedStyle(raiz).fontSize
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="font-size:${fonte}">` +
    `<style><![CDATA[${css}]]></style>` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">${corpo}</foreignObject></svg>`
  )
}

async function carregar(svg: string): Promise<HTMLImageElement> {
  const imagem = new Image()
  // Como data: URL, e não blob: (o Chrome não deixa ler a tela em que se desenhou um SVG com
  // foreignObject vindo de um blob).
  imagem.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await imagem.decode()
  return imagem
}

function paraBlob(tela: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rejeitar) => {
    try {
      tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('toBlob'))), 'image/png')
    } catch (erro) {
      rejeitar(erro)
    }
  })
}

/** Decodifica a imagem antes de ela aparecer nas fatias (sem isso, a primeira fatia podia sair vazia). */
async function decodificar(url: string) {
  const imagem = new Image()
  imagem.src = url
  try {
    await imagem.decode()
  } catch {
    // aparece quando der
  }
}

/** Faz as fotos pedidas do bloco. */
export async function fotografar(pedido: Pedido): Promise<Fotos> {
  const css = await obterEstilo()
  const { x, y, largura, altura, dpr } = pedido
  const quadro = enquadrar(x, y, largura, altura, dpr)
  const w = Math.round(quadro.largura * dpr)
  const h = Math.round(quadro.altura * dpr)
  const resultado: Fotos = { foto: null, frente: null }

  if (pedido.foto) {
    const imagem = await carregar(await montarSvg(pedido, 'foto', css))
    await vez(pedido.urgente())
    const tela = document.createElement('canvas')
    tela.width = w
    tela.height = h
    // na memória, e não na placa de vídeo: o PNG sai dos pixels, e lê-los da placa faria esperar
    const contexto = tela.getContext('2d', { willReadFrequently: true })
    if (!contexto) throw new Error('sem contexto 2d')
    contexto.drawImage(imagem, 0, 0)
    let url: string
    try {
      url = URL.createObjectURL(await paraBlob(tela))
      await decodificar(url)
    } catch {
      // Onde a tela fica bloqueada depois de receber o SVG (no Safari), o próprio SVG vai de fundo.
      url = imagem.src
    }
    tela.width = 0
    tela.height = 0
    resultado.foto = { url, fase: quadro.fase }
  }

  if (pedido.fotoDaFrente && pedido.frente.length) {
    const imagem = await carregar(await montarSvg(pedido, 'frente', css))
    await vez(pedido.urgente())
    // Esta fica na placa de vídeo: só é desenhada nas telas dos vídeos, nunca lida.
    const tela = document.createElement('canvas')
    tela.width = w
    tela.height = h
    tela.getContext('2d')?.drawImage(imagem, 0, 0)
    resultado.frente = tela
  }
  return resultado
}

/** Solta a imagem de uma foto que não é mais usada. */
export function soltarFoto(foto: Foto | null) {
  if (foto?.url.startsWith('blob:')) URL.revokeObjectURL(foto.url)
}
