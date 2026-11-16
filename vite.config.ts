import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O GitHub Pages publica o site em /<nome-do-repositório>/. No deploy, o
// workflow informa o caminho real em BASE_PATH; fora dele vale o do repositório.
const base = `${(process.env.BASE_PATH ?? '/Portfolio').replace(/\/+$/, '')}/`

const pagina = (arquivo: string) => fileURLToPath(new URL(arquivo, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
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
