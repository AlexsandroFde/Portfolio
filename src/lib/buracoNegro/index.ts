import { criarAbsorcao, temBlocos, type Cena as CenaDaAbsorcao, type Folga } from './absorcao.ts'
import { forcaEm, type Faixa } from './faixa.ts'
import { definirQueda, quandoMedirMergulho, quandoVoltar, trechoDoMergulho, type Queda } from './mergulho.ts'
import type { Cores, DoMotor } from './motor.ts'
import { criarPonte } from './ponte.ts'
import type { Rgb, Rgba } from './renderizador.ts'
import { aparecerAoRolar, criarRelogio } from './rolagem.ts'
import { caminhoDaPagina, raioNoCanto, type Palco } from './trajeto.ts'

/**
 * Com que antecedência (s) as fatias da absorção ficam presas à rolagem, prontas para entrar na
 * faixa. Não basta o quadro ou dois que o JavaScript fica para trás da rolagem: depois de presa, a
 * fatia ainda precisa ser desenhada pelo navegador, e rolando, com a página toda para desenhar, isso
 * leva alguns quadros. Com menos, a faixa ficava vazia logo acima da beira enquanto a página andava.
 */
const ANTECEDENCIA = 0.3
/**
 * A folga mínima à frente e atrás (px), com a página parada ou devagar (veja preparar). Cada fatia
 * presa à rolagem é uma animação que o navegador acompanha a cada quadro, mesmo esperando a vez:
 * com as fatias pré-renderizadas (uma foto já decodificada), elas ficam prontas logo, e a folga
 * pode ser curta.
 */
const FOLGA = { frente: 64, tras: 48 }
/** A maior velocidade de rolagem (px/s) levada em conta para a antecedência. */
const VELOCIDADE_MAXIMA = 6000
/**
 * A quantas telas daqui os blocos têm a foto refeita primeiro quando o original muda: para trás e
 * para a frente, no sentido da rolagem, e para cada lado com a página parada.
 */
const AQUECER = [0.75, 2.5, 1.5] as const
/**
 * Quanto tempo (ms) cada quadro gasta pondo no lugar fatias que ainda não vão aparecer. Rolando,
 * pouco: com o JavaScript ocupado os vídeos andam aos trancos (a rolagem, a absorção e o buraco
 * negro não: correm fora dele). A maior parte fica para quando a página está parada, que é quando
 * se lê.
 */
const ORCAMENTO = { rolando: 0.5, parada: 8 }
/**
 * A resolução do mapa dos raios (texels por rs, veja geodesicas.frag) em relação à imagem do buraco
 * negro no canto, a menor que ele tem na página, e os limites dela. O mapa é traçado uma vez e serve
 * a todos os tamanhos: o que ele guarda (o gás do disco, a névoa) é macio, e os contornos finos (a
 * sombra, o anel de luz) são desenhados na resolução da tela.
 */
const MAPA = { porPixel: 1.4, minima: 24, maxima: 48 }
/**
 * Quanto esperar (ms), na volta ao topo, o motor avisar que o túnel já cobre a tela (veja Queda, em
 * mergulho.ts): sem o aviso, a janela se abre no véu da página.
 */
const ESPERA_DO_TUNEL = 500

// Converte qualquer cor CSS em RGBA de 0 a 1 (o canvas 2D normaliza o texto da cor).
const sonda = document.createElement('canvas').getContext('2d')

function paraRgba(valor: string): Rgba {
  if (!sonda || !valor) return [0, 0, 0, 0]
  sonda.fillStyle = '#000'
  sonda.fillStyle = valor
  const normal = sonda.fillStyle
  if (normal.startsWith('#')) {
    const n = Number.parseInt(normal.slice(1), 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]
  }
  const [r = 0, g = 0, b = 0, a = 1] = (normal.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255, a]
}

/** Cores do tema atual, lidas das variáveis do index.css. */
function lerCores(): Cores {
  const raiz = document.documentElement
  const estilo = getComputedStyle(raiz)
  const rgb = (variavel: string): Rgb => {
    const [r, g, b] = paraRgba(estilo.getPropertyValue(variavel).trim())
    return [r, g, b]
  }
  return {
    linha: paraRgba(estilo.getPropertyValue('--line').trim()),
    tinta: rgb('--accent'),
    texto: rgb('--fg'),
    fundo: rgb('--bg'),
    escuro: raiz.classList.contains('dark'),
  }
}

