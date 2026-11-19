// Animações presas à rolagem: cada uma vai de um quadro-chave a outro conforme a posição da página,
// e não conforme o tempo. É o que deixa a absorção "pré-calculada": o desenho de cada posição da
// rolagem é decidido de antemão, e rolar só escolhe qual deles aparece.
//
// Onde há ScrollTimeline, quem anda com as animações é o próprio navegador, na mesma etapa em que
// rola a página, fora do JavaScript (transform e opacity, as únicas que elas usam, rodam ali). Elas
// ficam sempre na posição exata da rolagem, por mais rápida que ela seja, mesmo com o JavaScript
// ocupado. Sem ScrollTimeline, o JavaScript leva cada uma à rolagem atual a cada quadro: o desenho é
// o mesmo, mas rolando rápido ele pode chegar um quadro atrasado.

/** Uma Animation com o trecho da linha do tempo (rangeStart e rangeEnd ainda faltam nos tipos do TypeScript). */
type ComTrecho = Animation & { rangeStart: string; rangeEnd: string }

export interface Relogio {
  /**
   * Põe o efeito para andar com a rolagem: o primeiro quadro-chave vale com a página rolada até
   * `de` (px), o último a partir de `ate`, e antes e depois disso ficam os das pontas.
   */
  animar(efeito: KeyframeEffect, de: number, ate: number): Animation
  /** Leva a animação para outro trecho da rolagem, com os mesmos quadros-chave (bem mais barato que outra). */
  mover(animacao: Animation, de: number, ate: number): void
  /** Desliga a animação (o elemento volta ao estilo de antes). */
  soltar(animacao: Animation): void
  /** A cada quadro, onde não há ScrollTimeline: leva as animações à rolagem atual. */
  acertar(rolagem: number): void
}

function relogioNativo(): Relogio | null {
  if (typeof ScrollTimeline !== 'function' || !('rangeStart' in Animation.prototype)) return null
  try {
    const linha = new ScrollTimeline({ source: document.documentElement, axis: 'block' })
    return {
      animar(efeito, de, ate) {
        const animacao = new Animation(efeito, linha) as ComTrecho
        animacao.rangeStart = `${de}px`
        animacao.rangeEnd = `${ate}px`
        animacao.play()
        return animacao
      },
      mover(animacao, de, ate) {
        const comTrecho = animacao as ComTrecho
        comTrecho.rangeStart = `${de}px`
        comTrecho.rangeEnd = `${ate}px`
      },
      soltar: (animacao) => animacao.cancel(),
      acertar() {},
    }
  } catch {
    return null
  }
}

/** Sem ScrollTimeline: animações paradas no tempo, que o JavaScript leva à rolagem (px valem como ms). */
function relogioManual(): Relogio {
  const animacoes = new Set<Animation>()
  let rolagem = window.scrollY
  return {
    animar(efeito, de, ate) {
      efeito.updateTiming({ delay: de, duration: Math.max(ate - de, 0.001), fill: 'both' })
      const animacao = new Animation(efeito, document.timeline)
      animacao.pause()
      animacao.currentTime = rolagem
      animacoes.add(animacao)
      return animacao
    },
    mover(animacao, de, ate) {
      animacao.effect?.updateTiming({ delay: de, duration: Math.max(ate - de, 0.001) })
      animacao.currentTime = rolagem
    },
    soltar(animacao) {
      animacoes.delete(animacao)
      animacao.cancel()
    },
    acertar(nova) {
      if (nova === rolagem) return
      rolagem = nova
      for (const animacao of animacoes) animacao.currentTime = nova
    },
  }
}

export function criarRelogio(): Relogio {
  return relogioNativo() ?? relogioManual()
}

/**
 * Deixa o elemento invisível com a página no topo e à vista a partir do segundo pixel da tela de
 * rolagem, junto com a rolagem: é quando a absorção começa (a camada das fatias e a cortina entram
 * juntas, no mesmo quadro).
 */
export function aparecerAoRolar(relogio: Relogio, elemento: HTMLElement): Animation {
  const dpr = window.devicePixelRatio || 1
  const efeito = new KeyframeEffect(elemento, [{ opacity: 0, easing: 'step-end' }, { opacity: 1 }], { fill: 'both' })
  return relogio.animar(efeito, 0.5 / dpr, 1.5 / dpr)
}
