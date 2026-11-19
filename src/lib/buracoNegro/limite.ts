// O limite da rolagem: a página não desce além do ponto até onde a absorção está pronta (veja pronto,
// em absorcao.ts). Antes de o conteúdo chegar à faixa, cada fatia dele precisa estar no lugar e já
// desenhada, e cada bloco, com a sua foto. Num aparelho que não dá conta, rolando rápido (um celular,
// com o dedo), a página espera por elas: a velocidade máxima com que ela desce passa a ser a
// velocidade com que a absorção fica pronta, e a absorção sempre aparece.
//
// Quem segura a página é o próprio navegador. Ele rola a página fora do JavaScript, que fica um
// quadro ou mais para trás e não teria como pará-la a tempo; então o conteúdo da página (o #root) é
// recortado (overflow: clip) numa altura em que a maior rolagem possível é a do limite, e o navegador
// não passa dali, nem com o embalo do dedo, por mais rápido que ele seja. Com a rolagem no limite, o
// recorte fica na borda de baixo da tela: nada que estaria à vista some. O limite vai até onde a
// absorção ficou pronta ATRASO quadros antes: o navegador desenha cada fatia nova fora da tela, sem
// pressa, e ela precisa ter tido tempo de ficar desenhada antes de entrar na faixa.
//
// Mudar o limite tem custo: a altura da página muda, e o navegador refaz a rolagem e o que depende
// dela. Mudando a cada quadro, num celular emulado (a CPU 6 vezes mais lenta), a thread principal caía
// para menos da metade do ritmo; de 4 em 4 quadros, já não fazia diferença. Então ele muda pouco: só
// quando a rolagem chega perto dele, de uma vez até onde a absorção está pronta, e não mais que uma
// vez a cada INTERVALO ms; e a absorção mantém prontas as fatias até ele (veja maximo), para ele
// quase nunca precisar recuar.
//
// O embalo do dedo que bate no limite acaba ali (o navegador o encerra na borda), e a página pararia
// de repente. Daqui ele continua, no passo em que o limite avança, perdendo velocidade como o do
// navegador: rolando rápido, a página anda no ritmo da absorção, em vez de parar. E o limite muda o
// mínimo possível com o dedo na tela: o Chrome cancela o embalo que começa logo depois de a altura da
// página mudar, e um limite mudando a cada quadro de arrasto tirava o embalo de quase todo gesto.
//
// O limite vale para a rolagem do dedo, da roda e do botão do meio. Os saltos (os links do menu, o
// teclado, a busca do navegador) não esperam: quem pula para longe não vê o caminho, e o navegador
// decide aonde vai no começo do salto, sem esperar o limite avançar.

/**
 * Quantos quadros da página o limite espera para deixar a rolagem chegar a uma fatia nova. A fatia
 * espera a vez fora da tela, logo acima dela (veja ACIMA, em absorcao.ts), e o navegador a desenha
 * ali, mas não no mesmo quadro em que ela foi posta: sem a espera, ela podia entrar na faixa vazia.
 */
const ATRASO = 2
/**
 * O limite só avança quando a rolagem chega a esta fração da tela dele: com o dedo na tela e sem ele
 * (veja deveAvancar). Com o dedo, mais perto, para ele quase nunca mudar no meio de um arrasto.
 */
const PERTO = { dedo: 0.25, solto: 0.6 }
/**
 * O menor avanço do limite (em frações da tela), a não ser com a página parada ou quase chegando nele:
 * avanços pequenos e seguidos custariam caro, e não adiantam.
 */
const PASSO = 0.25
/** O menor intervalo (ms) entre duas mudanças do limite. */
const INTERVALO = 150
/**
 * Com a rolagem parada há este tempo (ms), o limite avança até onde a absorção está pronta, qualquer
 * que seja o avanço.
 */
const PARADA = 150
/**
 * O embalo que continua daqui (veja continuar): a velocidade dele cai a 37% a cada DECAIMENTO s, como
 * a do embalo do navegador, e ele acaba abaixo de VELOCIDADE_FINAL px/s.
 */