/** Até onde vai o cabeçalho fixo, a partir do alto da tela (px CSS). */
function alturaDoCabecalho(): number {
  const cabecalho = document.querySelector('header')
  if (!cabecalho || getComputedStyle(cabecalho).position !== 'fixed') return 0
  return Math.max(0, cabecalho.getBoundingClientRect().bottom)
}

/** Espera as animações de entrada da apresentação terminarem (as medidas dependem da posição final). */
function aposEntrada(secao: HTMLElement): Promise<unknown> {
  const animacoes = secao
    .getAnimations({ subtree: true })
    .filter((animacao) => animacao.effect?.getComputedTiming().iterations !== Infinity)
  return Promise.race([
    Promise.allSettled(animacoes.map((animacao) => animacao.finished)),
    new Promise((resolver) => window.setTimeout(resolver, 2500)),
  ])
}

/**
 * Um canvas fixo no alto da tela, da altura da faixa da absorção (veja ajustarTamanho), para o motor
 * desenhar, no nível `nivel` (o z-index) da página. Fica escondido até a absorção começar.
 */
function criarCanvasFixo(nivel: number): HTMLCanvasElement {
  const tela = document.createElement('canvas')
  tela.className = 'print-hidden'
  tela.setAttribute('aria-hidden', 'true')
  tela.style.cssText = `position:fixed;left:0;top:0;width:100%;height:0;z-index:${nivel};pointer-events:none;display:none`
  document.body.append(tela)
  return tela
}

/**
 * Liga o buraco negro no fundo da página, num canvas criado dentro de `recipiente`. Ele fica no
 * canto de cima à direita, como um objeto muito distante, absorvendo o conteúdo que sobe até o alto
 * da tela e cuspindo de volta o que desce (ver absorcao.ts).
 *
 * Quem o desenha é o motor (motor.ts), num worker, fora da thread principal (veja ponte.ts): daqui
 * vão para ele as medidas da página, a rolagem a cada quadro, o ponteiro e o tema. A absorção, que
 * mexe na página, fica aqui.
 *
 * `aoAtivar` avisa quando o primeiro quadro foi desenhado, e quando o efeito deixa de funcionar.
 * Devolve a função que desliga tudo.
 */
