import type { MouseEvent } from 'react'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { botaoIcone } from '../lib/estilos.ts'
import { toggleTheme } from '../lib/theme.ts'
import { Moon, Sun } from './icons.tsx'

/** Botão de tema claro/escuro; o novo tema se abre em círculo a partir dele. */
export function ThemeToggle() {
  const t = useT()

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }

  // Os dois ícones ficam no HTML e o CSS mostra o do tema atual: assim o
  // botão não depende de estado do React e não há divergência na hidratação.
  return (
    <button
      type="button"
      onClick={onClick}
      className={botaoIcone}
      aria-label={t(ui.tema.rotulo)}
      title={t(ui.tema.titulo)}
    >
      <Moon className="size-[1.125rem] dark:hidden" />
      <Sun className="hidden size-[1.125rem] dark:block" />
    </button>
  )
}
