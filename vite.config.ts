import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fontesDasFotos } from './scripts/fontesDasFotos.ts'

// O GitHub Pages publica o site em /<nome-do-repositório>/. No deploy, o
// workflow informa o caminho real em BASE_PATH; fora dele vale o do repositório.
const base = `${(process.env.BASE_PATH ?? '/Portfolio').replace(/\/+$/, '')}/`

const pagina = (arquivo: string) => fileURLToPath(new URL(arquivo, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // As fontes das regras @font-face de src/index.css, reduzidas para as fotos da absorção.
    fontesDasFotos([
      '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
      '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
    ]),
  ],
  // O worker do buraco negro (src/lib/buracoNegro/trabalhador.ts) é um módulo, como o resto do site.
  worker: { format: 'es' },
  define: {
    __BUILD_YEAR__: new Date().getFullYear(),
  },
  build: {
    rolldownOptions: {
      // As três páginas do site: português (raiz), inglês (/en/) e a de erro do GitHub Pages.
      input: {
        principal: pagina('./index.html'),
        en: pagina('./en/index.html'),
        404: pagina('./404.html'),
      },
    },
  },
})
