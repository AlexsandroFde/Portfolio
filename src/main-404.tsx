import { StrictMode } from 'react'
import { NotFound } from './components/NotFound.tsx'
import { montar } from './lib/montar.ts'
import './index.css'

// Entrada da página de erro (404.html), que o GitHub Pages mostra para endereços inexistentes.
montar(
  <StrictMode>
    <NotFound />
  </StrictMode>,
)
