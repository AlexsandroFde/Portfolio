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

import { caracteres, fontes as versoesDasFontes } from 'virtual:fontes-das-fotos'

/**
 * O anel do progresso de um vídeo (o do botão de pausa, veja ProjectVideo.tsx): ele anda com o vídeo,
 * e numa foto ficaria parado. Fica fora das fotos, e as telas dos vídeos o desenham a cada quadro
 * (veja Anel, em pintor.ts).
 */
export const ANEL = '[data-anel]'

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

/**
 * Uma regra da página, pronta para as fotos: o texto dela e para que elementos ela pode valer. Cada
 * foto leva só as que podem valer no bloco dela (veja estiloPara), e não as regras do site inteiro:
 * o navegador lê de novo o CSS de cada foto, e com o CSS todo (uns 50 kB, mais as fontes) ler o SVG
 * era a maior parte do custo dela. Num aparelho lento, as fotos do começo ocupavam a página por
 * segundos.
 */
type RegraDaFoto =
  /** Uma regra comum: entra se o elemento em que ela vale pode estar no bloco (veja exigencias). */
  | { tipo: 'regra'; texto: string; exige: Exigencia[] | null }
  /** Uma fonte: entra se o bloco a usa (veja versaoDaFonte). */
  | FonteDaFoto
  /** Um grupo (@layer, @supports), com as regras de dentro. */
  | { tipo: 'grupo'; abre: string; regras: RegraDaFoto[]; camada: boolean }

/**
 * Uma regra @font-face, com as versões menores da fonte dela, se houver (veja
 * scripts/fontesDasFotos.ts): cada kB de fonte no SVG custa tempo a cada foto, mesmo o de uma fonte
 * que o bloco nem usa.
 */
interface FonteDaFoto {
  tipo: 'fonte'
  /** A regra com a fonte inteira. */
  texto: string
  familia: string
  /** A regra com a fonte reduzida: só os caracteres do site, e igual à inteira em qualquer peso. */
  reduzida: { texto: string } | null
  /** A regra com a reduzida fixada num peso (o padrão da fonte): igual à inteira só nele. */
  estatica: { texto: string; peso: string } | null
}

/** O que o elemento de um seletor precisa ter para a regra valer nele: as classes e o tipo (a tag), se houver. */
interface Exigencia {
  classes: string[]
  tipo: string | null
}

/** O registro de uma propriedade (@property): entra se alguma regra que entrou na foto a usa. */
interface Registro {
  nome: string
  texto: string
}

/** O estilo da página para as fotos. */
interface EstiloDasFotos {
  regras: RegraDaFoto[]
  /** Os registros das propriedades. */
  registros: Registro[]
  /**
   * As exigências das regras que mudam a fonte de um pseudo-elemento: se uma delas entra na foto, o
   * texto do bloco pode estar numa fonte ou num peso que os elementos dele não mostram (veja estiloPara).
   */
  pseudos: (Exigencia[] | null)[]
}

/** O estilo da página para as fotos, montado uma vez (e de novo se a página mudar). */
let estilo: { chave: string; pronto: Promise<EstiloDasFotos> } | null = null

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

