import type { ProjectMedia } from '../../data/projects.ts'

/**
 * A diagramação da página de um projeto: como as demonstrações de cada parte se arrumam em volta do
 * texto, decidida só pelo número e pelo formato delas. Assim um projeto novo não escolhe layout, e
 * toda página segue as mesmas regras.
 */

/** Largura sobre altura. */
export const proporcao = (media: ProjectMedia) => media.width / media.height

/** Bem mais alta que larga (as animações da Beka, uma ilustração). Uma quase quadrada conta como deitada. */
export const emPe = (media: ProjectMedia) => proporcao(media) < 0.8

/** Demonstrações lado a lado, todas com a mesma altura. */
export type Fileira = readonly ProjectMedia[]

/**
 * Como uma parte se arruma:
 * - `texto`: sem demonstrações, o título de um lado e o texto do outro (como nas seções do site);
 * - `lado`: o texto ao lado de uma coluna com as demonstrações, empilhadas (as em pé, aos pares). Com
 *   três ou mais deitadas, a primeira fica ao lado do texto e as outras vêm embaixo, na largura toda;
 * - `faixa`: três ou mais em pé, numa faixa na largura toda embaixo do texto.
 */
export type Arranjo =
  | { tipo: 'texto' }
  | { tipo: 'lado'; coluna: readonly Fileira[]; embaixo: readonly Fileira[] }
  | { tipo: 'faixa'; embaixo: readonly Fileira[] }

/** Em fileiras de até `n`, na ordem. */
function emGrupos(midias: readonly ProjectMedia[], n: number): Fileira[] {
  const fileiras: Fileira[] = []
  for (let i = 0; i < midias.length; i += n) fileiras.push(midias.slice(i, i + n))
  return fileiras
}

/** As fileiras embaixo do texto: aos pares, com uma de três no começo se sobrar uma (nenhuma fica sozinha). */
function fileirasEmbaixo(midias: readonly ProjectMedia[]): Fileira[] {
  if (midias.length % 2 === 0) return emGrupos(midias, 2)
  return [midias.slice(0, 3), ...emGrupos(midias.slice(3), 2)]
}

/** A coluna ao lado do texto: as deitadas uma embaixo da outra, e as em pé que vêm seguidas, aos pares. */
function fileirasDaColuna(midias: readonly ProjectMedia[]): Fileira[] {
  const fileiras: ProjectMedia[][] = []
  for (const media of midias) {
    const ultima = fileiras.at(-1)
    if (emPe(media) && ultima?.length === 1 && ultima.every(emPe)) ultima.push(media)
    else fileiras.push([media])
  }
  return fileiras
}

export function diagramar(midias: readonly ProjectMedia[]): Arranjo {
  if (midias.length === 0) return { tipo: 'texto' }
  if (midias.length >= 3 && midias.every(emPe)) return { tipo: 'faixa', embaixo: emGrupos(midias, 4) }
  if (midias.length >= 3 && !midias.some(emPe)) {
    return { tipo: 'lado', coluna: [midias.slice(0, 1)], embaixo: fileirasEmbaixo(midias.slice(1)) }
  }
  return { tipo: 'lado', coluna: fileirasDaColuna(midias), embaixo: [] }
}
