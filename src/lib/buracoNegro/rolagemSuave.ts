// A rolagem suave: a roda do mouse não move a página na hora, muda o destino dela, e a página anda até
// lá com a aceleração limitada e sem passar de uma velocidade máxima (veja passoSuave.ts, a conta que
// a página de um projeto também usa). O dedo arrasta a página com ele, também sem passar da
// velocidade máxima, e o embalo que ele deixa ao sair da tela anda como a roda. Por mais forte que
// seja o giro da roda ou o embalo do dedo, a página arranca, freia e chega aos poucos.
//
// Quem move a página é o laço de quadros da absorção (veja quadro, em index.ts), no começo de cada
// quadro, antes de ele preparar as fatias: a página nunca anda à frente do que a absorção vê, como
// acontecia com a rolagem do navegador, que corre fora do JavaScript e, rápida demais para o
// aparelho, levava o conteúdo à faixa antes de as fatias dele estarem prontas. Num quadro lento, a
// página anda menos (veja PASSO_MAXIMO), em vez de saltar. Com a página parada, o laço dorme: a roda,
// o dedo e os links o acordam quando dão à página para onde andar.
//
// Os links para outro ponto da página (o menu, os botões da apresentação), clicados com o mouse ou o
// dedo, também vão pela rolagem suave, um pouco mais rápida (veja VELOCIDADE_DO_LINK), e o que leva a
// página a um ponto pelo código vai do mesmo jeito (veja irPara e lib/rolarAte.ts: o cartão de um
// projeto, antes de virar a página dele). O teclado (inclusive o Enter num link) e a busca do
// navegador continuam com a rolagem do navegador: quando a página vai para outro lugar sem passar por
// aqui, o destino passa a ser onde ela está.
import { oferecerRolagem, QUASE_LA } from '../rolarAte.ts'
import { andar, CHEGADA, PASSO_MAXIMO, pxDaRoda, VELOCIDADE, VELOCIDADE_DO_LINK } from './passoSuave.ts'

/** As posições do dedo que contam para a velocidade com que ele sai da tela: as dos últimos ms. */
const JANELA_DO_DEDO = 80

export interface RolagemSuave {
  /** Liga ou desliga (desligada, a roda e o dedo rolam a página como sempre, pelo navegador). */
  ligar(sim: boolean): void
  /**
   * No começo de cada quadro, antes de qualquer leitura da rolagem: a página anda um passo de
   * `intervalo` s, o tempo desde o quadro anterior (0 no primeiro).
   */
  quadro(intervalo: number): void
  /**
   * A página ainda anda, ou acabou de chegar e quem esperava por ela ainda não soube: quem a move
   * precisa do próximo quadro.
   */
  andando(): boolean
  /** A página foi para outro lugar por conta própria (a volta ao topo, no fim do mergulho). */
  sincronizar(): void
  destruir(): void
}

/**
 * `acordar` é chamada quando a página passa a ter para onde andar (a roda, o dedo, um link): o laço de
 * quadros que a move (veja index.ts) dorme com ela parada.
 */
export function criarRolagemSuave(acordar: () => void): RolagemSuave {
  const raiz = document.documentElement
  let ligada = false
  /** Onde a página está, aonde vai e com que velocidade (px, px/s; para baixo é positivo). */
  let atual = window.scrollY
  let destino = atual
  let velocidade = 0
  /** A última posição que esta rolagem pôs na página: outra, e alguém mais rolou (veja quadro). */
  let posta = atual
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
  /**
   * Quem espera a página parar depois de mandá-la a um ponto (veja irPara): avisado quando ela para,
   * no destino ou onde outra coisa a deixar (a roda, o dedo, outro link, o navegador).
   */
  let quemEspera: (() => void) | null = null

  const parada = () => velocidade === 0 && destino === atual

  function avisar() {
    const aviso = quemEspera
    quemEspera = null
    aviso?.()
  }

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
    if (!parada()) acordar()
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
    if (!parada()) acordar()
  }

  /**
   * Leva a página até `alvo` (px de rolagem) como um link desta página a leva (veja aoClicar), e
   * avisa quando ela para. Se outra coisa a levar para outro lugar no caminho, o aviso vem quando ela
   * parar lá: quem pediu confere onde ela ficou.
   */
  function irPara(alvo: number): Promise<void> {
    avisar()
    if (!ligada || travada()) return Promise.resolve()
    if (parada()) pararEm(window.scrollY)
    destino = Math.min(maiorRolagem(), Math.max(0, alvo))
    chegada = CHEGADA.link
    velocidadeMaxima = VELOCIDADE_DO_LINK
    if (parada()) return Promise.resolve()
    const chegou = new Promise<void>((pronto) => {
      quemEspera = pronto
    })
    acordar()
    return chegou
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
    chegada = CHEGADA.roda
    mover(pxDaRoda(evento, tela))
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
      // (lida antes de mudar o touch-action: o navegador o propaga a todos os elementos, e a leitura
      // depois o obrigaria a refazer o estilo da página inteira na hora; assim, ele o refaz uma vez
      // só, junto com o que mais mudar até a próxima leitura, veja ajustarAncoras em index.ts)
      pararEm(window.scrollY)
      // Ligada, o dedo não rola a página pelo navegador (rola por aqui); a pinça do zoom continua.
      if (sim) raiz.style.touchAction = 'pinch-zoom'
      else raiz.style.removeProperty('touch-action')
      // e quem leva a página a um ponto pelo código vem por aqui, como os links
      oferecerRolagem(sim ? irPara : null)
      avisar()
    },

    quadro(intervalo) {
      const dt = Math.min(intervalo, PASSO_MAXIMO)
      // (parada, quem esperava por ela fica sabendo, no começo do quadro seguinte ao da chegada)
      if (!ligada || parada()) {
        avisar()
        return
      }
      if (travada()) {
        pararEm(window.scrollY)
        avisar()
        return
      }
      // a página foi para outro lugar sem passar por aqui (o teclado, um link do menu, a volta ao topo)
      const real = window.scrollY
      if (Math.abs(real - posta) > 1.5) {
        pararEm(real)
        avisar()
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
        // a roda e o embalo andam com a aceleração limitada (veja andar, em passoSuave.ts)
        const movimento = { atual, destino, velocidade, chegada, velocidadeMaxima }
        andar(movimento, dt, tela)
        ;({ atual, velocidade } = movimento)
      }
      window.scrollTo({ top: atual, behavior: 'instant' })
      posta = window.scrollY
      // quase lá, quem esperava já pode seguir: o resto anda a menos de um pixel por quadro
      if (Math.abs(destino - atual) < QUASE_LA) avisar()
    },

    andando: () => !parada() || quemEspera !== null,

    sincronizar() {
      pararEm(window.scrollY)
      avisar()
    },

    destruir() {
      if (ligada) oferecerRolagem(null)
      avisar()
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