/** O nome de uma família de fonte, sem aspas e em minúsculas, para comparar. */
const nomeDaFamilia = (nome: string) => nome.trim().replace(/^["']|["']$/g, '').toLowerCase()

/**
 * As regras de uma folha (de endereço `base`) como as fotos as usam (veja RegraDaFoto), com as media
 * queries resolvidas como em serializar. Os registros das propriedades e as regras de pseudo-elementos
 * que mudam a fonte vão para `estilo`.
 */
function paraFotos(regras: CSSRuleList, estilo: EstiloDasFotos, base: string): RegraDaFoto[] {
  const lista: RegraDaFoto[] = []
  for (const regra of regras) {
    if (regra instanceof CSSMediaRule) {
      if (window.matchMedia(regra.media.mediaText).matches) lista.push(...paraFotos(regra.cssRules, estilo, base))
    } else if (regra instanceof CSSStyleRule) {
      const exige = exigencias(regra.selectorText)
      lista.push({ tipo: 'regra', texto: serializar(regra), exige })
      if (mudaAFonteDeUmPseudo(regra)) estilo.pseudos.push(exige)
    } else if (regra instanceof CSSLayerBlockRule) {
      lista.push({ tipo: 'grupo', abre: `@layer ${regra.name}{`, regras: paraFotos(regra.cssRules, estilo, base), camada: true })
    } else if (regra instanceof CSSSupportsRule) {
      // o SVG é desenhado por este mesmo navegador: o que não vale aqui também não vale lá
      if (CSS.supports(regra.conditionText)) {
        lista.push({ tipo: 'grupo', abre: `@supports ${regra.conditionText}{`, regras: paraFotos(regra.cssRules, estilo, base), camada: false })
      }
    } else if (regra instanceof CSSPropertyRule) {
      estilo.registros.push({ nome: regra.name, texto: regra.cssText })
    } else if (regra instanceof CSSFontFaceRule) {
      lista.push(fonteDaFoto(regra, base))
    } else if (!(regra instanceof CSSKeyframesRule)) {
      // (os quadros-chave ficam de fora: as animações ficam paradas nas fotos, veja PARADAS)
      lista.push({ tipo: 'regra', texto: serializar(regra), exige: null })
    }
  }
  return lista
}

/** As versões menores de cada fonte, pelo endereço da inteira (montado na primeira foto). */
let versoes: Map<string, (typeof versoesDasFontes)[number]> | undefined

/** Uma regra @font-face (de uma folha de endereço `base`) para as fotos, com as versões menores da fonte. */
function fonteDaFoto(regra: CSSFontFaceRule, base: string): FonteDaFoto {
  const texto = regra.cssText
  const fonte: FonteDaFoto = { tipo: 'fonte', texto, familia: nomeDaFamilia(regra.style.getPropertyValue('font-family')), reduzida: null, estatica: null }
  versoes ??= new Map(versoesDasFontes.map((versao) => [new URL(versao.original, document.baseURI).href, versao]))
  const endereco = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(texto)?.[1]
  const versao = endereco && versoes.get(new URL(endereco, base).href)
  if (!endereco || !versao) return fonte
  const com = (url: string) => texto.split(endereco).join(new URL(url, document.baseURI).href)
  fonte.reduzida = { texto: com(versao.reduzida) }
  if (versao.estatica) fonte.estatica = { texto: com(versao.estatica.url), peso: String(versao.estatica.peso) }
  return fonte
}

/** Os pseudo-elementos que podem ter texto. */
const PSEUDO_COM_TEXTO = /::?(before|after|first-line|first-letter|marker|placeholder|file-selector-button)\b/i

/** A regra (ou uma regra dentro dela) muda a família, o peso ou as variações da fonte de um pseudo-elemento? */
function mudaAFonteDeUmPseudo(regra: CSSStyleRule): boolean {
  if (PSEUDO_COM_TEXTO.test(regra.selectorText)) {
    for (const propriedade of ['font-family', 'font-weight', 'font-variation-settings']) {
      const valor = regra.style.getPropertyValue(propriedade)
      if (valor && valor !== 'inherit' && valor !== 'unset') return true
    }
  }
  return [...regra.cssRules].some((dentro) => dentro instanceof CSSStyleRule && mudaAFonteDeUmPseudo(dentro))
}

/**
 * Onde, em `seletor`, há um caractere que `separa`, fora de parênteses, colchetes, aspas e escapes
 * (lá dentro ele é parte de um nome, de um atributo ou de um :is()).
 */
function cortes(seletor: string, separa: (c: string) => boolean): number[] {
  const posicoes: number[] = []
  let profundidade = 0
  let aspas = ''
  for (let i = 0; i < seletor.length; i++) {
    const c = seletor[i]
    if (c === '\\') {
      i++
      continue
    }
    if (aspas) {
      if (c === aspas) aspas = ''
      continue
    }
    if (c === '"' || c === "'") aspas = c
    else if (c === '(' || c === '[') profundidade++
    else if (c === ')' || c === ']') profundidade--
    else if (profundidade === 0 && separa(c)) posicoes.push(i)
  }
  return posicoes
}

const FIM_DO_NOME = new Set(['.', '#', ':', '[', ']', '(', ')', ' ', '>', '+', '~', ',', '*', '|', '\t', '\n'])

/** O nome que começa em `i` (o de uma classe, depois do ponto), com os escapes do CSS desfeitos. */
function nomeEm(texto: string, i: number): string {
  let nome = ''
  while (i < texto.length) {
    const c = texto[i]
    if (c === '\\') {
      const hex = /^[0-9a-fA-F]{1,6}\s?/.exec(texto.slice(i + 1, i + 8))
      if (hex) {
        const ponto = Number.parseInt(hex[0], 16)
        nome += ponto > 0 && ponto <= 0x10ffff ? String.fromCodePoint(ponto) : '�'
        i += 1 + hex[0].length
      } else {
        nome += texto[i + 1] ?? ''
        i += 2
      }
      continue
    }
    if (FIM_DO_NOME.has(c)) break
    nome += c
    i++
  }
  return nome
}

/**
 * O que o elemento de uma regra precisa ter, para cada seletor da lista: as classes da parte final de
 * cada um (a do próprio elemento), fora de :is(), :where() e :not(), e o tipo, se ela começa por um
 * (button, code). Null se algum seletor não exige nada (vale para qualquer elemento, como
 * [data-reveal] ou ::selection). Na dúvida, a regra entra: uma que não pode valer no bloco só pesa,
 * e uma que faltasse mudaria a foto.
 */
function exigencias(lista: string): Exigencia[] | null {
  const todas: Exigencia[] = []
  let inicio = 0
  for (const fim of [...cortes(lista, (c) => c === ','), lista.length]) {
    const seletor = lista.slice(inicio, fim).trim()
    inicio = fim + 1
    const combinadores = cortes(seletor, (c) => c === ' ' || c === '>' || c === '+' || c === '~' || c === '\t' || c === '\n')
    const parte = seletor.slice((combinadores.at(-1) ?? -1) + 1)
    const classes = cortes(parte, (c) => c === '.')
      .map((i) => nomeEm(parte, i + 1))
      .filter(Boolean)
    const tipo = /^[a-zA-Z][\w-]*/.exec(parte)?.[0].toLowerCase() ?? null
    if (!classes.length && !tipo) return null
    todas.push({ classes, tipo })
  }
  return todas
}

/** Os textos das regras: os das de fora dos grupos e das de dentro deles, e os das versões das fontes. */
function comTexto(regras: readonly RegraDaFoto[], lista: { texto: string }[] = []) {
  for (const regra of regras) {
    if (regra.tipo === 'grupo') {
      comTexto(regra.regras, lista)
      continue
    }
    lista.push(regra)
    if (regra.tipo === 'fonte') {
      if (regra.reduzida) lista.push(regra.reduzida)
      if (regra.estatica) lista.push(regra.estatica)
    }
  }
  return lista
}

/** Fontes e imagens vão embutidas nos textos das regras (sem a fonte, o SVG usaria a do sistema). */
async function embutirEnderecos(regras: readonly RegraDaFoto[], base: string) {
  const comEndereco = comTexto(regras).filter((regra) => regra.texto.includes('url('))
  const enderecos = new Set(
    comEndereco
      .flatMap((regra) => [...regra.texto.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1] ?? ''))
      .filter((url) => url && !url.startsWith('data:')),
  )
  // (todas ao mesmo tempo: as versões das fontes ainda não estão no cache do navegador)
  const dados = await Promise.all([...enderecos].map((url) => comoDado(new URL(url, base).href).catch(() => null)))
  ;[...enderecos].forEach((url, i) => {
    const dado = dados[i]
    // sem ela, fica a do sistema
    if (!dado) return
    for (const regra of comEndereco) if (regra.texto.includes(url)) regra.texto = regra.texto.split(url).join(dado)
  })
}

async function montarEstilo(): Promise<EstiloDasFotos> {
  const estilo: EstiloDasFotos = { regras: [], registros: [], pseudos: [] }
  for (const folha of [...document.styleSheets]) {
    if (folha.disabled) continue
    const media = folha.media.mediaText
    if (media && !window.matchMedia(media).matches) continue
    let daFolha: CSSRuleList
    try {
      daFolha = folha.cssRules
    } catch {
      // uma folha de outra origem não pode ser lida: fica de fora
      continue
    }
    const base = folha.href ?? document.baseURI
    const lista = paraFotos(daFolha, estilo, base)
    await embutirEnderecos(lista, base)
    estilo.regras.push(...lista)
  }
  return estilo
}

function obterEstilo(): Promise<EstiloDasFotos> {
  const chave = chaveDoEstilo()
  if (!estilo || estilo.chave !== chave) {
    const pronto = montarEstilo()
    estilo = { chave, pronto }
    pronto.catch(() => {
      if (estilo?.pronto === pronto) estilo = null
    })
  }
  return estilo.pronto
}

/** Nas fotos, as animações e as transições ficam paradas no fim. */
const PARADAS = '*,*::before,*::after{animation:none!important;transition:none!important}'

/** O que há nos elementos de uma foto. */
interface Conteudo {
  /** As classes (com as da raiz, que o SVG copia). */
  classes: ReadonlySet<string>
  tipos: ReadonlySet<string>
  /** As famílias de fonte, cada uma com os pesos em que aparece ('variável' com font-variation-settings). */
  pesos: ReadonlyMap<string, ReadonlySet<string>>
  /**
   * Que versão das fontes vai: a menor que desenha o bloco igual (veja versaoDaFonte), as inteiras
   * (um caractere fora das reduzidas), ou todas as fontes, inteiras (uma regra muda a fonte de um
   * pseudo-elemento, e o texto dele pode estar numa família ou num peso que os elementos não mostram).
   */
  fontes: 'menores' | 'inteiras' | 'todas'
}

/** Os caracteres que as fontes reduzidas têm (veja scripts/fontesDasFotos.ts). */
const COBERTOS = new Set(caracteres)

/** As fontes reduzidas têm todos os caracteres de `texto`? (Um que faltasse sairia em outra fonte.) */
function coberto(texto: string): boolean {
  for (const caractere of texto) if (!COBERTOS.has(caractere)) return false
  return true
}

/** A regra pode valer em algum elemento da foto? */
function vale(exige: Exigencia[] | null, { classes, tipos }: Conteudo): boolean {
  return !exige || exige.some(({ classes: deste, tipo }) => (tipo === null || tipos.has(tipo)) && deste.every((classe) => classes.has(classe)))
}

/**
 * O texto da menor versão da fonte que desenha igual o texto da família em `pesos`: a estática, se
 * ele está todo no peso dela, senão a reduzida, senão a inteira.
 */
function versaoDaFonte(fonte: FonteDaFoto, pesos: ReadonlySet<string>): string {
  if (fonte.estatica && pesos.size === 1 && pesos.has(fonte.estatica.peso)) return fonte.estatica.texto
  return (fonte.reduzida ?? fonte).texto
}

/** O CSS das `regras` que pode valer nos elementos de uma foto. */
function cssDaFoto(regras: readonly RegraDaFoto[], conteudo: Conteudo): string {
  let css = ''
  for (const regra of regras) {
    if (regra.tipo === 'grupo') {
      const dentro = cssDaFoto(regra.regras, conteudo)
      // (uma camada vazia fica: a ordem das camadas é a da primeira vez que cada uma aparece)
      if (dentro || regra.camada) css += `${regra.abre}${dentro}}`
    } else if (regra.tipo === 'fonte') {
      const pesos = conteudo.pesos.get(regra.familia)
      if (conteudo.fontes === 'todas') css += regra.texto
      else if (pesos) css += conteudo.fontes === 'menores' ? versaoDaFonte(regra, pesos) : regra.texto
    } else if (vale(regra.exige, conteudo)) {
      css += regra.texto
    }
  }
  return css
}

/**
 * O CSS da foto dos blocos `raizes` (um bloco, ou as peças da foto do topo): as regras que podem valer
 * nos elementos deles, as fontes que eles usam (na menor versão que serve), os registros das
 * propriedades que essas regras usam e as animações paradas.
 */
function estiloPara({ regras, registros, pseudos }: EstiloDasFotos, raizes: readonly Element[]): string {
  const classes = new Set(document.documentElement.classList)
  const tipos = new Set<string>()
  const pesos = new Map<string, Set<string>>()
  for (const raiz of raizes) {
    for (const elemento of elementosDe(raiz)) {
      for (const classe of elemento.classList) classes.add(classe)
      tipos.add(elemento.localName.toLowerCase())
      const computado = getComputedStyle(elemento)
      const peso = computado.fontVariationSettings === 'normal' ? computado.fontWeight : 'variável'
      for (const nome of computado.fontFamily.split(',')) {
        const familia = nomeDaFamilia(nome)
        const daFamilia = pesos.get(familia)
        if (daFamilia) daFamilia.add(peso)
        else pesos.set(familia, new Set([peso]))
      }
    }
  }
  const conteudo: Conteudo = { classes, tipos, pesos, fontes: 'menores' }
  if (pseudos.some((exige) => vale(exige, conteudo))) conteudo.fontes = 'todas'
  else if (!raizes.every((raiz) => coberto(raiz.textContent ?? ''))) conteudo.fontes = 'inteiras'
  const css = cssDaFoto(regras, conteudo)
  let usados = ''
  for (const registro of registros) if (css.includes(registro.nome)) usados += registro.texto
  return (usados + css + PARADAS).split(']]>').join(']] >')
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
 * O clone de `elemento` para uma foto, sem ids repetidos e sem as animações de entrada, com o que
 * ele herda dos ancestrais e o zoom da tela, em (`esquerda`, `topo`) px CSS dentro do quadro da
 * foto. O `mouse` (veja Pedido) vira a marca no clone. Devolve também os elementos do clone, na
 * ordem do documento (veja elementosDe).
 */
function clonar(
  elemento: HTMLElement,
  esquerda: number,
  topo: number,
  largura: number,
  altura: number,
  dpr: number,
  mouse: Element | null,
): { clone: HTMLElement; copias: Element[] } {
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
    left: `${esquerda}px`,
    top: `${topo}px`,
    width: `${largura}px`,
    height: `${altura}px`,
    margin: '0',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
  })
  return { clone, copias }
}

