// A rolagem da página de um projeto (veja ProjectDialog.tsx), que não tem barra. Ela rola como o
// site: a roda passa pela mesma rolagem suave (veja passoSuave.ts), quando o site rola suave, e o
// dedo fica com a rolagem do navegador, que já tem o embalo dele. Aqui fica também o aviso de que o
// texto continua embaixo e, no fim dele, o puxão que fecha a página: continuar rolando depois do fim
// (com a roda, o touchpad ou o dedo) enche o anel em volta do botão de fechar, no pé da página; cheio,
// a página fecha, como pelo X. Só um puxão contínuo fecha: parado no meio, o anel se esvazia.
//
// Aqui ficam as contas e os eventos, sem React. A caixa que rola ganha as marcas que o CSS lê (veja
// marcar), e um laço de quadros anda a rolagem suave e mexe direto no anel, no pé e no texto.
import { andar, CHEGADA, PASSO_MAXIMO, pxDaRoda, VELOCIDADE, VELOCIDADE_DO_LINK, type Movimento } from '../../lib/buracoNegro/passoSuave.ts'
import { rolagemSuaveLigada } from '../../lib/rolarAte.ts'

/** Quanto (px) rolar com a roda ou o touchpad, depois do fim, para fechar: uns quatro trancos da roda. */
const PUXAO_DA_RODA = 360
/** Quanto (px) o dedo anda, depois do fim, para fechar. */
const PUXAO_DO_DEDO = 140
/** O máximo (px) que um evento da roda conta no puxão: um que role uma tela inteira não fecha de uma vez. */
const MAXIMO_POR_EVENTO = 150
/**
 * Um intervalo maior que este (ms) entre dois eventos da roda começa um gesto novo. O gesto que trouxe
 * a página ao fim não puxa: nem os últimos trancos de um giro rápido da roda nem o embalo do touchpad
 * (que continua mandando eventos depois que os dedos saem dele) a fecham sem querer. Puxa o gesto
 * seguinte, com ela já no fim.
 */
const NOVO_GESTO = 110
/**
 * Um arrasto que chega ao fim só puxa depois de o dedo segurar a página lá por este tempo (ms) e andar
 * mais devagar que DEDO_LENTO: o de um arrasto rápido, que chega ao fim e continua com o embalo da mão,
 * não a fecha. Um toque que já começa no fim puxa na hora.
 */
const ESPERA_DO_DEDO = 120
/** A velocidade (px/ms) abaixo da qual o dedo que chegou ao fim passa a puxar. */
const DEDO_LENTO = 1
/** As posições do dedo que contam para a velocidade dele: as dos últimos ms. */
const JANELA_DO_DEDO = 60
/**
 * Sem a roda girar por este tempo (ms), o puxão começa a voltar. Girada aos poucos, um tranco a cada
 * terço de segundo, ela ainda fecha a página; mais devagar, não.
 */
const PAUSA = 300
/** A rapidez (s) com que o puxão volta, solto: a constante de tempo da queda. */
const VOLTA = 0.25
/** A rapidez (s) com que o anel e o texto alcançam o puxão: amacia os trancos da roda, de uns 100 px cada. */
const ALCANCE = 0.04
/** A partir de que fração o anel conta como cheio (ele chega ao todo só aos poucos). */
const CHEIO = 0.96
/** Quanto (px) o texto sobe, no máximo, com o puxão da roda. */
const SUBIDA = 72
/** Até quantos px rolados a página conta como no alto, onde fica o convite para rolar. */
const NO_ALTO = 32

/** O dedo na tela, enquanto ele pode puxar. */
interface Dedo {
  id: number
  /** O toque começou com a página no fim (e ela não saiu de lá): puxa na hora. */
  comecouNoFim: boolean
  /** Desde quando (ms) o dedo segura a página no fim, se ela está lá. */
  noFimDesde: number | null
  /** Onde o dedo estava (px) quando o puxão começou a contar, se já começou. */
  inicio: number | null
  /** As últimas posições dele ([instante, y]), para a velocidade (veja JANELA_DO_DEDO). */
  amostras: [number, number][]
}

export interface PecasDaRolagem {
  /** A caixa que rola. Recebe as marcas para o CSS: data-mais e data-convite (veja marcar). */
  caixa: HTMLElement
  /** O que rola dentro dela: sobe um pouco com o puxão da roda, como a página que estica no fim. */
  pagina: HTMLElement
  /** O pé da página, com o botão de fechar: recebe o puxão, de 0 a 1, na variável --puxao. */
  pe: HTMLElement | null
  /** O arco em volta do botão, que se enche com o puxão. */
  arco: SVGCircleElement | null
}

