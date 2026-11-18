import { useEffect, useRef } from 'react'

/**
 * O espaço vazio depois do rodapé: a página continua rolando até sair toda da tela e, mais
 * adiante, o buraco negro vem para o meio dela e a engole, até tudo ficar preto e a página voltar
 * ao topo (ver lib/buracoNegro/mergulho.ts). Sem JavaScript, que faz a volta, o espaço não existe
 * (ver .mergulho no index.css).
 */
export function Dive() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const espaco = ref.current
    if (!espaco) return

    let desligar: (() => void) | undefined
    let cancelado = false
    void import('../lib/buracoNegro/mergulho.ts').then(({ iniciarMergulho }) => {
      if (!cancelado) desligar = iniciarMergulho(espaco)
    })

    return () => {
      cancelado = true
      desligar?.()
    }
  }, [])

  return <div ref={ref} aria-hidden="true" className="mergulho print-hidden" />
}
