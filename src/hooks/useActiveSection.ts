import { useEffect, useState } from 'react'

/**
 * Informa qual seção está na faixa central da tela, para destacar o item
 * correspondente no menu. `ids` precisa ser uma referência estável.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return

    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        setActive(ids.find((id) => visible.has(id)) ?? null)
      },
      // Faixa estreita um pouco acima do meio da tela.
      { rootMargin: '-40% 0px -55% 0px' },
    )

    for (const id of ids) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }

    return () => observer.disconnect()
  }, [ids])

  return active
}
