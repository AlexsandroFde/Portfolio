import { definirBuracoNegroAnimado, tocarOnda } from '../som/index.ts'
import { criarAbsorcao, temBlocos, type Cena as CenaDaAbsorcao, type Folga } from './absorcao.ts'
import { VARIAVEL_DA_BEIRA } from './beira.ts'
import { forcaEm, type Faixa } from './faixa.ts'
import { fotografarTopo, type Peca } from './fotos.ts'
import { definirQueda, quandoMedirMergulho, quandoVoltar, trechoDoMergulho, type Queda } from './mergulho.ts'
import type { Cores, DoMotor } from './motor.ts'
import { criarPonte } from './ponte.ts'
import type { Rgb, Rgba } from './renderizador.ts'
import { aparecerAoRolar, criarRelogio } from './rolagem.ts'
import { criarRolagemSuave } from './rolagemSuave.ts'
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
/**
 * A foto do topo do site, para a volta ao topo (veja fotografarTopo): quanto ela espera (ms) depois
 * de o que ela mostra mudar (as transições da troca de tema, o redimensionamento), e de novo, se a
 * página não estiver como no topo (no meio da volta, com o menu do celular aberto).
 */
const ESPERA_DA_FOTO = { mudou: 600, deNovo: 1500 }
/**
 * Quanto além do fim da entrada (ms) a tela de cima espera o motor avisar que o site chegou: sem o
 * aviso, ela some e a página aparece do mesmo jeito.
 */
const ESPERA_DA_CHEGADA = 1500
/**
 * Em quanto tempo (ms) a tela de cima esmaece quando o site chega: a foto e a página mostram o mesmo,
 * mas o texto da página é suavizado em cores (subpixel) e o da foto, em cinza, e trocadas de uma vez
 * as letras piscariam.
 */
