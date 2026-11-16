import type { CSSProperties, ReactNode } from 'react'

interface RevealProps {
  /** Elemento HTML a renderizar. */
  as?: 'div' | 'p' | 'li' | 'header' | 'ul' | 'dl'
  /** Atraso da animação, em milissegundos (para escalonar itens de uma lista). */
  delay?: number
  className?: string
  children: ReactNode
}

// Um único observer para a página inteira: cada elemento é revelado uma vez
// e deixa de ser observado em seguida.
let observer: IntersectionObserver | undefined

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute('data-revealed', '')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  )
  return observer
}

/** Ref de callback: observa o elemento ao montar e para de observar ao desmontar. */
function observe(element: HTMLElement | null) {
  if (!element) return

  if (!('IntersectionObserver' in window)) {
    element.setAttribute('data-revealed', '')
    return
  }

  const io = getObserver()
  io.observe(element)
  return () => io.unobserve(element)
}

/**
 * Revela o conteúdo com um leve deslocamento quando ele entra na tela.
 * O estado "escondido" vive só no CSS (ver index.css), então o HTML
 * pré-renderizado continua legível sem JavaScript.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }: RevealProps) {
  const style = delay > 0 ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined

  return (
    <Tag ref={observe} data-reveal="" className={className} style={style}>
      {children}
    </Tag>
  )
}
