import { StrictMode } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import App from './App.tsx'
import { NotFound } from './components/NotFound.tsx'
import { Curriculo } from './curriculo/Curriculo.tsx'
import { arquivoCurriculo } from './data/curriculo.ts'
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

/** Documento do currículo (impresso em PDF por scripts/curriculo.mjs) e o nome do arquivo. */
export function renderCurriculo(idioma: Idioma): { html: string; arquivo: string } {
  return {
    html: `<!doctype html>${renderToStaticMarkup(<Curriculo idioma={idioma} />)}`,
    arquivo: arquivoCurriculo[idioma],
  }
}