export interface RolagemDaPagina {
  /** Desce `fracao` da altura da caixa, como um link leva a página do site (o convite para rolar). */
  descer(fracao: number): void
  /** Para de acompanhar a rolagem. O que está na tela fica como está: fechada, a página some assim. */
  parar(): void
}

/**
 * Acompanha a rolagem da página do projeto: anda a rolagem suave, marca na caixa se tem mais embaixo
 * e cuida do puxão no fim, que chama `fechar` (uma vez) quando o anel se enche.
 */
export function acompanharRolagem({ caixa, pagina, pe, arco }: PecasDaRolagem, fechar: () => void): RolagemDaPagina {
  // No computador, o navegador não estica nem quica a página no fim (veja o overscroll-behavior da
  // caixa, em ProjectDialog.tsx), e é o texto que sobe com o puxão da roda. Com o dedo, ele estica.
  const ponteiroFino = window.matchMedia('(pointer: fine)')
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)')
  const volta = arco ? 2 * Math.PI * arco.r.baseVal.value : 0
  /** A rolagem suave da caixa: onde ela está, aonde vai e com que velocidade (veja passoSuave.ts). */
  const movimento: Movimento = { atual: caixa.scrollTop, destino: caixa.scrollTop, velocidade: 0, chegada: CHEGADA.roda, velocidadeMaxima: VELOCIDADE }
  /** A última posição que a rolagem suave pôs na caixa: outra, e alguém mais a rolou (veja rolar). */
  let posta = caixa.scrollTop
  /** O puxão pedido e o que está na tela, que o alcança aos poucos (de 0 a 1). */
  let alvo = 0
  let exibido = 0
  /** O puxão veio da roda (o texto sobe) ou do dedo (o navegador estica a página). */
  let daRoda = false
  /** O instante (ms) do último evento da roda e de quando o puxão deixou de ser pedido. */
  let ultimaRoda = Number.NEGATIVE_INFINITY
  let soltoEm = Number.NEGATIVE_INFINITY
  /** O gesto da roda que trouxe a página ao fim não puxa (veja NOVO_GESTO). */
  let travada = true
  let noFim = false
  let dedo: Dedo | null = null
  let quadro = 0
  let anterior = 0
  let fechou = false

  const estaNoFim = () => caixa.scrollTop >= caixa.scrollHeight - caixa.clientHeight - 1
  const maiorRolagem = () => Math.max(0, caixa.scrollHeight - caixa.clientHeight)
  const parada = () => movimento.velocidade === 0 && movimento.destino === movimento.atual

  /**
   * As marcas na caixa, para o CSS: `data-mais` com texto embaixo (o degradê no pé) e `data-convite`
   * com ele e a página no alto (o convite para rolar).
   */
  function marcar() {
    const fim = estaNoFim()
    // chegou ao fim: o gesto da roda que a trouxe não puxa
    if (fim && !noFim) travada = true
    noFim = fim
    caixa.toggleAttribute('data-mais', !fim)
    caixa.toggleAttribute('data-convite', !fim && caixa.scrollTop <= NO_ALTO)
  }

  // ---------- a rolagem suave ----------

  /** Para a rolagem suave onde a caixa está. */
  function pararEm(onde: number) {
    movimento.atual = movimento.destino = posta = onde
    movimento.velocidade = 0
  }

  /** A caixa vai até `destino` px, chegando no tempo e com a velocidade máxima dados. */
  function seguir(destino: number, chegada: number, velocidadeMaxima: number) {
    movimento.destino = Math.min(maiorRolagem(), Math.max(0, destino))
    movimento.chegada = chegada
    movimento.velocidadeMaxima = velocidadeMaxima
    animar()
  }

  /** O destino anda `quanto` px a partir de onde a caixa está indo (a roda). */
  function mover(quanto: number) {
    // parada, ela pode ter sido rolada pelo navegador (o teclado, o dedo) desde a última vez
    if (parada()) pararEm(caixa.scrollTop)
    seguir(movimento.destino + quanto, CHEGADA.roda, VELOCIDADE)
  }

  /** A caixa vai até `destino` px como um link leva a página do site. */
  function irPara(destino: number) {
    if (parada()) pararEm(caixa.scrollTop)
    seguir(destino, CHEGADA.link, VELOCIDADE_DO_LINK)
  }

  /** Um elemento por dentro do alvo rola na direção `dy` por conta própria (uma lista com rolagem)? */
  function rolaPorDentro(alvoDoEvento: EventTarget | null, dy: number): boolean {
    for (let elemento = alvoDoEvento instanceof Element ? alvoDoEvento : null; elemento && elemento !== caixa; elemento = elemento.parentElement) {
      if (elemento.scrollHeight <= elemento.clientHeight + 1) continue
      const { overflowY } = getComputedStyle(elemento)
      if (overflowY !== 'auto' && overflowY !== 'scroll') continue
      if (dy > 0 ? elemento.scrollTop + elemento.clientHeight < elemento.scrollHeight - 1 : elemento.scrollTop > 0) return true
    }
    return false
  }

  /** Um passo da rolagem suave. Devolve se ela continua andando. */
  function rolar(dt: number): boolean {
    if (parada()) return false
    // a caixa foi para outro lugar sem passar por aqui (o teclado, o dedo, a busca do navegador)
    if (Math.abs(caixa.scrollTop - posta) > 1.5) {
      pararEm(caixa.scrollTop)
      return false
    }
    if (dt > 0) {
      andar(movimento, dt, window.innerHeight)
      caixa.scrollTo({ top: movimento.atual, behavior: 'instant' })
      posta = caixa.scrollTop
    }
    return !parada()
  }

  // ---------- o puxão no fim ----------

  function desenhar() {
    if (arco) arco.style.strokeDashoffset = String(volta * (1 - exibido))
    pe?.style.setProperty('--puxao', exibido.toFixed(4))
    // o texto sobe rápido no começo e cada vez mais devagar, como a página esticada
    const subida = daRoda && ponteiroFino.matches ? SUBIDA * (1 - (1 - exibido) ** 2) : 0
    pagina.style.transform = subida >= 0.1 ? `translateY(${-subida}px)` : ''
    pagina.style.willChange = exibido > 0 ? 'transform' : ''
  }

  /** Um passo do puxão. Devolve se ele continua andando. */
  function puxar(dt: number, agora: number): boolean {
    if (alvo === 0 && exibido === 0) return false
    // solto (a roda parou, o dedo saiu da tela) antes de encher, o puxão volta
    if (!dedo && alvo < 1 && agora - soltoEm > PAUSA) {
      alvo *= Math.exp(-dt / VOLTA)
      if (alvo < 0.002) alvo = 0
    }
    exibido += (alvo - exibido) * (1 - Math.exp(-dt / ALCANCE))
    if (Math.abs(alvo - exibido) < 0.002) exibido = alvo
    desenhar()
    if (alvo >= 1 && exibido >= CHEIO) {
      fechou = true
      fechar()
      return false
    }
    // (o dedo parado segura o puxão como está: o próximo movimento dele pede outro quadro)
    const segurado = dedo !== null && exibido === alvo
    return (alvo > 0 || exibido > 0) && !segurado
  }

  // ---------- o laço de quadros ----------

  const animar = () => {
    if (!quadro && !fechou) quadro = requestAnimationFrame(passo)
  }

  function passo(agora: number) {
    quadro = 0
    // (num quadro lento, a caixa anda menos, em vez de saltar)
    const dt = anterior ? Math.min((agora - anterior) / 1000, PASSO_MAXIMO) : 0
    anterior = agora
    const rolando = rolar(dt)
    const puxando = puxar(dt, agora)
    if (rolando || puxando) animar()
    else anterior = 0
  }

  // ---------- os eventos ----------

  const aoRolarRoda = (evento: WheelEvent) => {
    // (o Ctrl com a roda, e a pinça do touchpad, é o zoom; de lado, é de alguma lista)
    if (fechou || evento.ctrlKey || Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return
    if (evento.timeStamp - ultimaRoda > NOVO_GESTO) travada = false
    ultimaRoda = evento.timeStamp
    const quanto = pxDaRoda(evento, caixa.clientHeight)
    if (quanto === 0) return
    const suave = rolagemSuaveLigada()
    if (quanto > 0 && estaNoFim() && parada()) {
      // no fim: o puxão (não há mais o que rolar)
      if (suave) evento.preventDefault()
      if (travada || dedo) return
      daRoda = true
      alvo = Math.min(1, alvo + Math.min(quanto, MAXIMO_POR_EVENTO) / PUXAO_DA_RODA)
      soltoEm = evento.timeStamp
    } else if (quanto < 0 && alvo > 0) {
      // de volta, o puxão se desfaz antes de o texto subir
      evento.preventDefault()
      alvo = Math.max(0, alvo + Math.max(quanto, -MAXIMO_POR_EVENTO) / PUXAO_DA_RODA)
      soltoEm = evento.timeStamp
    } else if (suave && !rolaPorDentro(evento.target, quanto)) {
      // a roda muda o destino, e a caixa anda até lá aos poucos
      evento.preventDefault()
      mover(quanto)
      return
    } else return
    animar()
  }

  function soltarDedo(agora: number) {
    dedo = null
    // o puxão volta já, sem a pausa da roda
    soltoEm = agora - PAUSA
    animar()
  }

  const aoTocar = (evento: TouchEvent) => {
    if (fechou) return
    // o dedo segura a caixa onde ela está (a rolagem suave da roda, se andava, para)
    if (!parada()) pararEm(caixa.scrollTop)
    const [toque] = evento.touches
    // um segundo dedo (a pinça do zoom) solta o puxão
    if (evento.touches.length !== 1 || !toque) {
      if (dedo) soltarDedo(evento.timeStamp)
      return
    }
    const comecouNoFim = estaNoFim()
    dedo = {
      id: toque.identifier,
      comecouNoFim,
      noFimDesde: comecouNoFim ? evento.timeStamp : null,
      inicio: null,
      amostras: [[evento.timeStamp, toque.clientY]],
    }
  }

  /** A velocidade do dedo (px/ms) nos últimos JANELA_DO_DEDO ms. */
  function velocidadeDoDedo(amostras: readonly [number, number][]): number {
    const primeira = amostras[0]
    const ultima = amostras.at(-1)
    if (!primeira || !ultima || ultima[0] <= primeira[0]) return 0
    return Math.abs(ultima[1] - primeira[1]) / (ultima[0] - primeira[0])
  }

  const aoArrastar = (evento: TouchEvent) => {
    if (!dedo || fechou) return
    const { id, amostras } = dedo
    const toque = [...evento.touches].find((t) => t.identifier === id)
    if (!toque) return
    amostras.push([evento.timeStamp, toque.clientY])
    while (amostras.length > 2 && evento.timeStamp - (amostras[0]?.[0] ?? 0) > JANELA_DO_DEDO) amostras.shift()
    if (!estaNoFim()) {
      // o dedo voltou e a página saiu do fim: chegando de novo, ela chega arrastando
      dedo.comecouNoFim = false
      dedo.noFimDesde = null
      dedo.inicio = null
      alvo = 0
      animar()
      return
    }
    dedo.noFimDesde ??= evento.timeStamp
    if (dedo.inicio === null) {
      // chegou ao fim arrastando: o puxão espera o dedo segurar a página lá e desacelerar
      const segurou = evento.timeStamp - dedo.noFimDesde >= ESPERA_DO_DEDO && velocidadeDoDedo(amostras) < DEDO_LENTO
      if (!dedo.comecouNoFim && !segurou) return
      dedo.inicio = toque.clientY
    }
    daRoda = false
    alvo = Math.min(1, Math.max(0, (dedo.inicio - toque.clientY) / PUXAO_DO_DEDO))
    animar()
  }

  const aoSoltar = (evento: TouchEvent) => {
    if (!dedo) return
    const { id } = dedo
    if (![...evento.touches].some((t) => t.identifier === id)) soltarDedo(evento.timeStamp)
  }

  // o texto chegou (ou mudou de tamanho), a tela mudou de tamanho: as marcas são refeitas
  const vigia = new ResizeObserver(marcar)
  vigia.observe(caixa)
  vigia.observe(pagina)
  const passivo = { passive: true }
  caixa.addEventListener('scroll', marcar, passivo)
  caixa.addEventListener('wheel', aoRolarRoda, { passive: false })
  caixa.addEventListener('touchstart', aoTocar, passivo)
  caixa.addEventListener('touchmove', aoArrastar, passivo)
  caixa.addEventListener('touchend', aoSoltar, passivo)
  caixa.addEventListener('touchcancel', aoSoltar, passivo)
  marcar()

  return {
    descer(fracao) {
      const destino = caixa.scrollTop + caixa.clientHeight * fracao
      if (rolagemSuaveLigada()) irPara(destino)
      else caixa.scrollTo({ top: destino, behavior: menosMovimento.matches ? 'instant' : 'smooth' })
    },

    parar() {
      cancelAnimationFrame(quadro)
      quadro = 0
      vigia.disconnect()
      caixa.removeEventListener('scroll', marcar)
      caixa.removeEventListener('wheel', aoRolarRoda)
      caixa.removeEventListener('touchstart', aoTocar)
      caixa.removeEventListener('touchmove', aoArrastar)
      caixa.removeEventListener('touchend', aoSoltar)
      caixa.removeEventListener('touchcancel', aoSoltar)
    },
  }
}