const DECAIMENTO = 0.35
const VELOCIDADE_FINAL = 60
/** Em quanto tempo (s) a medida do ritmo da absorção acompanha o que ela fica pronta (veja ritmo). */
const SUAVIZAR_RITMO = 0.5
/**
 * A velocidade do dedo que sai da tela é medida nos últimos JANELA_DO_DEDO ms; abaixo de
 * EMBALO_MINIMO px/s (ou parado por mais da metade da janela), ele não deixa embalo.
 */
const JANELA_DO_DEDO = 100
const EMBALO_MINIMO = 300
/**
 * Quanto esperar (ms) depois de o dedo sair da tela para concluir que o embalo do navegador não
 * começou ou foi cancelado (veja continuar): ele leva um quadro da tela para começar a andar.
 */
const ESPERA_DO_EMBALO = 40
/** As teclas que sozinhas não rolam a página (as outras soltam o limite, veja largar). */
const MODIFICADORAS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock'])

export interface Limite {
  /** Mede a página e a tela de novo (depois de mudanças no tamanho delas). */
  medir(): void
  /**
   * A cada quadro da página, depois de a absorção se preparar: `pronto` é a rolagem até onde ela está
   * pronta (Infinity se nada mais falta), `rolagem` a deste quadro e `dt` o tempo desde o anterior (s).
   */
  quadro(pronto: number, rolagem: number, dt: number): void
  /**
   * A maior rolagem que o limite deixa agora (Infinity, sem limite). A absorção mantém prontas as
   * fatias até ela: senão, com a página mais lenta, ela as tiraria, e o limite teria de recuar.
   */
  readonly maximo: number
  /** Tira o limite (a absorção parou). */
  soltar(): void
  /** A última rolagem foi a do dedo (ou, antes de qualquer uma, o aparelho é de toque). */
  readonly toque: boolean
  destruir(): void
}

/** O conteúdo da página, enquanto está recortado no limite. */
let recortado: HTMLElement | null = null

/**
 * A altura da página (px), a de verdade, até o fim do espaço do mergulho: com o limite, a página
 * parece acabar nele (veja aplicar).
 */
export function alturaDaPagina(): number {
  const raiz = document.documentElement
  if (!recortado) return raiz.scrollHeight
  return Math.max(raiz.scrollHeight, recortado.getBoundingClientRect().top + window.scrollY + recortado.scrollHeight)
}

