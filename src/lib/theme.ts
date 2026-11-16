/** Cores da barra do navegador em cada tema (iguais ao --bg do index.css). */
const THEME_COLOR = { light: '#f4f3ee', dark: '#0b0b0c' } as const

const STORAGE_KEY = 'theme'

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)

  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    // Armazenamento indisponível (modo privado): o tema vale só para esta visita.
  }
}

/**
 * Alterna entre tema claro e escuro. Onde a View Transitions API existe, o
 * novo tema se abre em círculo a partir do ponto indicado (o botão clicado).
 *
 * O tema inicial é definido por um script inline no index.html, antes da
 * primeira pintura, para não piscar.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const dark = !document.documentElement.classList.contains('dark')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!origin || reducedMotion || typeof document.startViewTransition !== 'function') {
    apply(dark)
    return
  }

  const { x, y } = origin
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const transition = document.startViewTransition(() => apply(dark))

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 550,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      // Transição cancelada pelo navegador: o tema já foi aplicado.
    })
}
