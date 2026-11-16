// Pré-renderiza as páginas do site em dist/ e gera o currículo em PDF.
//
// O build gera duas saídas: o site (dist/) e uma versão do app para Node
// (dist-ssr/). Aqui rodamos essa versão para obter o HTML de cada página e o
// inserimos no arquivo final correspondente. Assim o conteúdo já chega pronto
// ao navegador e aos buscadores, e o React só precisa hidratar.
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gerarCurriculos } from './curriculo.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ssrDir = path.join(root, 'dist-ssr')
const placeholder = '<div id="root"></div>'

const { render, renderNotFound, renderCurriculo } = await import(
  pathToFileURL(path.join(ssrDir, 'entry-server.js')).href
)

const paginas = [
  { arquivo: 'index.html', html: () => render('pt') },
  { arquivo: 'en/index.html', html: () => render('en') },
  { arquivo: '404.html', html: () => renderNotFound() },
]

for (const pagina of paginas) {
  const htmlFile = path.join(root, 'dist', pagina.arquivo)
  const template = await readFile(htmlFile, 'utf8')
  if (!template.includes(placeholder)) {
    throw new Error(`Não encontrei ${placeholder} em dist/${pagina.arquivo}. O pré-render não foi aplicado.`)
  }

  const appHtml = pagina.html()
  // A função evita que "$" no conteúdo seja interpretado como padrão de substituição.
  await writeFile(htmlFile, template.replace(placeholder, () => `<div id="root">${appHtml}</div>`))
  console.log(`✓ dist/${pagina.arquivo} pré-renderizado (${(appHtml.length / 1024).toFixed(1)} kB de HTML)`)
}

// O currículo em PDF, linkado pelo site (ver scripts/curriculo.mjs).
await gerarCurriculos(renderCurriculo, path.join(root, 'dist'))

await rm(ssrDir, { recursive: true, force: true })
