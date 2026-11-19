// Animações presas à rolagem: cada uma vai de um quadro-chave a outro conforme a posição da página,
// e não conforme o tempo. É o que deixa a absorção "pré-calculada": o desenho de cada posição da
// rolagem é decidido de antemão, e rolar só escolhe qual deles aparece.
//
// Onde há ScrollTimeline, quem anda com as animações é o próprio navegador, na mesma etapa em que
// rola a página, fora do JavaScript (transform e opacity, as únicas que elas usam, rodam ali). Elas
// ficam sempre na posição exata da rolagem, por mais rápida que ela seja, mesmo com o JavaScript
// ocupado. Sem ScrollTimeline, o JavaScript leva cada uma à rolagem atual a cada quadro: o desenho é
// o mesmo, mas rolando rápido ele pode chegar um quadro atrasado.
//
// A linha do tempo de uma ScrollTimeline vai do topo da página à maior rolagem possível, que muda com a
// página rolando (no celular, quando a barra do navegador some ou volta; e quando a página muda de
// altura). A cada mudança, o Chrome reenviava ao compositor todas as animações presas a ela, com todos
// os quadros-chave (as da absorção têm um para cada pixel da faixa): no celular emulado, cada mudança
// custava um quadro de uns 30 ms.
// Com uma âncora (o main, veja criarRelogio), a linha do tempo é a de uma ViewTimeline, que acompanha
// a posição da âncora na tela e não depende da rolagem máxima. Os trechos continuam em px de rolagem,
// contados do topo dela.

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

/**
 * A linha do tempo das animações e como escrever nela um trecho em px de rolagem. Com a âncora, uma
 * ViewTimeline: o trecho é contado do momento em que o topo da âncora chega ao alto da tela (o 0% do
 * trecho contain de um elemento mais alto que a tela), e a âncora tem de começar em `topo` na página e
 * nunca sair dele. Sem inset, a ViewTimeline descontaria do alto da tela o scroll-padding-top da página
 * (veja ajustarAncoras, em index.ts), e todas as animações andariam adiantadas.
 */
function linhaDoTempo(ancora: Element | null | undefined): { linha: AnimationTimeline; trecho: (px: number) => string } {
  if (ancora && typeof ViewTimeline === 'function') {
    const topo = ancora.getBoundingClientRect().top + window.scrollY
    return {
      linha: new ViewTimeline({ subject: ancora, axis: 'block', inset: [CSS.px(0), CSS.px(0)] }),
      trecho: (px) => `contain ${px - topo}px`,
    }
  }
  return { linha: new ScrollTimeline({ source: document.documentElement, axis: 'block' }), trecho: (px) => `${px}px` }
}

function relogioNativo(ancora: Element | null | undefined): Relogio | null {
  if (typeof ScrollTimeline !== 'function' || !('rangeStart' in Animation.prototype)) return null
  try {
    const { linha, trecho } = linhaDoTempo(ancora)
    return {
      animar(efeito, de, ate) {
        const animacao = new Animation(efeito, linha) as ComTrecho
        animacao.rangeStart = trecho(de)
        animacao.rangeEnd = trecho(ate)
        animacao.play()
        return animacao
      },
      mover(animacao, de, ate) {
        const comTrecho = animacao as ComTrecho
        comTrecho.rangeStart = trecho(de)
        comTrecho.rangeEnd = trecho(ate)
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

/**
 * O relógio das animações presas à rolagem. Com `ancora`, um elemento que começa na mesma altura da
 * página para sempre e cujos trechos ficam todos dentro dele, a linha do tempo não depende da rolagem
 * máxima (veja linhaDoTempo); sem ela, vai do topo à rolagem máxima.
 */
export function criarRelogio(ancora?: Element | null): Relogio {
  return relogioNativo(ancora) ?? relogioManual()
}

/**
 * Deixa o elemento invisível com a página no topo e à vista a partir do segundo pixel da tela de
 * rolagem, junto com a rolagem: é quando a absorção começa (a cortina e a tampa entram juntas, no
 * mesmo quadro que as fatias, veja trajeto em absorcao.ts).
 */
export function aparecerAoRolar(relogio: Relogio, elemento: HTMLElement): Animation {
  const dpr = window.devicePixelRatio || 1
  const efeito = new KeyframeEffect(elemento, [{ opacity: 0, easing: 'step-end' }, { opacity: 1 }], { fill: 'both' })
  return relogio.animar(efeito, 0.5 / dpr, 1.5 / dpr)
}
