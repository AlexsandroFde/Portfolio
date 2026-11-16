import { createContext, useContext } from 'react'

export type Idioma = 'pt' | 'en'

/** Um texto nos dois idiomas. */
export type Texto = Readonly<Record<Idioma, string>>

/** Um texto traduzido, ou um valor igual nos dois idiomas (nomes próprios, tecnologias). */
export type Traduzivel = string | Texto

/** Idioma da página. O App recebe o idioma de fora (do <html lang>) e o repassa por aqui. */
export const IdiomaContexto = createContext<Idioma>('pt')

export function useIdioma(): Idioma {
  return useContext(IdiomaContexto)
}

/** Função que escolhe, de um texto traduzível, a versão do idioma da página. */
export function useT(): (texto: Traduzivel) => string {
  const idioma = useContext(IdiomaContexto)
  return (texto) => (typeof texto === 'string' ? texto : texto[idioma])
}

/** Endereço de cada versão do site (a base é a do GitHub Pages, ex.: /Portfolio/). */
export const caminhos: Readonly<Record<Idioma, string>> = {
  pt: import.meta.env.BASE_URL,
  en: `${import.meta.env.BASE_URL}en/`,
}
