// Os tipos do subset-font (o pacote não traz os dele), só do que scripts/fontesDasFotos.ts usa.
declare module 'subset-font' {
  interface Opcoes {
    targetFormat?: 'sfnt' | 'truetype' | 'woff' | 'woff2'
    /** Todos os glyphs da fonte (aí o texto fica de fora). */
    keepAllGlyphs?: boolean
    /** Fixa um eixo de variação num valor, ou o limita a uma faixa. */
    variationAxes?: Record<string, number | { min: number; max: number; default?: number }>
  }
  /** A fonte só com os glyphs de `texto` (e os que eles alcançam pelos recursos tipográficos). */
  export default function subsetFont(fonte: Uint8Array, texto: string | undefined, opcoes?: Opcoes): Promise<Buffer>
}
