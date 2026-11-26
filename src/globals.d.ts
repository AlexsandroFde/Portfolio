/** Ano em que o site foi gerado (definido em vite.config.ts). */
declare const __BUILD_YEAR__: number

/** As fontes do site reduzidas para as fotos da absorção (veja scripts/fontesDasFotos.ts). */
declare module 'virtual:fontes-das-fotos' {
  /** Cada fonte: o endereço da inteira (o mesmo da regra @font-face) e os das versões menores. */
  export const fontes: {
    original: string
    /** A fonte variável só com `caracteres`: desenha igual à inteira em qualquer peso. */
    reduzida: string
    /** A reduzida fixada no peso padrão da fonte: desenha igual à inteira só nesse peso. */
    estatica: { url: string; peso: number } | null
  }[]
  /** Os caracteres que as versões reduzidas têm (se a inteira os tiver). */
  export const caracteres: string
}