/**
 * O SVG com o `conteudo` (os clones) num quadro de `w` x `h` pixels da tela, com as regras de estilo
 * da página. O tema (a classe dark) e o idioma vêm da raiz da página.
 */
function documento(conteudo: HTMLElement[], w: number, h: number, css: string): string {
  const raiz = document.documentElement
  const fundo = document.createElement('div')
  for (const { name, value } of raiz.attributes) if (name !== 'style' && name !== 'id') fundo.setAttribute(name, value)
  fundo.style.cssText = `position:relative;width:${w}px;height:${h}px;margin:0;padding:0;overflow:hidden`
  fundo.append(...conteudo)
  const corpo = new XMLSerializer().serializeToString(fundo)
  const fonte = getComputedStyle(raiz).fontSize
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="font-size:${fonte}">` +
    `<style><![CDATA[${css}]]></style>` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">${corpo}</foreignObject></svg>`
  )
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
  const { clone, copias } = clonar(elemento, x - quadro.esquerda, y - quadro.topo, largura, altura, dpr, mouse)
  // a frente dos vídeos fica numa foto à parte, desenhada por cima de cada quadro deles
  if (modo === 'frente') clone.style.visibility = 'hidden'
  for (const i of frente) (copias[i] as (Element & ElementCSSInlineStyle) | undefined)?.style.setProperty('visibility', modo === 'frente' ? 'visible' : 'hidden')
  // o que se anima sem parar fica fora das duas (as fatias o mostram vivo), e o anel do progresso
  // dos vídeos também (as telas o desenham)
  for (const i of vivos) (copias[i] as (Element & ElementCSSInlineStyle) | undefined)?.style.setProperty('visibility', 'hidden')
  for (const anel of clone.querySelectorAll<HTMLElement | SVGElement>(ANEL)) anel.style.setProperty('visibility', 'hidden')
  await embutir(elemento, clone)
  return documento([clone], w, h, css)
}