export function iniciarBuracoNegro(recipiente: HTMLElement, aoAtivar: (ativo: boolean) => void): () => void {
  const hero = document.getElementById('topo')
  if (!hero) return () => {}

  const raiz = document.documentElement
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)')
  const relogio = criarRelogio()
  const absorcao = criarAbsorcao(relogio)
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  recipiente.append(canvas)
  /**
   * A cortina: cobre a faixa do alto da tela, onde o conteúdo é absorvido, com o que fica atrás dele
   * (o fundo da página e, copiado do canvas a cada desenho, o buraco negro e a malha). Por cima dela
   * só passam as fatias que a absorção desenha (e os títulos fixos das seções): o original continua
   * no lugar, sem máscara nem nada que mude com a rolagem, e some atrás dela exatamente na beira da
   * faixa, que é fixa na tela. Fica entre a página e a camada das fatias (z-index 40, veja
   * absorcao.ts). Quem desenha nela, fundo incluído, é o motor: com a altura da cortina em fração de
   * px CSS, um fundo em CSS passava um quarto de pixel da borda dela e aparecia como um fio sobre o
   * buraco negro.
   */
  const cortina = criarCanvasFixo(1)
  /**
   * A tampa: logo acima da camada das fatias, a mesma imagem da cortina, que as esmaece pelo caminho
   * e as apaga na sombra do buraco negro (veja desenharTampa, em motor.ts). Os títulos fixos das
   * seções e os blocos que a absorção põe por cima da cortina ficam por cima dela também.
   */
  const tampa = criarCanvasFixo(41)
  /** As animações com que a cortina e a tampa aparecem ao rolar (veja prenderEntradas). */
  let entradas: Animation[] = []

  // medidas (px CSS)
  let alturaHero = 0
  let topo = 0                         // altura do cabeçalho fixo
  let largura = 0                      // tamanho do canvas
  let fimDoCaminho = 1                 // rolagem em que o conteúdo acabou e começa o mergulho
  let celula = 64

  // Se a thread principal não der conta da absorção (ou o motor, do desenho), o buraco negro fica
  // parado no alto da página, como para quem prefere menos movimento.
  let lento = false
  let preso = false   // buraco negro preso ao topo da página, sem animação nem absorção
  let comecou = false
  /** O motor traçou o mapa dos raios e pode desenhar. */
  let motorPronto = false
  let desligado = false

  let pedido = 0
  let anterior = 0
  let rolagemAnterior = window.scrollY
  /** Quão rápido a página está rolando (px/s), suavizado: decide com que antecedência preparar as fatias. */
  let velocidade = 0
  // as medidas mudaram: a absorção precisa ser refeita mesmo sem rolagem
  let reabsorver = true
  let sentido = 0          // da última rolagem: 1 para baixo, -1 para cima
  // desempenho da thread principal, medido em janelas de ~1 s de quadros (os intervalos entre eles, em s)
  let janelaTempo = 0
  const janela: number[] = []
  let janelasLentas = 0
  let ignorar = 0

  const parado = () => lento || movimentoReduzido.matches
  const deveAnimar = () => comecou && motorPronto && !preso && !document.hidden && !desligado

  const ponte = criarPonte(
    canvas,
    cortina,
    tampa,
    {
      cores: lerCores(),
      // a imagem no canto é a menor que o buraco negro tem: o mapa fica um pouco mais fino que ela
      densidade: Math.min(
        MAPA.maxima,
        Math.max(MAPA.minima, Math.round((MAPA.porPixel * medirPalco().raioNoCanto * (window.devicePixelRatio || 1)) / 2.598)),
      ),
    },
    (mensagem) => aoMotor(mensagem),
  )

  /**
   * A faixa da tela onde o conteúdo é absorvido: uma tira fina no alto da tela, colada no
   * cabeçalho. O resto da página não é tocado. As beiras ficam em pixels inteiros da tela: a de
   * baixo é a beira da cortina, e o original e as fatias se encontram exatamente nela.
   */
  const faixa = (): Faixa => {
    const dpr = window.devicePixelRatio || 1
    const pixel = (v: number) => Math.round(v * dpr) / dpr
    return {
      frente: pixel(topo + 6),
      inicio: pixel(topo + Math.min(140, Math.max(96, window.innerHeight * 0.14))),
    }
  }

  /**
   * A rolagem a partir da qual o puxão tem a força toda: no topo da página nada é puxado (a
   * apresentação aparece inteira), e a força cresce ao longo do primeiro quarto de tela.
   */
  const rolagemPlena = () => window.innerHeight * 0.25

  /** As medidas de que o trajeto do buraco negro depende (veja trajeto.ts), e o raio dele no canto. */
  function medirPalco(): Palco & { raioNoCanto: number } {
    const palco: Palco = {
      largura: largura || recipiente.clientWidth || window.innerWidth,
      alturaTela: window.innerHeight,
      topo,
      fimDoCaminho,
      alturaHero,
      celula,
      mergulho: trechoDoMergulho(),
      rolagemMaxima: Math.max(0, raiz.scrollHeight - window.innerHeight),
    }
    return { ...palco, raioNoCanto: raioNoCanto(palco) }
  }

  /**
   * A queda e o túnel da volta ao topo (veja mergulho.ts) ficam com o motor enquanto ele anima o
   * buraco negro: a entrada é marcada nele, e a promessa se cumpre quando ele avisa que o túnel já
   * cobre a tela.
   */
  let aoCobrir: ((cobriu: boolean) => void) | null = null
  const queda: Queda = {
    entrar(inicio, duracao) {
      aoCobrir?.(false)
      return new Promise((resolver) => {
        aoCobrir = resolver
        ponte.enviar({ tipo: 'entrada', inicio: performance.timeOrigin + inicio, duracao })
        window.setTimeout(() => {
          if (aoCobrir !== resolver) return
          aoCobrir = null
          resolver(false)
        }, ESPERA_DO_TUNEL)
      })
    },
  }

  /**
   * A cortina e a tampa ficam invisíveis com a página no topo e aparecem junto com a camada das
   * fatias (veja aparecerAoRolar). A entrada é medida em pixels da tela, que mudam com o zoom: é
   * refeita a cada medida.
   */
  function prenderEntradas() {
    soltarEntradas()
    entradas = [cortina, tampa].map((tela) => aparecerAoRolar(relogio, tela))
  }

  function soltarEntradas() {
    for (const entrada of entradas) relogio.soltar(entrada)
    entradas = []
  }

  /** A absorção não age: sem fatias, cortina nem tampa (a página fica como sem o efeito). */
  function desligarAbsorcao() {
    absorcao.limpar()
    soltarEntradas()
    cortina.style.display = 'none'
    tampa.style.display = 'none'
  }

  function aplicarModo() {
    preso = parado()
    recipiente.toggleAttribute('data-preso', preso)
    recipiente.style.height = preso ? `${alturaHero}px` : ''
    ponte.enviar({ tipo: 'modo', preso })
    // parado, o buraco negro não mergulha: a volta ao topo fica com o véu da página
    definirQueda(preso ? null : queda)
    if (preso) desligarAbsorcao()
    else {
      // invisíveis com a página no topo desde já, antes de elas aparecerem
      if (!entradas.length) prenderEntradas()
      cortina.style.display = ''
      tampa.style.display = ''
    }
    reabsorver = true
    ajustarAncoras()
  }

  function ajustarTamanho() {
    largura = recipiente.clientWidth
    // A cortina e a tampa cobrem a faixa até a beira de baixo dela, onde acaba a camada das fatias.
    const dpr = window.devicePixelRatio || 1
    const { frente, inicio } = faixa()
    cortina.style.height = `${inicio}px`
    tampa.style.height = `${inicio}px`
    ponte.enviar({
      tipo: 'tamanho',
      tamanho: { largura, altura: recipiente.clientHeight, cortina: inicio, dpr },
    })
    ponte.enviar({ tipo: 'faixa', faixa: { frente, inicio }, plena: rolagemPlena() })
  }

  /**
   * O que a absorção precisa saber da tela. O conteúdo que sobe até a faixa do alto da tela é
   * puxado até o buraco negro, e quanto depende só da rolagem (veja rolagemPlena). O buraco negro
   * começa no canto e, ao longo da página, anda pelo alto da tela até o meio dela, aonde chega no fim
   * do conteúdo, quando começa o mergulho (veja trajeto.ts): ele se aproxima sem descer pela página,
   * onde ficaria atrás do texto e o conteúdo teria de descer até ele.
   */
  function cenaDaAbsorcao(): CenaDaAbsorcao {
    const plena = rolagemPlena()
    return {
      ...caminhoDaPagina(medirPalco()),
      faixa: faixa(),
      forca: (s) => forcaEm(plena, s),
      plena,
    }
  }

  /**
   * Deixa prontas as fatias do conteúdo que a rolagem pode levar à faixa: o desenho de cada posição
   * da página já vai calculado com elas, e quem o mostra, rolando devagar ou rápido, é o navegador.
   * Devolve quantas fatias novas foram criadas.
   */
  function preparar(s: number): number {
    if (preso) return 0
    const tela = window.innerHeight
    // As fatias que podem aparecer ficam presas à rolagem antes (veja ANTECEDENCIA), mais longe no
    // sentido da rolagem; para trás, o bastante para ela voltar. No começo da página, onde a força
    // ainda cresce, cada fatia tem o seu trajeto, mais caro de calcular: elas ficam prontas antes,
    // enquanto a página está parada no topo.
    const minimo = s < tela * 0.75 ? tela * 0.4 : 0
    const adiante = Math.min(velocidade * ANTECEDENCIA, tela * 0.9)
    const frente = Math.max(minimo, FOLGA.frente + adiante)
    const tras = Math.max(minimo, FOLGA.tras)
    const indo = velocidade > 0 ? sentido : 0
    const folga: Folga = indo > 0 ? [tras, frente] : indo < 0 ? [frente, tras] : [frente, frente]
    return absorcao.preparar(s, {
      folga,
      // o que pode aparecer nos próximos dois quadros não espera
      urgencia: Math.min(24 + velocidade * 0.035, tela * 0.2),
      orcamento: velocidade > 0 ? ORCAMENTO.rolando : ORCAMENTO.parada,
      // Os blocos a até algumas telas daqui têm a foto refeita primeiro quando mudam (o tema, o
      // mouse em cima), enquanto a rolagem ainda está longe deles. Mais telas à frente, no sentido
      // da rolagem, que atrás.
      aquecer:
        indo > 0
          ? [tela * AQUECER[0], tela * AQUECER[1]]
          : indo < 0
            ? [tela * AQUECER[1], tela * AQUECER[0]]
            : [tela * AQUECER[2], tela * AQUECER[2]],
    })
  }

  /**
   * Os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o alto da
   * tela, onde ela seria engolida (o index.css usa a variável no scroll-padding-top).
   */
  function ajustarAncoras() {
    if (preso) {
      raiz.style.removeProperty('--topo-livre')
      return
    }
    // Toda seção tem pelo menos 5rem de respiro antes do título: ela pode parar 4rem dentro da
    // faixa sem que nada dela seja puxado.
    const respiro = 4 * (Number.parseFloat(getComputedStyle(raiz).fontSize) || 16)
    raiz.style.setProperty('--topo-livre', `${Math.ceil(Math.max(faixa().inicio - respiro, topo + 24))}px`)
  }

  const remedir = () => {
    if (!comecou || !motorPronto || desligado) return
    alturaHero = hero.offsetHeight
    topo = alturaDoCabecalho()
    // o fim do conteúdo: onde começa o espaço vazio depois do rodapé (sem ele, o fim da página)
    const espaco = document.querySelector<HTMLElement>('.mergulho')
    fimDoCaminho = Math.max(
      1,
      espaco?.offsetHeight ? espaco.getBoundingClientRect().top + window.scrollY : raiz.scrollHeight - window.innerHeight,
    )
    celula = 4 * Number.parseFloat(getComputedStyle(raiz).fontSize) || 64
    aplicarModo()
    ajustarTamanho()
    ponte.enviar({ tipo: 'palco', palco: medirPalco() })
    if (!preso) {
      absorcao.definirCena(cenaDaAbsorcao())
      absorcao.medir()
      prenderEntradas()
      // na hora, e não no próximo quadro: um bloco que mudou de tamanho perdeu as fatias
      relogio.acertar(window.scrollY)
      preparar(window.scrollY)
    }
    enviarRolagem(window.scrollY, performance.now())
    ignorar = 2
  }

  /** A rolagem deste quadro da página vai para o motor (veja rolagemEm, em motor.ts). */
  function enviarRolagem(s: number, agora: number, salto = false) {
    ponte.enviar({ tipo: 'rolagem', s, t: performance.timeOrigin + agora, salto })
  }

  /**
   * Abaixo de 12 quadros por segundo na thread principal, a absorção não dá conta (as fatias chegam
   * tarde à faixa): o buraco negro fica parado de vez. As fatias são presas à rolagem com pelo menos
   * três décimos de segundo de antecedência (veja FOLGA e ANTECEDENCIA), então um quadro a cada 80 ms
   * ainda as põe no lugar a tempo. Cada janela de ~1 s é julgada pelo quadro típico, a mediana dos
   * intervalos, e não pela média: um engasgo isolado não é o aparelho que não dá conta. E engasgos
   * acontecem: quando um vídeo começa a tocar ou muda de camada, o Windows às vezes leva um ou dois
   * segundos para reorganizar a composição da tela, e pela média dois desses bastavam para parar o
   * efeito no meio da página. Nesses segundos a placa de vídeo fica ocupada, e cada quadro da
   * página que traz fatias novas espera por ela: a thread principal cai para uns 20 quadros por
   * segundo sem estar ocupada, e com o limite em 25 o efeito parava ao rolar um pouco mais rápido
   * pelos projetos. O desenho do buraco negro tem o seu próprio julgamento, no motor.
   */
  function avaliarDesempenho(intervalo: number) {
    // Os primeiros quadros depois de começar ou de mudar de tamanho custam mais, e um intervalo
    // muito longo é pausa (aba escondida), não lentidão.
    if (ignorar > 0) {
      ignorar--
      return
    }
    if (intervalo <= 0 || intervalo > 1) return
    janela.push(intervalo)
    janelaTempo += intervalo
    if (janelaTempo < 1) return

    // a mediana de baixo: numa janela com um engasgo e um quadro normal, vale o normal
    janela.sort((a, b) => a - b)
    const tipico = janela[Math.floor((janela.length - 1) / 2)] ?? 0
    janela.length = 0
    janelaTempo = 0
    // Abaixo de 6 quadros por segundo não há dúvida. Entre 6 e 12, só duas janelas seguidas contam.
    janelasLentas = tipico > 1 / 12 ? janelasLentas + 1 : 0
    if (janelasLentas < 2 && tipico <= 1 / 6) return
    ficarLento()
  }

  /** O aparelho não dá conta: o buraco negro fica parado no alto da página, sem absorção. */
  function ficarLento() {
    if (lento) return
    lento = true
    aplicarModo()
    pausar()
  }

  function laco(agora: number) {
    pedido = 0
    try {
      quadro(agora)
    } finally {
      // um erro num quadro (aparece no console) não pode parar a absorção
      if (deveAnimar()) pedido = requestAnimationFrame(laco)
    }
  }

  function quadro(agora: number) {
    const intervalo = anterior ? (agora - anterior) / 1000 : 0
    anterior = agora
    const dt = Math.min(intervalo, 0.1)

    const s = window.scrollY
    // primeiro de tudo, a rolagem vai para o motor, que desenha o buraco negro no ritmo da tela
    enviarRolagem(s, agora)
    const rolou = s !== rolagemAnterior
    if (rolou) sentido = Math.sign(s - rolagemAnterior)
    // A velocidade sobe logo (a rolagem que acelera precisa de fatias prontas mais longe já no quadro
    // seguinte) e desce devagar (a roda do mouse rola aos trancos). Um salto (um link do menu, a
    // tecla End) não é velocidade: a amostra tem um teto, senão o quadro do salto preparava fatias
    // para a página inteira.
    if (dt > 0) {
      const amostra = Math.min(Math.abs(s - rolagemAnterior) / dt, VELOCIDADE_MAXIMA)
      velocidade += (amostra - velocidade) * (1 - Math.exp(-dt / (amostra > velocidade ? 0.03 : 0.3)))
      if (velocidade < 1) velocidade = 0
    }
    rolagemAnterior = s
    // sem ScrollTimeline, as animações da absorção andam daqui (com ele, o navegador já as andou)
    relogio.acertar(s)

    // A absorção anda sozinha com a rolagem; daqui só se preparam as fatias que ela pode trazer: quando
    // a rolagem muda (e enquanto a folga encolhe depois dela), quando faltou tempo no quadro anterior
    // ou quando mudou algo dentro de um bloco.
    if (rolou || velocidade > 0 || reabsorver || absorcao.pendente()) {
      reabsorver = false
      // Depois de um salto (um link do menu, a tecla End) chegam blocos inteiros de
      // uma vez, e esse quadro pesa mais que os de rolar: ele não diz se o aparelho dá conta.
      if (preparar(s) > 6) ignorar = Math.max(ignorar, 2)
    }
    avaliarDesempenho(intervalo)
  }

  function retomar() {
    if (pedido || !deveAnimar()) return
    anterior = 0
    ignorar = 2
    janelaTempo = 0
    janela.length = 0
    janelasLentas = 0
    rolagemAnterior = window.scrollY
    pedido = requestAnimationFrame(laco)
  }

  function pausar() {
    cancelAnimationFrame(pedido)
    pedido = 0
  }

  /** Com o motor pronto e a entrada da apresentação terminada, o efeito começa. */
  function comecar() {
    if (!comecou || !motorPronto || desligado) return
    remedir()
    retomar()
  }

  /** O efeito para de vez (ou até o motor voltar): a página fica como sem ele, com a malha em CSS. */
  function suspender() {
    motorPronto = false
    definirQueda(null)
    aoCobrir?.(false)
    aoCobrir = null
    pausar()
    desligarAbsorcao()
    raiz.style.removeProperty('--topo-livre')
    aoAtivar(false)
  }

  function aoMotor(mensagem: DoMotor) {
    if (desligado) return
    switch (mensagem.tipo) {
      case 'pronto':
        motorPronto = true
        comecar()
        break
      case 'ativo':
        aoAtivar(true)
        break
      case 'falhou':
      case 'perdido':
        suspender()
        break
      case 'lento':
        ficarLento()
        break
      case 'cobriu':
        aoCobrir?.(true)
        aoCobrir = null
        break
    }
  }

  // ---------- observadores ----------
  let esperaMedida = 0
  const agendarMedida = () => {
    cancelAnimationFrame(esperaMedida)
    esperaMedida = requestAnimationFrame(remedir)
  }
  // a janela, a apresentação ou o resto da página mudaram de tamanho
  const aoRedimensionar = new ResizeObserver(agendarMedida)
  aoRedimensionar.observe(recipiente)
  aoRedimensionar.observe(hero)
  aoRedimensionar.observe(document.body)
  // o trecho do mergulho mudou (o espaço depois do rodapé foi medido de novo)
  const pararDeOuvirMergulho = quandoMedirMergulho(agendarMedida)

  // Blocos trocados na página (o filtro dos projetos recria a lista). Outras mudanças, como o
  // ícone de um vídeo que começou a tocar, não pedem novas medidas (a absorção refaz só a foto
  // daquele bloco).
  let esperaBlocos = 0
  const aoMudarPagina = new MutationObserver((mudancas) => {
    if (!mudancas.some((m) => [...m.addedNodes, ...m.removedNodes].some(temBlocos))) return
    cancelAnimationFrame(esperaBlocos)
    esperaBlocos = requestAnimationFrame(() => {
      if (!comecou || !motorPronto || preso) return
      absorcao.medir()
      preparar(window.scrollY)
    })
  })
  const principal = document.querySelector('main')
  if (principal) aoMudarPagina.observe(principal, { childList: true, subtree: true })

  // Troca de tema: o motor redesenha já, para a transição circular já pegar as cores novas.
  let cores = lerCores()
  const aoMudarTema = new MutationObserver(() => {
    const novas = lerCores()
    if (novas.escuro === cores.escuro && novas.tinta.join() === cores.tinta.join()) return
    cores = novas
    ponte.enviar({ tipo: 'cores', cores })
  })
  aoMudarTema.observe(raiz, { attributes: true, attributeFilter: ['class'] })

  const aoMudarVisibilidade = () => {
    ponte.enviar({ tipo: 'visivel', visivel: !document.hidden })
    if (document.hidden) pausar()
    else retomar()
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  // O foco do teclado pode entrar num bloco que está na faixa sem a página rolar: ele sobe por cima
  // da cortina já no próximo quadro (veja preparar, em absorcao.ts).
  const aoMudarFoco = () => {
    reabsorver = true
  }
  document.addEventListener('focusin', aoMudarFoco)
  document.addEventListener('focusout', aoMudarFoco)

  const aoMudarMovimento = () => {
    // (remedir prepara a absorção do zero: a página pode ter aberto já com o movimento reduzido)
    remedir()
    if (preso) pausar()
    else retomar()
  }
  movimentoReduzido.addEventListener('change', aoMudarMovimento)

  // A volta ao topo, no fim do mergulho, não é o leitor rolando para cima: sem jatos nem
  // velocidade, e o topo já desenhado para quando ele aparecer.
  const pararDeOuvirVolta = quandoVoltar(() => {
    rolagemAnterior = window.scrollY
    velocidade = 0
    reabsorver = true
    relogio.acertar(rolagemAnterior)
    enviarRolagem(rolagemAnterior, performance.now(), true)
  })

  const aoMoverPonteiro = (evento: PointerEvent) => {
    ponte.enviar({
      tipo: 'ponteiro',
      x: evento.clientX / window.innerWidth - 0.5,
      y: evento.clientY / window.innerHeight - 0.5,
    })
  }
  if (ponteiroFino.matches) window.addEventListener('pointermove', aoMoverPonteiro, { passive: true })

  void aposEntrada(hero).then(() => {
    if (desligado) return
    comecou = true
    comecar()
    // as fontes mudam a largura dos textos
    void document.fonts?.ready.then(remedir)
  })

  return () => {
    desligado = true
    definirQueda(null)
    aoCobrir?.(false)
    aoCobrir = null
    pausar()
    cancelAnimationFrame(esperaMedida)
    cancelAnimationFrame(esperaBlocos)
    aoRedimensionar.disconnect()
    aoMudarPagina.disconnect()
    aoMudarTema.disconnect()
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    document.removeEventListener('focusin', aoMudarFoco)
    document.removeEventListener('focusout', aoMudarFoco)
    movimentoReduzido.removeEventListener('change', aoMudarMovimento)
    pararDeOuvirVolta()
    pararDeOuvirMergulho()
    window.removeEventListener('pointermove', aoMoverPonteiro)
    desligarAbsorcao()
    ponte.destruir()
    canvas.remove()
    cortina.remove()
    tampa.remove()
    raiz.style.removeProperty('--topo-livre')
    recipiente.removeAttribute('data-preso')
    recipiente.style.height = ''
  }
}
