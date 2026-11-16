import type { ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

/**
 * Coloca a página no ar no navegador. No build de produção o HTML já vem pronto
 * (scripts/prerender.mjs) e o React apenas o hidrata; no servidor de
 * desenvolvimento a página é montada do zero.
 */
export function montar(pagina: ReactNode) {
  const container = document.getElementById('root')!

  if (container.firstElementChild) {
    hydrateRoot(container, pagina)
  } else {
    createRoot(container).render(pagina)
  }

  // Avisa o CSS que o app assumiu as animações de revelação (ver index.css).
  document.documentElement.classList.add('hydrated')
}
