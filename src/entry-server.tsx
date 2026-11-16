import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'
import { NotFound } from './components/NotFound.tsx'
import type { Idioma } from './i18n/idioma.ts'

// Usado apenas no build, por scripts/prerender.mjs.

/** HTML da página principal no idioma pedido. */
export function render(idioma: Idioma): string {
  return renderToString(
    <StrictMode>
      <App idioma={idioma} />
    </StrictMode>,
  )
}

/** HTML da página de erro 404. */
export function renderNotFound(): string {
  return renderToString(
    <StrictMode>
      <NotFound />
    </StrictMode>,
  )
}
