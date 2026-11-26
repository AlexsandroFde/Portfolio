// As fontes das fotos da absorção, reduzidas no build (um plugin do Vite).
//
// Cada foto é um SVG com as fontes que o bloco usa embutidas como data: URL (veja
// src/lib/buracoNegro/fotos.ts), e o navegador lê esses bytes de novo a cada foto: cada kB de fonte no
// SVG custa tempo, mesmo o de uma fonte que nem chega a ser usada. Com as fontes inteiras (Geist e
// Geist Mono variáveis, 52 kB), os bytes delas eram a maior parte do custo de uma foto.
//
// Aqui, cada fonte ganha duas versões menores, só com os caracteres que o site pode mostrar:
//   - a reduzida: a mesma fonte variável, que desenha igual à inteira em qualquer peso;
//   - a estática: a reduzida fixada no peso padrão da fonte (400), sem os dados das variações, para
//     os blocos que só usam esse peso. Nele ela desenha igual; fixar qualquer outro peso arredonda os
//     contornos e os avanços, e o desenho muda.
// O módulo virtual:fontes-das-fotos diz onde está cada versão e que caracteres as reduzidas têm: a
// foto de um bloco com outro caractere leva a fonte inteira.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import subsetFont from 'subset-font'
import type { Plugin } from 'vite'

const MODULO = 'virtual:fontes-das-fotos'
const RESOLVIDO = `\0${MODULO}`

/** Onde as versões ficam entre um build e outro (o nome muda com a fonte e com os caracteres). */
const PASTA = 'node_modules/.cache/fontes-das-fotos'

/** Os textos do site: os arquivos de src e as páginas. */
const TEXTOS = /\.(tsx?|css|json|md|html)$/
const PAGINAS = ['index.html', 'en/index.html', '404.html']

/**
 * O plugin. `arquivos` são as fontes do site, os mesmos arquivos das regras @font-face de
 * src/index.css (as fotos acham a versão reduzida de uma regra pelo endereço da fonte dela).
 */
export function fontesDasFotos(arquivos: readonly string[]): Plugin {
  let raiz = process.cwd()
  let modulo: Promise<string> | undefined
  return {
    name: 'fontes-das-fotos',
    configResolved(config) {
      raiz = config.root
    },
    resolveId(id) {
      return id === MODULO ? RESOLVIDO : undefined
    },
    load(id) {
      if (id !== RESOLVIDO) return undefined
      modulo ??= gerar(raiz, arquivos)
      return modulo
    },
  }
}

/** O código do módulo virtual: os endereços das três versões de cada fonte e os caracteres. */
async function gerar(raiz: string, arquivos: readonly string[]): Promise<string> {
  const caracteres = caracteresDoSite(raiz)
  mkdirSync(path.join(raiz, PASTA), { recursive: true })
  const requerer = createRequire(path.join(raiz, 'package.json'))
  const importacoes: string[] = []
  const fontes: string[] = []
  for (const [i, arquivo] of arquivos.entries()) {
    const inteira = readFileSync(requerer.resolve(arquivo))
    const nome = `${path.basename(arquivo, path.extname(arquivo))}-${createHash('sha256').update(inteira).update(caracteres).digest('hex').slice(0, 10)}`
    const reduzida = await guardar(raiz, `${nome}.woff2`, () => subsetFont(inteira, caracteres, { targetFormat: 'woff2' }))
    const peso = pesoPadrao(await subsetFont(inteira, undefined, { targetFormat: 'truetype', keepAllGlyphs: true }))
    const estatica =
      peso === null ? null : await guardar(raiz, `${nome}-${peso}.woff2`, () => subsetFont(inteira, caracteres, { targetFormat: 'woff2', variationAxes: { wght: peso } }))
    importacoes.push(`import original${i} from ${JSON.stringify(`${arquivo}?url`)}`, `import reduzida${i} from ${JSON.stringify(`${reduzida}?url`)}`)
    if (estatica) importacoes.push(`import estatica${i} from ${JSON.stringify(`${estatica}?url`)}`)
    fontes.push(`{ original: original${i}, reduzida: reduzida${i}, estatica: ${estatica ? `{ url: estatica${i}, peso: ${peso} }` : 'null'} }`)
  }
  return `${importacoes.join('\n')}\nexport const fontes = [${fontes.join(', ')}]\nexport const caracteres = ${JSON.stringify(caracteres)}\n`
}

/** Grava a versão `nome` (se ainda não estiver na pasta) e devolve o endereço dela a partir da raiz. */
async function guardar(raiz: string, nome: string, fazer: () => Promise<Uint8Array>): Promise<string> {
  const arquivo = path.join(raiz, PASTA, nome)
  if (!existsSync(arquivo)) writeFileSync(arquivo, await fazer())
  return `/${PASTA}/${nome}`
}

/**
 * Os caracteres que o site pode mostrar, em ordem: os dos textos, com as versões em maiúscula e em
 * minúscula (para o text-transform), mais o ASCII visível, os espaços e a pontuação geral, que o
 * próprio navegador põe no texto (reticências de um texto cortado, o hífen da hifenização, aspas).
 */
function caracteresDoSite(raiz: string): string {
  const conjunto = new Set<string>(['\t', '\n', '\r', ' ', '«', '­', '»'])
  const faixa = (de: number, ate: number) => {
    for (let ponto = de; ponto <= ate; ponto++) conjunto.add(String.fromCodePoint(ponto))
  }
  faixa(0x20, 0x7e)
  faixa(0x2000, 0x206f)
  const textos = [
    ...readdirSync(path.join(raiz, 'src'), { recursive: true, encoding: 'utf8' })
      .filter((arquivo) => TEXTOS.test(arquivo))
      .map((arquivo) => path.join(raiz, 'src', arquivo)),
    ...PAGINAS.map((pagina) => path.join(raiz, pagina)).filter((arquivo) => existsSync(arquivo)),
  ]
  for (const arquivo of textos) for (const caractere of readFileSync(arquivo, 'utf8')) conjunto.add(caractere)
  let antes = 0
  while (conjunto.size !== antes) {
    antes = conjunto.size
    for (const caractere of [...conjunto]) for (const variante of caractere.toUpperCase() + caractere.toLowerCase()) conjunto.add(variante)
  }
  return [...conjunto].sort().join('')
}

/** O peso padrão de uma fonte variável (o do eixo wght, na tabela fvar), ou null se ela não varia o peso. */
function pesoPadrao(sfnt: Uint8Array): number | null {
  const dados = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength)
  const etiqueta = (em: number) => String.fromCharCode(...sfnt.subarray(em, em + 4))
  for (let i = 0; i < dados.getUint16(4); i++) {
    const registro = 12 + 16 * i
    if (etiqueta(registro) !== 'fvar') continue
    const fvar = dados.getUint32(registro + 8)
    const eixos = fvar + dados.getUint16(fvar + 4)
    for (let j = 0; j < dados.getUint16(fvar + 8); j++) {
      const eixo = eixos + j * dados.getUint16(fvar + 10)
      if (etiqueta(eixo) === 'wght') return dados.getInt32(eixo + 8) / 65536
    }
  }
  return null
}