export function criarLimite(): Limite {
  const raiz = document.documentElement
  const conteudo = document.getElementById('root')
  // sem overflow: clip (Safari antes do 16) não há como segurar a rolagem, e a absorção segue sem o limite
  const possivel = conteudo !== null && typeof CSS !== 'undefined' && CSS.supports('overflow', 'clip')

  let toque = window.matchMedia('(pointer: coarse)').matches
  /** A maior rolagem permitida agora (px), ou Infinity, sem limite. */
  let parede = Infinity
  /** Quando o limite mudou pela última vez (ms). */
  let mudouEm = Number.NEGATIVE_INFINITY
  /** Até onde a absorção estava pronta nos últimos quadros (veja ATRASO). */
  const prontos: number[] = []
  /** Solto por um salto (o teclado, um link), até a próxima rolagem do dedo, da roda ou do botão do meio. */
  let livre = false
  /** A página sem o efeito de fim de página (veja ajustarBorda). */
  let semBorda = false
  /** A rolagem do quadro anterior, e quando ela mudou pela última vez (ms). */
  let rolagemAntes = Number.NaN
  let rolouEm = Number.NEGATIVE_INFINITY
  /**
   * Quão rápido (px/s) a absorção fica pronta, suavizado: o passo do embalo que continua daqui, para
   * a página andar junto com o limite, sem chegar nele antes da hora (veja continuar).
   */
  let ritmo = 0
  let prontoAntes = Number.NaN

  // medidas (px CSS)
  /** A maior rolagem possível sem o limite. */
  let rolagemMaxima = Infinity
  /**
   * A altura da tela agora e a menor que ela pode ter (no celular, com a barra do navegador à vista).
   * Guardadas: ler a da janela no meio do quadro, com a absorção já mexendo nas fatias, obrigaria o
   * navegador a refazer o layout na hora.
   */
  let alturaDaTela = window.innerHeight
  let alturaDaJanela = window.innerHeight
  /** Onde começa o conteúdo na página. */
  let topoDoConteudo = 0

  // o dedo
  let dedos = 0
  /** As últimas posições do dedo na tela: [instante (ms), y]. */
  const amostras: [number, number][] = []
  /** O embalo que o dedo deixou (px/s, para baixo) e quando, enquanto ele pode estar correndo. */
  let embalo: { velocidade: number; desde: number } | null = null
  /** O embalo bateu no limite e continua daqui (veja continuar). */
  let seguindo = false
  /** A rolagem em que este embalo deixou a página no último quadro. */
  let ondeDeixou = 0
  /** O limite mudou com o dedo na tela, neste toque: o navegador pode ter cancelado o embalo. */
  let mexeuNoArrasto = false

  function medirJanela() {
    alturaDaTela = window.innerHeight
    alturaDaJanela = Math.min(alturaDaTela, raiz.clientHeight || alturaDaTela)
  }

  /** Quanto a rolagem máxima fica menor que o limite com a barra do navegador escondida (veja aplicar). */
  const encolhido = () => Math.max(0, alturaDaTela - alturaDaJanela)

  /**
   * Recorta o conteúdo para a maior rolagem possível ser `alvo` (ou tira o recorte, com Infinity). A
   * altura conta com a menor tela possível: no celular, quando a barra do navegador se esconde e a
   * tela cresce, a rolagem máxima diminui, e o limite continua valendo. O conteúdo recortado também
   * fica posicionado: um elemento absoluto sem ninguém posicionado em volta (o aviso só para leitores
   * de tela de quantos projetos o filtro mostra) se posicionaria pela janela, escaparia do recorte e
   * esticaria a página até ele.
   */
  function aplicar(alvo: number) {
    if (alvo === parede || !conteudo) return
    parede = alvo
    mudouEm = performance.now()
    if (Number.isFinite(alvo)) {
      conteudo.style.position = 'relative'
      conteudo.style.overflow = 'clip'
      conteudo.style.height = `${alvo + alturaDaJanela - topoDoConteudo}px`
      recortado = conteudo
    } else {
      conteudo.style.removeProperty('position')
      conteudo.style.removeProperty('overflow')
      conteudo.style.removeProperty('height')
      recortado = null
    }
  }

  /**
   * O limite avança para `novo`? Só com a rolagem perto dele (veja PERTO), e de PASSO em PASSO, a não
   * ser que a página esteja parada ou para chegar a ele antes do próximo avanço possível; e nunca antes
   * de INTERVALO ms desde a última mudança (veja o começo deste arquivo).
   */
  function deveAvancar(novo: number, rolagem: number, agora: number): boolean {
    if (agora - mudouEm < INTERVALO) return false
    if (agora - rolouEm >= PARADA) return true
    const resta = parede - encolhido() - rolagem
    if (resta > alturaDaJanela * (dedos > 0 ? PERTO.dedo : PERTO.solto)) return false
    return novo - parede >= alturaDaJanela * PASSO || resta <= Math.max(2, (ritmo * INTERVALO) / 1000)
  }

  /**
   * Sem o efeito de fim de página (o esticão ou o brilho do Android, o elástico do iPhone) enquanto há
   * limite: o embalo que bate nele o mostraria, e a página pareceria ter acabado. No topo da página ele
   * fica, com o puxar para recarregar.
   */
  function ajustarBorda(rolagem: number) {
    const sem = Number.isFinite(parede) && rolagem > 0
    if (sem === semBorda) return
    semBorda = sem
    if (sem) raiz.style.overscrollBehaviorY = 'none'
    else raiz.style.removeProperty('overscroll-behavior-y')
  }

  function pararEmbalo() {
    embalo = null
    seguindo = false
  }

  /**
   * O embalo do dedo que o limite interrompeu continua daqui: a cada quadro, a página desce o que a
   * velocidade dele pede, até o limite, e a velocidade cai como no embalo do navegador. Perto do limite,
   * ela anda no ritmo em que a absorção fica pronta: chegando nele de uma vez, a página esperaria o
   * próximo avanço, aos trancos. Acaba quando a velocidade fica pequena, com o dedo de volta na tela ou
   * com qualquer outra rolagem.
   */
  function continuar(rolagem: number, dt: number, paredeAntes: number, agora: number) {
    if (!embalo) return
    const velocidade = embalo.velocidade * Math.exp(-(agora - embalo.desde) / 1000 / DECAIMENTO)
    if (dedos > 0 || livre || velocidade < VELOCIDADE_FINAL) {
      pararEmbalo()
      return
    }
    const encolheu = encolhido()
    if (!seguindo) {
      // Enquanto o embalo do navegador corre, a página anda sozinha. Este assume quando ele acaba
      // antes da hora: bateu no limite (e acabou ali), ou foi cancelado porque o limite mudou com o
      // dedo na tela (a página parou logo depois de o dedo sair).
      const noLimite = rolagem >= paredeAntes - encolheu - 1
      const cancelado = mexeuNoArrasto && rolagem === rolagemAntes && agora - embalo.desde > ESPERA_DO_EMBALO
      if (!noLimite && !cancelado) return
      seguindo = true
    } else if (Math.abs(rolagem - ondeDeixou) > 1) {
      // a página foi para outro lugar (a volta ao topo, outra rolagem): o embalo acabou
      pararEmbalo()
      return
    }
    const resta = parede - encolheu - rolagem
    const passo = resta < (ritmo * INTERVALO) / 1000 ? Math.min(velocidade, Math.max(ritmo, VELOCIDADE_FINAL)) : velocidade
    const destino = Math.min(rolagem + passo * dt, parede - encolheu)
    if (destino > rolagem) window.scrollTo({ top: destino, behavior: 'instant' })
    ondeDeixou = window.scrollY
  }

  /** Uma rolagem do dedo, da roda ou do botão do meio: o limite volta a valer. */
  function armar() {
    livre = false
  }

  /** Um salto: o limite sai já, antes de o navegador decidir aonde vai. */
  function largar() {
    livre = true
    pararEmbalo()
    aplicar(Infinity)
    ajustarBorda(window.scrollY)
  }

  /** Sem limite, até a absorção recomeçar: o que ela tinha pronto não vale mais. */
  function soltar() {
    prontos.length = 0
    prontoAntes = Number.NaN
    ritmo = 0
    pararEmbalo()
    aplicar(Infinity)
    ajustarBorda(0)
  }

  const aoTocar = (evento: TouchEvent) => {
    toque = true
    armar()
    dedos = evento.touches.length
    amostras.length = 0
    mexeuNoArrasto = false
    pararEmbalo()
  }

  const aoArrastar = (evento: TouchEvent) => {
    const dedo = evento.touches[0]
    if (!dedo) return
    amostras.push([evento.timeStamp, dedo.clientY])
    while (amostras.length > 2 && evento.timeStamp - (amostras[0]?.[0] ?? 0) > JANELA_DO_DEDO) amostras.shift()
  }

  const aoSoltar = (evento: TouchEvent) => {
    dedos = evento.touches.length
    if (dedos > 0) return
    embalo = null
    const fim = evento.timeStamp
    const primeira = amostras.find(([t]) => fim - t <= JANELA_DO_DEDO)
    const ultima = amostras.at(-1)
    amostras.length = 0
    // parado antes de sair da tela, o dedo não deixa embalo
    if (!primeira || !ultima || ultima[0] <= primeira[0] || fim - ultima[0] > JANELA_DO_DEDO / 2) return
    // o dedo sobe, a página desce
    const velocidade = ((primeira[1] - ultima[1]) / (ultima[0] - primeira[0])) * 1000
    if (velocidade > EMBALO_MINIMO) embalo = { velocidade, desde: fim }
  }

  const aoRolarRoda = () => {
    toque = false
    armar()
    pararEmbalo()
  }

  const aoApertar = (evento: PointerEvent) => {
    if (evento.pointerType === 'mouse') toque = false
    // o botão do meio rola a página sozinho, sem parar, enquanto o mouse se afasta do ponto
    if (evento.button === 1) armar()
  }

  const aoTeclar = (evento: KeyboardEvent) => {
    if (!MODIFICADORAS.has(evento.key)) largar()
  }

  // Um link para outro ponto desta página (o menu, "Pular para o conteúdo"): o limite sai antes de o
  // navegador começar a rolar até lá.
  const aoClicar = (evento: MouseEvent) => {
    const link = evento.target instanceof Element ? evento.target.closest('a[href]') : null
    if (!(link instanceof HTMLAnchorElement) || !link.hash) return
    if (link.origin === location.origin && link.pathname === location.pathname) largar()
  }

  const passivo = { passive: true }
  window.addEventListener('touchstart', aoTocar, passivo)
  window.addEventListener('touchmove', aoArrastar, passivo)
  window.addEventListener('touchend', aoSoltar, passivo)
  window.addEventListener('touchcancel', aoSoltar, passivo)
  window.addEventListener('wheel', aoRolarRoda, passivo)
  window.addEventListener('pointerdown', aoApertar, passivo)
  window.addEventListener('keydown', aoTeclar, passivo)
  document.addEventListener('click', aoClicar, { capture: true, passive: true })
  window.addEventListener('resize', medirJanela, passivo)

  return {
    get toque() {
      return toque
    },

    get maximo() {
      return parede
    },

    medir() {
      medirJanela()
      if (!conteudo) return
      topoDoConteudo = conteudo.getBoundingClientRect().top + window.scrollY
      rolagemMaxima = alturaDaPagina() - alturaDaJanela
      // o recorte de agora, refeito com as medidas novas (a tela pode ter mudado de altura)
      const atual = parede
      parede = Number.NaN
      aplicar(atual)
    },

    quadro(pronto, rolagem, dt) {
      if (!possivel) return
      const agora = performance.now()
      if (rolagem !== rolagemAntes) rolouEm = agora
      prontos.push(pronto)
      while (prontos.length > ATRASO + 1) prontos.shift()
      // o que já estava pronto ATRASO quadros atrás e continua pronto
      const ate = Math.min(...prontos)
      if (Number.isFinite(ate) && Number.isFinite(prontoAntes) && dt > 0) {
        ritmo += (Math.max(0, ate - prontoAntes) / dt - ritmo) * (1 - Math.exp(-dt / SUAVIZAR_RITMO))
      }
      prontoAntes = ate
      let alvo = parede
      if (livre) alvo = Infinity
      else {
        // nunca antes da rolagem de agora (a página voltaria para trás)
        let novo = Math.max(ate, rolagem)
        if (novo >= rolagemMaxima) novo = Infinity
        // Recuar é raro (a absorção mantém pronto o que o limite já deixava, veja maximo) e não espera;
        // avançar, só quando vale a pena (veja deveAvancar).
        if (novo < parede || (novo > parede && deveAvancar(novo, rolagem, agora))) alvo = novo
      }
      const paredeAntes = parede
      aplicar(alvo)
      if (dedos > 0 && parede !== paredeAntes) mexeuNoArrasto = true
      continuar(rolagem, dt, paredeAntes, agora)
      rolagemAntes = rolagem
      ajustarBorda(rolagem)
    },

    soltar,

    destruir() {
      soltar()
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoArrastar)
      window.removeEventListener('touchend', aoSoltar)
      window.removeEventListener('touchcancel', aoSoltar)
      window.removeEventListener('wheel', aoRolarRoda)
      window.removeEventListener('pointerdown', aoApertar)
      window.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('click', aoClicar, { capture: true })
      window.removeEventListener('resize', medirJanela)
    },
  }
}