const SUMIR = 160

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
  // Ancorado no main: começa no topo da página (o resto do que vem antes dele é fixo) e contém todo
  // o conteúdo absorvido (veja criarRelogio).
  const relogio = criarRelogio(document.querySelector('main'))
  const absorcao = criarAbsorcao(relogio)
  /** A roda e o dedo movem a página com a aceleração limitada, enquanto a absorção age (veja rolagemSuave.ts). */
  const rolagemSuave = criarRolagemSuave()
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  recipiente.append(canvas)
  /**
   * A régua da tela: um elemento fixo e invisível com a altura da tela grande (100lvh), a da tela
   * com a barra do navegador escondida, a mesma do recipiente solto (veja index.css). Preso no alto
   * da página, o recipiente fica com a altura da apresentação, e a régua não (veja alturaDaTela).
   */
  const regua = document.createElement('div')
  regua.setAttribute('aria-hidden', 'true')
  regua.setAttribute('data-regua-da-tela', '')
  regua.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none'
  recipiente.append(regua)
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
  /**
   * A tela de cima: na volta ao topo com a foto do topo do site, cobre a tela toda, cabeçalho
   * incluído (z-index 55, abaixo só do véu do mergulho), com o site chegando, desenhado pelo motor.
   * A página fica parada no topo, por baixo, já desenhada, e aparece quando ela se esvazia, com o site
   * no lugar (veja Queda, em mergulho.ts). Escondida no resto do tempo.
   */
  const telaDeCima = document.createElement('canvas')
  telaDeCima.className = 'print-hidden'
  telaDeCima.setAttribute('aria-hidden', 'true')
  telaDeCima.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:55;pointer-events:none;display:none'
  document.body.append(telaDeCima)
  /** As animações com que a cortina e a tampa aparecem ao rolar (veja prenderEntradas). */
  let entradas: Animation[] = []

  // medidas (px CSS)
  let alturaHero = 0
  let topo = 0                         // altura do cabeçalho fixo
  let largura = 0                      // tamanho do canvas
  let fimDoCaminho = 1                 // rolagem em que o conteúdo acabou e começa o mergulho
  let celula = 64
  /**
   * A altura da tela para a faixa, a força do puxão e o trajeto: a da tela grande (veja regua), e não
   * a da janela. No celular, a barra do navegador some e volta conforme a rolagem, e a janela muda de
   * altura junto: com ela mudavam a faixa, a força e o raio do buraco negro, e a absorção era refeita
   * do zero no meio da rolagem, e as fatias que iam aparecer podiam faltar até ficarem prontas de novo.
   * A tela grande só muda quando a janela muda de verdade (o celular girou, a janela do computador
   * mudou de tamanho).
   */
  let alturaDaTela = regua.offsetHeight || window.innerHeight

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
  /**
   * A última coisa usada foi o teclado (e não a roda, o mouse ou o dedo): só então o bloco com o
   * foco do teclado fica por cima da cortina (veja preparar, em absorcao.ts). Fechada a página de um
   * projeto pelo Esc, o foco volta ao botão do cartão e aparece; rolando com a roda, o cartão é
   * absorvido como os outros.
   */
  let peloTeclado = false
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
    telaDeCima,
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
      inicio: pixel(topo + Math.min(140, Math.max(96, alturaDaTela * 0.14))),
    }
  }

  /**
   * A rolagem a partir da qual o puxão tem a força toda: no topo da página nada é puxado (a
   * apresentação aparece inteira), e a força cresce ao longo do primeiro quarto de tela.
   */
  const rolagemPlena = () => alturaDaTela * 0.25

  /** As medidas de que o trajeto do buraco negro depende (veja trajeto.ts), e o raio dele no canto. */
  function medirPalco(): Palco & { raioNoCanto: number } {
    const palco: Palco = {
      largura: largura || recipiente.clientWidth || window.innerWidth,
      alturaTela: alturaDaTela,
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
   * A queda e a volta ao topo (veja mergulho.ts) ficam com o motor enquanto ele anima o buraco negro:
   * a entrada é marcada nele, e `cobriu` se cumpre quando ele avisa que o túnel já cobre a tela. Com a
   * foto do topo do site pronta no motor (e ainda valendo), é ele que desenha o site chegando, na tela
   * de cima, e `chegou` se cumpre quando o site chega e a tela de cima se esvazia.
   */
  let aoCobrir: ((cobriu: boolean) => void) | null = null
  let aoChegar: (() => void) | null = null
  let esperaDaChegada = 0
  /** A tela de cima esmaecendo (veja SUMIR), e a vez da entrada a que ela pertence. */
  let sumindo: Animation | null = null
  let vezDaEntrada = 0
  /**
   * O site chegou (ou a entrada com a foto foi desfeita): a tela de cima some, esmaecendo (o
   * navegador anima a opacidade dela, fora da thread principal) ou de uma vez, e a rolagem volta
   * quando ela já sumiu (antes disso, rolar descolaria a página da foto).
   */
  function chegar(esmaecer = false) {
    window.clearTimeout(esperaDaChegada)
    const vez = vezDaEntrada
    const fim = () => {
      if (vez !== vezDaEntrada) return
      telaDeCima.style.display = 'none'
      sumindo?.cancel()
      sumindo = null
      aoChegar?.()
      aoChegar = null
    }
    if (!esmaecer || telaDeCima.style.display === 'none') {
      fim()
      return
    }
    sumindo = telaDeCima.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SUMIR, easing: 'ease-in', fill: 'forwards' })
    sumindo.finished.then(fim, fim)
  }
  const queda: Queda = {
    entrar(inicio, duracao) {
      aoCobrir?.(false)
      chegar()
      vezDaEntrada++
      const comFoto = fotoNoMotor !== null && fotoNoMotor === chaveDaFoto()
      const marcar = (foto: boolean) => ponte.enviar({ tipo: 'entrada', inicio: performance.timeOrigin + inicio, duracao, comFoto: foto })
      const chegou = new Promise<void>((resolver) => {
        if (!comFoto) return
        aoChegar = resolver
        telaDeCima.style.display = ''
        esperaDaChegada = window.setTimeout(chegar, inicio + duracao + ESPERA_DA_CHEGADA - performance.now())
      })
      const cobriu = new Promise<boolean>((resolver) => {
        aoCobrir = resolver
        marcar(comFoto)
        window.setTimeout(() => {
          if (aoCobrir !== resolver) return
          aoCobrir = null
          resolver(false)
          // O motor não respondeu a tempo: a página traz o site ela mesma, e ele, quando voltar,
          // desenha sem a foto (a tela de cima, escondida, fica vazia).
          if (!comFoto) return
          marcar(false)
          window.clearTimeout(esperaDaChegada)
          telaDeCima.style.display = 'none'
          aoChegar = null
        }, ESPERA_DO_TUNEL)
      })
      return { comFoto, cobriu, chegou }
    },
  }

  // ---------- a foto do topo do site, para a volta ao topo ----------
  /** A chave da foto que o motor tem pronta (veja chaveDaFoto), ou null. */
  let fotoNoMotor: string | null = null
  /** A chave da última foto pedida (feita, enviada ou em andamento). */
  let fotoPedida: string | null = null
  let esperaDaFoto = 0

  /** O que muda a foto do topo: o tamanho da tela e a densidade dela, o tema e as fontes. */
  const chaveDaFoto = () =>
    `${largura}x${recipiente.clientHeight}@${window.devicePixelRatio || 1} ${cores.escuro ? 'escuro' : 'claro'} ${document.fonts?.status ?? ''}`

  /**
   * As peças do topo do site: o que o conteúdo mostra na primeira tela com a página no topo (as
   * seções que caem nela, na posição delas na página) e, por cima, o cabeçalho e o que flutua no
   * canto da tela (o outro idioma e o som), que o buraco negro também engole e que voltam com o site.
   */
  function pecasDoTopo(): Peca[] {
    const altura = recipiente.clientHeight
    const pecas: Peca[] = []
    const rolagem = window.scrollY
    for (const filho of document.querySelector('main')?.children ?? []) {
      if (!(filho instanceof HTMLElement)) continue
      const caixa = filho.getBoundingClientRect()
      const y = caixa.top + rolagem
      if (!caixa.width || y >= altura || y + caixa.height <= 0) continue
      pecas.push({ elemento: filho, x: caixa.left, y, largura: caixa.width, altura: caixa.height })
    }
    const cabecalho = document.querySelector('header')
    // (fixo no alto: sem as medidas da tela, que pegariam o puxão do mergulho)
    if (cabecalho) pecas.push({ elemento: cabecalho, x: 0, y: 0, largura: cabecalho.offsetWidth, altura: cabecalho.offsetHeight })
    for (const flutuante of document.querySelectorAll<HTMLElement>('[data-flutuante]')) {
      if (!flutuante.offsetWidth) continue
      pecas.push({ elemento: flutuante, x: flutuante.offsetLeft, y: flutuante.offsetTop, largura: flutuante.offsetWidth, altura: flutuante.offsetHeight })
    }
    return pecas
  }

  /**
   * O cabeçalho como ele é no topo, sem a marca de página rolada nem a seção ativa no menu; e o que
   * flutua, à vista (no fim do mergulho, ele está marcado como engolido).
   */
  function comoNoTopo(copia: HTMLElement) {
    copia.removeAttribute('data-rolado')
    copia.removeAttribute('data-absorvido')
    for (const ativo of copia.querySelectorAll('[aria-current]')) ativo.removeAttribute('aria-current')
  }

  /** Pede uma foto nova do topo, se o que ela mostra mudou, para depois das transições. */
  function pedirFoto() {
    if (preso || desligado || !motorPronto) return
    const chave = chaveDaFoto()
    if (chave === fotoPedida) return
    window.clearTimeout(esperaDaFoto)
    esperaDaFoto = window.setTimeout(() => void fazerFoto(), ESPERA_DA_FOTO.mudou)
  }

  async function fazerFoto() {
    if (preso || desligado || !motorPronto) return
    const chave = chaveDaFoto()
    if (chave === fotoPedida) return
    // No meio da volta ao topo (a página anda), ou com o menu do celular aberto, a página não está
    // como no topo: fica para depois.
    if (raiz.style.overflow === 'hidden' || document.querySelector('#menu-movel:not([hidden])')) {
      esperaDaFoto = window.setTimeout(() => void fazerFoto(), ESPERA_DA_FOTO.deNovo)
      return
    }
    fotoPedida = chave
    const altura = recipiente.clientHeight
    try {
      const foto = await fotografarTopo(pecasDoTopo(), largura, altura, window.devicePixelRatio || 1, comoNoTopo)
      // (mudou de novo enquanto ela era feita: vale a próxima)
      if (desligado || chave !== chaveDaFoto()) {
        foto.close()
        if (fotoPedida === chave) fotoPedida = null
        pedirFoto()
        return
      }
      ponte.enviar({ tipo: 'foto', foto, largura, altura, chave }, [foto])
    } catch {
      // Sem a foto (onde o navegador não deixa ler a imagem do SVG, no Safari), a página traz o site
      // na volta ao topo, como sem o motor. A chave fica: não adianta tentar de novo.
    }
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

  /**
   * A absorção não age: sem fatias, cortina nem tampa (a página fica como sem o efeito), e a rolagem
   * volta a ser a do navegador.
   */
  function desligarAbsorcao() {
    absorcao.limpar()
    rolagemSuave.ligar(false)
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
      rolagemSuave.ligar(true)
    }
    reabsorver = true
    ajustarAncoras()
    // o som do fundo cresce com o buraco negro, e o da queda, só com ele andando
    definirBuracoNegroAnimado(!preso)
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
    const tela = alturaDaTela
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
      teclado: peloTeclado,
    })
  }

  /**
   * Os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o alto da
   * tela, onde ela seria engolida (o index.css usa a variável no scroll-padding-top).
   */
  function ajustarAncoras() {
    if (preso) {
      soltarVariaveis()
      return
    }
    // Toda seção tem pelo menos 5rem de respiro antes do título: ela pode parar 4rem dentro da
    // faixa sem que nada dela seja puxado.
    const respiro = 4 * (Number.parseFloat(getComputedStyle(raiz).fontSize) || 16)
    raiz.style.setProperty('--topo-livre', `${Math.ceil(Math.max(faixa().inicio - respiro, topo + 24))}px`)
    // a beira da cortina, para quem precisa saber o que da página está à vista (veja beira.ts)
    raiz.style.setProperty(VARIAVEL_DA_BEIRA, `${faixa().inicio}px`)
  }

  /** Sem a absorção, a página fica como sem o efeito: sem o recuo das âncoras e sem beira. */
  function soltarVariaveis() {
    raiz.style.removeProperty('--topo-livre')
    raiz.style.removeProperty(VARIAVEL_DA_BEIRA)
  }

  const remedir = () => {
    if (!comecou || !motorPronto || desligado) return
    alturaHero = hero.offsetHeight
    alturaDaTela = regua.offsetHeight || window.innerHeight
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
    // o topo do site pode ter mudado (o tamanho da tela, as fontes)
    pedirFoto()
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
    // a página anda o passo da rolagem suave antes de qualquer leitura da rolagem neste quadro
    rolagemSuave.quadro(agora)
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
    chegar()
    pausar()
    desligarAbsorcao()
    soltarVariaveis()
    definirBuracoNegroAnimado(false)
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
      case 'foto':
        fotoNoMotor = mensagem.pronta ? mensagem.chave : null
        break
      case 'chegou':
        chegar(true)
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
    // o topo do site no tema novo, para a próxima volta
    pedirFoto()
  })
  aoMudarTema.observe(raiz, { attributes: true, attributeFilter: ['class'] })

  const aoMudarVisibilidade = () => {
    ponte.enviar({ tipo: 'visivel', visivel: !document.hidden })
    if (document.hidden) pausar()
    else retomar()
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  // O foco do teclado pode entrar num bloco que está na faixa sem a página rolar: ele sobe por cima
  // da cortina já no próximo quadro (veja preparar, em absorcao.ts). Uma tecla também conta: com o
  // foco de um clique num botão, ela faz o foco aparecer sem que ele saia do lugar (sem focusin). E
  // o foco só segura o bloco enquanto se navega pelo teclado (veja peloTeclado): a roda, um clique ou
  // um toque o devolvem à absorção. Uma tecla de modificação sozinha (o Ctrl do zoom, o Alt da troca
  // de janela) não é navegar.
  const aoMudarFoco = () => {
    reabsorver = true
  }
  const aoApertarTecla = (evento: KeyboardEvent) => {
    reabsorver = true
    if (evento.ctrlKey || evento.metaKey || evento.altKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(evento.key)) return
    peloTeclado = true
  }
  const aoUsarPonteiro = () => {
    if (!peloTeclado) return
    peloTeclado = false
    reabsorver = true
  }
  document.addEventListener('focusin', aoMudarFoco)
  document.addEventListener('focusout', aoMudarFoco)
  document.addEventListener('keydown', aoApertarTecla)
  window.addEventListener('wheel', aoUsarPonteiro, { capture: true, passive: true })
  window.addEventListener('pointerdown', aoUsarPonteiro, { capture: true, passive: true })

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
    rolagemSuave.sincronizar()
    rolagemAnterior = window.scrollY
    velocidade = 0
    reabsorver = true
    relogio.acertar(rolagemAnterior)
    enviarRolagem(rolagemAnterior, performance.now(), true)
  })

  // O ponteiro vai para o motor: a câmera o acompanha de leve, e o mouse é uma pequena massa que
  // curva a malha em volta dele (veja cena.glsl). Um toque (num aparelho com mouse e tela de toque)
  // não é o mouse passando, e o mouse que sai da janela leva a massa junto.
  const aoMoverPonteiro = (evento: PointerEvent) => {
    ponte.enviar({ tipo: 'ponteiro', x: evento.clientX, y: evento.clientY, dentro: evento.pointerType !== 'touch' })
  }
  const aoSairPonteiro = (evento: PointerEvent) => {
    if (evento.relatedTarget === null) ponte.enviar({ tipo: 'ponteiro', x: evento.clientX, y: evento.clientY, dentro: false })
  }
  if (ponteiroFino.matches) {
    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true })
    document.addEventListener('pointerout', aoSairPonteiro, { passive: true })
  }

  // Um clique solta uma onda gravitacional na malha (veja cena.glsl), na hora em que o botão desce.
  // Num toque, só quando o dedo sai sem ter arrastado: o dedo que rola a página não solta onda.
  let toque: { id: number; x: number; y: number; t: number } | null = null
  // A onda também soa, para quem ligou o som (veja lib/som).
  const soltarOnda = (evento: PointerEvent) => {
    if (preso || desligado || !motorPronto) return
    ponte.enviar({ tipo: 'onda', x: evento.clientX, y: evento.clientY, t: performance.timeOrigin + evento.timeStamp })
    tocarOnda(evento.clientX)
  }
  const aoApertar = (evento: PointerEvent) => {
    if (!evento.isPrimary) {
      toque = null
      return
    }
    if (evento.pointerType === 'touch') toque = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, t: evento.timeStamp }
    else if (evento.button === 0) soltarOnda(evento)
  }
  const aoSoltarToque = (evento: PointerEvent) => {
    if (!toque || evento.pointerId !== toque.id) return
    const { x, y, t } = toque
    toque = null
    if (evento.type === 'pointerup' && evento.timeStamp - t < 500 && Math.hypot(evento.clientX - x, evento.clientY - y) < 10) soltarOnda(evento)
  }
  window.addEventListener('pointerdown', aoApertar, { passive: true })
  window.addEventListener('pointerup', aoSoltarToque, { passive: true })
  window.addEventListener('pointercancel', aoSoltarToque, { passive: true })

  void aposEntrada(hero).then(() => {
    if (desligado) return
    comecou = true
    comecar()
    // as fontes mudam a largura dos textos
    void document.fonts?.ready.then(remedir)
  })

  return () => {
    desligado = true
    definirBuracoNegroAnimado(false)
    definirQueda(null)
    aoCobrir?.(false)
    aoCobrir = null
    chegar()
    window.clearTimeout(esperaDaFoto)
    pausar()
    cancelAnimationFrame(esperaMedida)
    cancelAnimationFrame(esperaBlocos)
    aoRedimensionar.disconnect()
    aoMudarPagina.disconnect()
    aoMudarTema.disconnect()
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    document.removeEventListener('focusin', aoMudarFoco)
    document.removeEventListener('focusout', aoMudarFoco)
    document.removeEventListener('keydown', aoApertarTecla)
    window.removeEventListener('wheel', aoUsarPonteiro, { capture: true })
    window.removeEventListener('pointerdown', aoUsarPonteiro, { capture: true })
    movimentoReduzido.removeEventListener('change', aoMudarMovimento)
    pararDeOuvirVolta()
    pararDeOuvirMergulho()
    window.removeEventListener('pointermove', aoMoverPonteiro)
    document.removeEventListener('pointerout', aoSairPonteiro)
    window.removeEventListener('pointerdown', aoApertar)
    window.removeEventListener('pointerup', aoSoltarToque)
    window.removeEventListener('pointercancel', aoSoltarToque)
    desligarAbsorcao()
    rolagemSuave.destruir()
    ponte.destruir()
    canvas.remove()
    regua.remove()
    cortina.remove()
    tampa.remove()
    telaDeCima.remove()
    soltarVariaveis()
    recipiente.removeAttribute('data-preso')
    recipiente.style.height = ''
  }
}