/**
 * Embute no clone as imagens do original, na versão que a página mostra (ou mostraria): um SVG usado
 * como imagem não busca nada fora dele. Os vídeos viram um espaço vazio do mesmo tamanho (o pôster
 * continua atrás; os quadros vão nas telas das fatias).
 */
async function embutir(elemento: HTMLElement, clone: HTMLElement) {
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
  // só o que pode valer no bloco (veja RegraDaFoto)
  const css = estiloPara(await obterEstilo(), [pedido.elemento])
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

/** Uma peça da foto do topo: o elemento e onde ele fica com a página no topo (px CSS). */
export interface Peca {
  elemento: HTMLElement
  x: number
  y: number
  largura: number
  altura: number
}

/**
 * A foto do topo do site: a tela (`largura` x `altura` px CSS, a partir do canto de cima à esquerda)
 * como ela fica com a página no topo, com as peças (o cabeçalho e o que o conteúdo mostra ali), cada
 * uma no lugar dela, sobre um fundo transparente (o buraco negro e a malha são do motor). Sai num
 * SVG só, na resolução da tela, como as dos blocos, e vira uma ImageBitmap pré-multiplicada, que vai
 * para o worker sem cópia: é com ela que o motor desenha o site chegando na volta ao topo (veja
 * entrada.frag). `ajustar` muda o clone de cada peça antes da foto (o cabeçalho, que muda com a
 * rolagem, fica como ele é no topo). Leva alguns ms numa tarefa só: espera um tempo ocioso.
 */
export async function fotografarTopo(
  pecas: Peca[],
  largura: number,
  altura: number,
  dpr: number,
  ajustar: (copia: HTMLElement) => void,
): Promise<ImageBitmap> {
  const css = estiloPara(
    await obterEstilo(),
    pecas.map(({ elemento }) => elemento),
  )
  const quadro = enquadrar(0, 0, largura, altura, dpr)
  const w = Math.round(quadro.largura * dpr)
  const h = Math.round(quadro.altura * dpr)
  const clones = await Promise.all(
    pecas.map(async ({ elemento, x, y, largura: lp, altura: ap }) => {
      const { clone } = clonar(elemento, x, y, lp, ap, dpr, null)
      ajustar(clone)
      await embutir(elemento, clone)
      return clone
    }),
  )
  const imagem = await carregar(documento(clones, w, h, css))
  await vez(false)
  const tela = document.createElement('canvas')
  tela.width = w
  tela.height = h
  const contexto = tela.getContext('2d')
  if (!contexto) throw new Error('sem contexto 2d')
  contexto.drawImage(imagem, 0, 0)
  try {
    return await createImageBitmap(tela, { premultiplyAlpha: 'premultiply' })
  } finally {
    tela.width = 0
    tela.height = 0
  }
}
