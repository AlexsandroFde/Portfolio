import { useEffect, useRef, useState } from 'react'

/**
 * Buraco negro animado (WebGL) no fundo da página. Fica no canto de cima à direita, como algo
 * muito distante, esticando para dentro do seu disco o conteúdo que sobe até o alto da tela e
 * cuspindo de volta o que desce. Também desenha a malha da apresentação, curvada pela gravidade.
 *
 * O código do efeito só é baixado com a página já pronta e só entra depois da animação de
 * entrada. Sem WebGL 2 com aceleração de hardware, fica a malha em CSS (.hero-grid) e nada é
 * absorvido.
 */
export function BlackHole() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    let desligar: (() => void) | undefined
    let cancelado = false

    const iniciar = () => {
      void import('../lib/buracoNegro/index.ts').then(({ iniciarBuracoNegro }) => {
        if (!cancelado) desligar = iniciarBuracoNegro(canvas, setAtivo)
      })
    }

    const ocioso = 'requestIdleCallback' in window
    const espera = ocioso ? window.requestIdleCallback(iniciar, { timeout: 2000 }) : window.setTimeout(iniciar, 400)

    return () => {
      cancelado = true
      if (ocioso) window.cancelIdleCallback(espera)
      else window.clearTimeout(espera)
      desligar?.()
    }
  }, [])

  // com o efeito no ar, a malha passa a ser desenhada por ele (ver index.css)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-buraco-negro', ativo)
  }, [ativo])

  return (
    <canvas
      ref={ref}
      className="buraco-negro print-hidden"
      data-ativo={ativo ? '' : undefined}
      aria-hidden="true"
    />
  )
}
