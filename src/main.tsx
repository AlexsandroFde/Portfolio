import { StrictMode } from 'react'
import App from './App.tsx'
import type { Idioma } from './i18n/idioma.ts'
import { montar } from './lib/montar.ts'
import './index.css'

// O idioma vem do <html lang> de cada página: index.html (pt-BR) ou en/index.html (en).
const idioma: Idioma = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'pt'

montar(
  <StrictMode>
    <App idioma={idioma} />
  </StrictMode>,
)
