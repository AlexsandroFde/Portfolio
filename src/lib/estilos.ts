// Classes usadas em mais de um componente.

/** Botão redondo só com ícone (cabeçalho). */
export const botaoIcone =
  'grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg'

const botao = 'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors'

/** Botão principal, preenchido. */
export const botaoPrimario = `${botao} bg-fg text-bg hover:bg-accent hover:text-accent-fg`

/** Botão secundário, só com contorno. */
export const botaoSecundario = `${botao} border border-line-strong hover:border-fg hover:bg-surface`

/** Terceira ação, mais discreta: só texto e ícone, com fundo ao passar o mouse. */
export const botaoDiscreto =
  'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg'
