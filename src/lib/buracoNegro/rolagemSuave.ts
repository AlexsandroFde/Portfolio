// A rolagem suave: a roda do mouse não move a página na hora, muda o destino dela, e a página anda até
// lá com a aceleração limitada (veja ACELERACAO) e sem passar de uma velocidade máxima (veja
// VELOCIDADE). O dedo arrasta a página com ele, também sem passar da velocidade máxima, e o embalo
// que ele deixa ao sair da tela anda como a roda. Por mais forte que seja o giro da roda ou o embalo
// do dedo, a página arranca, freia e chega aos poucos.
//
// Quem move a página é o laço de quadros da absorção (veja quadro, em index.ts), no começo de cada
// quadro, antes de ele preparar as fatias: a página nunca anda à frente do que a absorção vê, como
// acontecia com a rolagem do navegador, que corre fora do JavaScript e, rápida demais para o
// aparelho, levava o conteúdo à faixa antes de as fatias dele estarem prontas. Num quadro lento, a
// página anda menos (veja PASSO_MAXIMO), em vez de saltar.
//
// Os links para outro ponto da página (o menu, os botões da apresentação), clicados com o mouse ou o
// dedo, também vão pela rolagem suave, um pouco mais rápida (veja VELOCIDADE_DO_LINK). O teclado
// (inclusive o Enter num link) e a busca do navegador continuam com a rolagem do navegador: quando a
// página vai para outro lugar sem passar por aqui, o destino passa a ser onde ela está.

/**
 * A maior aceleração da página (em telas por segundo, a cada segundo): ela arranca, freia e muda de
 * sentido no máximo neste ritmo.
 */
const ACELERACAO = 6
/** A maior velocidade da página (telas por segundo). */
const VELOCIDADE = 3
/**
 * A maior velocidade indo a um link (telas por segundo): com a da roda, voltar ao topo do fim da
 * página levava uns 4 s. A aceleração é a mesma.
 */
const VELOCIDADE_DO_LINK = 8
/**
 * A frenagem para chegar ao destino usa só esta fração da aceleração máxima: com ela toda, os passos
 * de um quadro ficavam para trás da curva de frenagem, e a página chegava ainda rápida e parava de vez.
 */
const FREIO = 0.75
/**
 * Em quanto tempo (s), mais ou menos, a página alcança o destino sem pressa: o de um tranco da roda,
 * o de um link e o do embalo do dedo, que vai adiante a velocidade com que ele sai da tela vezes
 * este tempo (e perde velocidade aos poucos, como o embalo do navegador).
 */
const CHEGADA = { roda: 0.12, link: 0.15, embalo: 0.4 }
/** As posições do dedo que contam para a velocidade com que ele sai da tela: as dos últimos ms. */
const JANELA_DO_DEDO = 80
/** O maior intervalo (s) que um quadro conta: num quadro mais lento, a página anda menos. */
const PASSO_MAXIMO = 0.05
/** A altura de uma linha (px), para a roda que conta em linhas (a do Firefox). */
const LINHA = 100 / 6

export interface RolagemSuave {
  /** Liga ou desliga (desligada, a roda e o dedo rolam a página como sempre, pelo navegador). */
  ligar(sim: boolean): void
  /** No começo de cada quadro, antes de qualquer leitura da rolagem: a página anda um passo. */
  quadro(agora: number): void
  /** A página foi para outro lugar por conta própria (a volta ao topo, no fim do mergulho). */
  sincronizar(): void
  destruir(): void
}

