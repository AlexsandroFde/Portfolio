// Gera o currículo em PDF (português e inglês) a partir do HTML de src/curriculo/.
//
// A impressão é feita por um Chrome ou Edge já instalado (o puppeteer-core só o
// controla, não baixa navegador). No GitHub Actions, o runner já tem o Chrome.
// Para usar outro navegador, defina CHROME_PATH com o caminho do executável.
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const candidatos = [
  process.env.CHROME_PATH,
  // Windows
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  // Linux (inclui o runner do GitHub Actions)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
]

/**
 * Imprime o currículo de cada idioma em dist/.
 * @param {(idioma: 'pt' | 'en') => { html: string, arquivo: string }} renderCurriculo
 * @param {string} distDir
 */
export async function gerarCurriculos(renderCurriculo, distDir) {
  const executavel = candidatos.find((caminho) => caminho && existsSync(caminho))

  if (!executavel) {
    const aviso =
      'Não encontrei Chrome nem Edge para gerar o currículo em PDF. Defina CHROME_PATH com o caminho do navegador.'
    // No deploy, faltar o PDF é erro: o site tem link para ele.
    if (process.env.CI) throw new Error(aviso)
    console.warn(`! ${aviso} O site foi gerado sem o PDF.`)
    return
  }

  const navegador = await puppeteer.launch({
    executablePath: executavel,
    headless: true,
    // O conteúdo é nosso; no CI o sandbox do Chrome pode não estar disponível.
    args: process.env.CI ? ['--no-sandbox'] : [],
  })

  try {
    for (const idioma of /** @type {const} */ (['pt', 'en'])) {
      const { html, arquivo } = renderCurriculo(idioma)
      const pagina = await navegador.newPage()
      await pagina.setContent(html, { waitUntil: 'load' })
      const pdf = await pagina.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        // PDF marcado (estrutura de títulos e listas) e com índice: melhor para leitores de tela e de currículo.
        tagged: true,
        outline: true,
      })
      await pagina.close()

      await writeFile(path.join(distDir, arquivo), pdf)
      const paginas = Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0
      console.log(`✓ dist/${arquivo} gerado (${paginas} ${paginas === 1 ? 'página' : 'páginas'}, ${(pdf.length / 1024).toFixed(0)} kB)`)
    }
  } finally {
    await navegador.close()
  }
}