export function criarRolagemSuave(): RolagemSuave {
  const raiz = document.documentElement
  let ligada = false
  /** Onde a página está, aonde vai e com que velocidade (px, px/s; para baixo é positivo). */
  let atual = window.scrollY
  let destino = atual
  let velocidade = 0
  /** A última posição que esta rolagem pôs na página: outra, e alguém mais rolou (veja quadro). */
  let posta = atual
  let anterior = 0
  /** A altura da tela e a maior rolagem possível, medidas quando precisam (veja medir). */
  let tela = window.innerHeight
  let maxima = Number.NaN
  /**
   * Em quanto tempo a página alcança o destino e a maior velocidade dela (telas por segundo), conforme
   * quem mudou o destino por último (veja CHEGADA e VELOCIDADE_DO_LINK).
   */
  let chegada = CHEGADA.roda
  let velocidadeMaxima = VELOCIDADE
  /** O dedo na tela: qual, onde estava e as últimas posições dele ([instante (ms), y]). */
  let dedo: { id: number; y: number } | null = null
  const amostras: [number, number][] = []

  const parada = () => velocidade === 0 && destino === atual
  // a volta ao topo trava a rolagem enquanto o site chega (veja mergulho.ts)
  const travada = () => raiz.style.overflow === 'hidden'

  function maiorRolagem(): number {
    if (Number.isNaN(maxima)) maxima = Math.max(0, raiz.scrollHeight - window.innerHeight)
    return maxima
  }

  /** Para a página onde o navegador diz que ela está. */
  function pararEm(onde: number) {
    atual = destino = posta = onde
    velocidade = 0
  }

  /** O destino anda `quanto` px a partir de onde a página está indo. */
  function mover(quanto: number) {
    // parada, ela pode ter sido rolada pelo navegador (o teclado, a busca) desde a última vez
    if (parada()) pararEm(window.scrollY)
    destino = Math.min(maiorRolagem(), Math.max(0, destino + quanto))
    velocidadeMaxima = VELOCIDADE
  }

  /**
   * Um link para outro ponto desta página, clicado com o mouse ou o dedo: a página vai até o alvo pela
   * rolagem suave, parando onde o navegador pararia (logo abaixo da faixa, pelo scroll-padding-top).
   * Pelo teclado (o Enter num link, que chega sem cliques contados), fica a rolagem do navegador, que
   * também leva para lá o ponto de partida do Tab.
   */
  const aoClicar = (evento: MouseEvent) => {
    if (!ligada || evento.defaultPrevented || evento.button !== 0 || evento.detail === 0) return
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    const link = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || !link.hash || link.origin !== location.origin || link.pathname !== location.pathname) return
    const alvo = document.getElementById(decodeURIComponent(link.hash.slice(1)))
    if (!alvo || travada()) return
    evento.preventDefault()
    // o endereço muda como mudaria com o link (e o voltar do navegador volta para onde estava)
    if (location.hash !== link.hash) history.pushState(null, '', link.hash)
    const recuo = (Number.parseFloat(getComputedStyle(raiz).scrollPaddingTop) || 0) + (Number.parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0)
    if (parada()) pararEm(window.scrollY)
    destino = Math.min(maiorRolagem(), Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - recuo))
    chegada = CHEGADA.link
    velocidadeMaxima = VELOCIDADE_DO_LINK
  }

  /** Um elemento por dentro do alvo rola na direção `dy` por conta própria (uma lista com rolagem)? */
  function rolaPorDentro(alvo: EventTarget | null, dy: number): boolean {
    for (let elemento = alvo instanceof Element ? alvo : null; elemento && elemento !== raiz && elemento !== document.body; elemento = elemento.parentElement) {
      if (elemento.scrollHeight <= elemento.clientHeight + 1) continue
      const { overflowY } = getComputedStyle(elemento)
      if (overflowY !== 'auto' && overflowY !== 'scroll') continue
      if (dy > 0 ? elemento.scrollTop + elemento.clientHeight < elemento.scrollHeight - 1 : elemento.scrollTop > 0) return true
    }
    return false
  }

  const aoRolarRoda = (evento: WheelEvent) => {
    // o Ctrl com a roda (e a pinça do touchpad) é o zoom; de lado, é de alguma lista
    if (!ligada || evento.ctrlKey || Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return
    if (travada() || rolaPorDentro(evento.target, evento.deltaY)) return
    evento.preventDefault()
    const fator = evento.deltaMode === 1 ? LINHA : evento.deltaMode === 2 ? tela : 1
    chegada = CHEGADA.roda
    mover(evento.deltaY * fator)
  }

  const aoTocar = (evento: PointerEvent) => {
    if (!ligada || evento.pointerType !== 'touch') return
    // um segundo dedo é a pinça do zoom: o primeiro deixa de rolar
    if (!evento.isPrimary) {
      dedo = null
      return
    }
    // o dedo segura a página onde ela está (um embalo que corria para)
    pararEm(window.scrollY)
    dedo = { id: evento.pointerId, y: evento.clientY }
    amostras.length = 0
    amostras.push([evento.timeStamp, evento.clientY])
  }

  const aoArrastar = (evento: PointerEvent) => {
    if (!dedo || evento.pointerId !== dedo.id) return
    const dy = dedo.y - evento.clientY
    dedo.y = evento.clientY
    amostras.push([evento.timeStamp, evento.clientY])
    while (amostras.length > 2 && evento.timeStamp - (amostras[0]?.[0] ?? 0) > JANELA_DO_DEDO) amostras.shift()
    if (travada()) return
    mover(dy)
  }

  const aoSoltar = (evento: PointerEvent) => {
    if (!dedo || evento.pointerId !== dedo.id) return
    dedo = null
    // o navegador cancelou o toque (assumiu o gesto, como numa lista que rola de lado): sem embalo
    if (evento.type !== 'pointerup' || travada()) return
    const primeira = amostras[0]
    const ultima = amostras.at(-1)
    if (!primeira || !ultima || ultima[0] - primeira[0] < 8) return
    // a velocidade com que o dedo saiu da tela (px/s, para baixo na página é positivo)
    const saida = ((primeira[1] - ultima[1]) / (ultima[0] - primeira[0])) * 1000
    chegada = CHEGADA.embalo
    const maxima = VELOCIDADE * tela
    if (Math.abs(saida) > 50) mover(Math.max(-maxima, Math.min(maxima, saida)) * CHEGADA.embalo)
  }

  // a página e a tela mudaram de tamanho: as medidas são refeitas quando precisarem
  const aoRedimensionar = () => {
    tela = window.innerHeight
    maxima = Number.NaN
  }
  const vigia = new ResizeObserver(aoRedimensionar)
  vigia.observe(document.body)

  const passivo = { passive: true }
  window.addEventListener('wheel', aoRolarRoda, { passive: false })
  document.addEventListener('click', aoClicar, { capture: true })
  window.addEventListener('pointerdown', aoTocar, passivo)
  window.addEventListener('pointermove', aoArrastar, passivo)
  window.addEventListener('pointerup', aoSoltar, passivo)
  window.addEventListener('pointercancel', aoSoltar, passivo)
  window.addEventListener('resize', aoRedimensionar, passivo)

  return {
    ligar(sim) {
      if (sim === ligada) return
      ligada = sim
      dedo = null
      // Ligada, o dedo não rola a página pelo navegador (rola por aqui); a pinça do zoom continua.
      if (sim) raiz.style.touchAction = 'pinch-zoom'
      else raiz.style.removeProperty('touch-action')
      pararEm(window.scrollY)
    },

    quadro(agora) {
      const dt = anterior ? Math.min((agora - anterior) / 1000, PASSO_MAXIMO) : 0
      anterior = agora
      if (!ligada || parada()) return
      if (travada()) {
        pararEm(window.scrollY)
        return
      }
      // a página foi para outro lugar sem passar por aqui (o teclado, um link do menu, a volta ao topo)
      const real = window.scrollY
      if (Math.abs(real - posta) > 1.5) {
        pararEm(real)
        return
      }
      if (dt <= 0) return
      const falta = destino - atual
      if (dedo) {
        // Com o dedo na tela, a página vai com ele, sem passar da velocidade máxima: a aceleração
        // limitada fica para o que anda sozinho (a roda e o embalo que o dedo deixa ao sair).
        const limite = VELOCIDADE * tela * dt
        const passo = Math.max(-limite, Math.min(limite, falta))
        atual += passo
        velocidade = passo / dt
      } else {
        // A velocidade que leva ao destino no tempo de chegada, mas não mais que a máxima nem que a
        // velocidade da qual ainda dá para frear até lá (veja FREIO), e mudando no máximo a aceleração.
        const aceleracao = ACELERACAO * tela
        const desejada = Math.sign(falta) * Math.min(Math.abs(falta) / chegada, velocidadeMaxima * tela, Math.sqrt(2 * FREIO * aceleracao * Math.abs(falta)))
        const mudanca = aceleracao * dt
        velocidade += Math.min(mudanca, Math.max(-mudanca, desejada - velocidade))
        atual += velocidade * dt
        // Chegou: passou do ponto no último passo, ou falta menos de um pixel (perto do destino, a
        // velocidade cai devagar, e o último pixel levava mais de um segundo).
        if ((falta >= 0 ? atual >= destino : atual <= destino) || Math.abs(destino - atual) < 1) {
          atual = destino
          velocidade = 0
        }
      }
      window.scrollTo({ top: atual, behavior: 'instant' })
      posta = window.scrollY
    },

    sincronizar() {
      pararEm(window.scrollY)
    },

    destruir() {
      vigia.disconnect()
      window.removeEventListener('wheel', aoRolarRoda)
      document.removeEventListener('click', aoClicar, { capture: true })
      window.removeEventListener('pointerdown', aoTocar)
      window.removeEventListener('pointermove', aoArrastar)
      window.removeEventListener('pointerup', aoSoltar)
      window.removeEventListener('pointercancel', aoSoltar)
      window.removeEventListener('resize', aoRedimensionar)
      raiz.style.removeProperty('touch-action')
    },
  }
}
