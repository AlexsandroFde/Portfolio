import { criarAbsorcao, temBlocos, type Alvo, type Cena as CenaDaAbsorcao, type Faixa, type Folga } from './absorcao.ts'
import { criarRenderizador, type Renderizador, type Rgb, type Rgba } from './renderizador.ts'
import { aparecerAoRolar, criarRelogio } from './rolagem.ts'

/**
 * O buraco negro fica no canto de cima à direita, logo abaixo do cabeçalho, com o centro um pouco
 * para dentro da tela (em frações do raio da sombra): aparece cerca de um terço dele, e o resto do
 * site fica livre.
 */
const CANTO = { x: 0.45, y: 0.45 }
/**
 * Ângulo da câmera acima do plano do disco, e a rotação da imagem na tela. O disco fica na
 * horizontal: a ponta esquerda, que é a que entra na tela, fica na altura da faixa de absorção, e o
 * conteúdo vai até ela de lado, sem descer pela página.
 */
const INCLINACAO = (24 * Math.PI) / 180
const GIRO = 0
/** Quanto a câmera ainda sobe do começo ao fim da página (rad): o disco se abre aos poucos. */
const SUBIDA = 0.08
/**
 * Sentido da rotação do disco: o lado esquerdo vem na direção da câmera e brilha mais. No canto da
 * tela é a ponta que fica à vista.
 */
const SENTIDO = -1
/** A malha sobe a pouco mais da metade da velocidade da página: fica entre o conteúdo e o buraco negro. */
const PARALAXE_MALHA = 0.55
/**
 * Por quanto tempo (ms) depois de cada passo a página ainda conta como rolando. Uma rolagem bem
 * lenta (o botão do meio, quase parado) não muda a posição a cada quadro, e a roda do mouse rola
 * aos trancos: nos dois casos, entre um passo e outro a rolagem continua em andamento.
 */
const PAUSA_DA_ROLAGEM = 250
/**
 * Em quanto tempo (s) a atividade acompanha a rolagem, subindo e descendo. Devagar de propósito: a
 * roda do mouse rola aos trancos, e o disco não pode pulsar a cada um deles.
 */
const ATIVIDADE = { sobe: 0.45, desce: 1.1 }
/**
 * Duração do ciclo de rotação do disco, em unidades de fase (a constante VOLTAS do shader vezes
 * 2π). A fase anda em laço dentro do ciclo: assim nunca cresce a ponto de perder precisão.
 */
const CICLO = 4000 * 2 * Math.PI
/**
 * Com que antecedência (s) as cópias da absorção ficam presas à rolagem, prontas para entrar na
 * faixa. Não basta o quadro ou dois que o JavaScript fica para trás da rolagem: depois de presa, a
 * cópia ainda precisa ser desenhada pelo navegador, e rolando, com a página toda para desenhar, isso
 * leva alguns quadros. Com menos, a faixa ficava vazia logo acima da beira enquanto a página andava.
 */
const ANTECEDENCIA = 0.3
/** A folga mínima à frente e atrás (px), com a página parada ou devagar (veja preparar). */
const FOLGA = { frente: 160, tras: 96 }
/** A maior velocidade de rolagem (px/s) levada em conta para a antecedência. */
const VELOCIDADE_MAXIMA = 6000
/**
 * A quantas telas daqui os blocos já têm as cópias prontas, guardadas: para trás e para a frente,
 * no sentido da rolagem, e para cada lado com a página parada.
 */
const AQUECER = [0.75, 2.5, 1.5] as const
/**
 * Quanto tempo (ms) cada quadro gasta preparando cópias que ainda não vão aparecer. Rolando, pouco:
 * cada cópia custa outro tanto depois, em estilo e pintura, e com o JavaScript ocupado o buraco
 * negro e os vídeos andam aos trancos (a rolagem e a absorção não: correm fora dele). A maior parte
 * fica para quando a página está parada, que é quando se lê.
 */
const ORCAMENTO = { rolando: 0.5, parada: 8 }

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

interface Cores {
  linha: Rgba
  tinta: Rgb
  texto: Rgb
  fundo: Rgb
  escuro: boolean
}

/** O buraco negro neste quadro, e de que ângulo ele é visto. */
interface Cena extends Alvo {
  /** Ângulo da câmera acima do plano do disco (rad). */
  inclinacao: number
  /** Rotação da imagem na tela (rad). */
  giro: number
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

const suave = (de: number, ate: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - de) / (ate - de)))
  return t * t * (3 - 2 * t)
}

/**
 * A cortina: cobre a faixa do alto da tela, onde o conteúdo é absorvido, com o que fica atrás dele
 * (o fundo da página e, copiado do canvas a cada desenho, o buraco negro e a malha). Por cima dela
 * só passam as cópias que a absorção desenha (e os títulos fixos das seções): o original continua
 * no lugar, sem máscara nem nada que mude com a rolagem, e some atrás dela exatamente na beira da
 * faixa, que é fixa na tela. Fica entre a página e a camada das cópias.
 */
function criarCortina(): HTMLCanvasElement {
  const cortina = document.createElement('canvas')
  cortina.className = 'print-hidden'
  cortina.setAttribute('aria-hidden', 'true')
  cortina.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:0;z-index:1;pointer-events:none;background-color:var(--bg);display:none'
  document.body.append(cortina)
  return cortina
}

/**
 * Liga o buraco negro no canvas do fundo da página. Ele fica no canto de cima à direita, como um
 * objeto muito distante, absorvendo o conteúdo que sobe até o alto da tela e cuspindo de volta o
 * que desce (ver absorcao.ts).
 *
 * `aoAtivar` avisa quando o primeiro quadro foi desenhado, e quando o efeito deixa de funcionar.
 * Devolve a função que desliga tudo.
 */
export function iniciarBuracoNegro(canvas: HTMLCanvasElement, aoAtivar: (ativo: boolean) => void): () => void {
  const hero = document.getElementById('topo')
  if (!hero) return () => {}

  let renderizador: Renderizador | null = criarRenderizador(canvas)
  if (!renderizador) return () => {}

  const raiz = document.documentElement
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)')
  const relogio = criarRelogio()
  const absorcao = criarAbsorcao(relogio)
  const cortina = criarCortina()
  const pincel = cortina.getContext('2d')
  /** A cortina aparece junto com a camada das cópias, ao primeiro pixel de rolagem. */
  let entradaDaCortina: Animation | null = null

  // medidas (px CSS)
  let alturaHero = 0
  let topo = 0                         // altura do cabeçalho fixo
  let largura = 0                      // tamanho do canvas
  let altura = 0
  let fimDaPagina = 1                  // rolagem máxima
  let celula = 64
  let cores = lerCores()

  // Qualidade: resolução da tela (até 2x). Se o aparelho não der conta, cai para 1x e, se ainda
  // assim sofrer, o buraco negro fica parado no alto da página (como para quem prefere menos movimento).
  let escalaLimite = 2
  let escala = 1
  let lento = false
  let preso = false   // canvas preso ao topo da página, sem animação
  let comecou = false
  let ativo = false
  let desligado = false

  let pedido = 0
  let anterior = 0
  let ultimoDesenho = 0
  let tempo = 0
  let fase = 0
  let rolagemAnterior = window.scrollY
  /** Quão rápido a página está rolando (px/s), suavizado: decide com que antecedência preparar as cópias. */
  let velocidade = 0
  // as medidas mudaram: a absorção precisa ser refeita mesmo sem rolagem
  let reabsorver = true
  // De -1 a 1: positiva enquanto a página rola para baixo (absorve), negativa para cima (cospe).
  // Segue o sentido da rolagem, e não a velocidade (veja quadro).
  let atividade = 0
  let sentido = 0          // da última rolagem: 1 para baixo, -1 para cima
  let ultimaRolagem = -Infinity
  let ultimoPonteiro = -Infinity
  // desempenho, medido em janelas de ~1 s de quadros (os intervalos entre eles, em s)
  let janelaTempo = 0
  const janela: number[] = []
  let janelasLentas = 0
  let ignorar = 0

  // Paralaxe leve com o mouse: a câmera acompanha o ponteiro.
  const alvo = { x: 0, y: 0 }
  const atual = { x: 0, y: 0 }

  const parado = () => lento || movimentoReduzido.matches
  const deveAnimar = () => comecou && !preso && !document.hidden && !desligado

  /** Raio da sombra: grande o bastante para a parte que fica à vista não sumir. */
  const raioNoCanto = () => Math.min(92, Math.max(46, Math.max(largura, window.innerHeight) * 0.058))

  /**
   * A faixa da tela onde o conteúdo é absorvido: uma tira fina no alto da tela, colada no
   * cabeçalho. O resto da página não é tocado. As beiras ficam em pixels inteiros da tela: a de
   * baixo é a beira da cortina, e o original e as cópias se encontram exatamente nela.
   */
  const faixa = (): Faixa => {
    const dpr = window.devicePixelRatio || 1
    const pixel = (v: number) => Math.round(v * dpr) / dpr
    return {
      frente: pixel(topo + 6),
      inicio: pixel(topo + Math.min(140, Math.max(96, window.innerHeight * 0.14))),
    }
  }

  /** O buraco negro na tela para a rolagem `s`: onde está, de que tamanho e de que ângulo é visto. */
  function cena(s: number): Cena {
    const raio = raioNoCanto()
    return {
      x: largura - raio * CANTO.x,
      y: topo + raio * CANTO.y,
      raio,
      // a câmera acompanha de leve o ponteiro e, ao longo da página, sobe um pouco
      inclinacao: INCLINACAO + Math.min(1, s / fimDaPagina) * SUBIDA - atual.y * 0.07,
      giro: GIRO + atual.x * 0.05,
    }
  }

  /** A absorção não age: sem cópias e sem cortina (a página fica como sem o efeito). */
  function desligarAbsorcao() {
    absorcao.limpar()
    if (entradaDaCortina) relogio.soltar(entradaDaCortina)
    entradaDaCortina = null
    cortina.style.display = 'none'
  }

  function aplicarModo() {
    preso = parado()
    canvas.toggleAttribute('data-preso', preso)
    canvas.style.height = preso ? `${alturaHero}px` : ''
    if (preso) desligarAbsorcao()
    else {
      // invisível com a página no topo desde já, antes de ela aparecer
      entradaDaCortina ??= aparecerAoRolar(relogio, cortina)
      cortina.style.display = ''
    }
    reabsorver = true
    ajustarAncoras()
  }

  function ajustarTamanho() {
    largura = canvas.clientWidth
    altura = canvas.clientHeight
    escala = Math.min(window.devicePixelRatio || 1, escalaLimite)
    const w = Math.max(1, Math.round(largura * escala))
    const h = Math.max(1, Math.round(altura * escala))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    // A cortina tem a resolução do canvas e a altura da faixa menos um pixel da tela. Nesse último
    // pixel, logo acima da beira, a máscara das cópias já vai sumindo (a beira dela não é um corte
    // exato); com a cortina ali, ele aparecia como um fio claro sobre o conteúdo. Sem ela, o que
    // aparece por baixo da cópia é o próprio original, no mesmo lugar.
    const alturaDaCortina = faixa().inicio - 1 / (window.devicePixelRatio || 1)
    const hc = Math.max(1, Math.min(h, Math.round(alturaDaCortina * escala)))
    if (cortina.width !== w || cortina.height !== hc) {
      cortina.width = w
      cortina.height = hc
    }
    cortina.style.height = `${alturaDaCortina}px`
  }

  /**
   * Desenha um quadro. `rolagem` é o scrollY, se ele já foi lido neste quadro: lido de novo depois
   * de a absorção mexer na página, ele obrigaria o navegador a refazer o layout ali mesmo.
   */
  function desenhar(rolagem?: number): boolean {
    if (!renderizador?.pronto() || !largura) return false

    const s = preso ? 0 : (rolagem ?? window.scrollY)
    const b = cena(s)
    renderizador.desenhar({
      largura,
      altura,
      centroX: b.x,
      centroY: b.y,
      raio: b.raio,
      celula,
      malhaX: (largura - celula) / 2,
      desloc: s * PARALAXE_MALHA,
      alturaHero,
      ciclo: fase / CICLO,
      tempo,
      inclinacao: b.inclinacao,
      giro: b.giro,
      sentido: SENTIDO,
      atividade,
      ...cores,
    })
    // O alto do quadro vai também para a cortina, no mesmo quadro (ela cobre a faixa com o que está
    // atrás da página ali). Uma cópia de imagem na placa de vídeo: desenhar o buraco negro duas
    // vezes custaria o traçado dos raios em dobro.
    if (!preso && pincel) {
      pincel.clearRect(0, 0, cortina.width, cortina.height)
      pincel.drawImage(canvas, 0, 0, cortina.width, cortina.height, 0, 0, cortina.width, cortina.height)
    }

    if (!ativo) {
      ativo = true
      aoAtivar(true)
    }
    return true
  }

  /**
   * O que a absorção precisa saber da tela. O conteúdo que sobe até a faixa do alto da tela é
   * puxado até o buraco negro, e quanto depende só da rolagem: no topo da página nada é puxado (a
   * apresentação aparece inteira), e a força cresce ao longo do primeiro quarto de tela.
   */
  function cenaDaAbsorcao(): CenaDaAbsorcao {
    const { x, y, raio } = cena(0)
    const plena = window.innerHeight * 0.25
    return { alvo: { x, y, raio }, faixa: faixa(), forca: (s) => suave(0, plena, s), plena }
  }

  /**
   * Deixa prontas as cópias do conteúdo que a rolagem pode levar à faixa: o desenho de cada posição
   * da página já vai calculado com elas, e quem o mostra, rolando devagar ou rápido, é o navegador.
   * Devolve quantas cópias novas foram criadas.
   */
  function preparar(s: number): number {
    if (preso) return 0
    const tela = window.innerHeight
    // As cópias que podem aparecer ficam presas à rolagem antes (veja ANTECEDENCIA), mais longe no
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
      // Os blocos a até algumas telas daqui ganham, com o tempo que sobra, todas as cópias que vão
      // usar, enquanto a rolagem ainda está longe deles: quando ela os trouxer, por mais rápida que
      // seja, as cópias só mudam de fatia, o que é barato. Criar dezenas de uma vez, quando o bloco
      // já está chegando, não dava tempo, e a faixa ficava vazia por alguns quadros. Mais telas à
      // frente, no sentido da rolagem, que atrás.
      aquecer:
        indo > 0
          ? [tela * AQUECER[0], tela * AQUECER[1]]
          : indo < 0
            ? [tela * AQUECER[1], tela * AQUECER[0]]
            : [tela * AQUECER[2], tela * AQUECER[2]],
      // (no começo da página a folga é maior, mas lá os blocos são baixos: têm menos fatias que isso)
      folgaMaxima: [FOLGA.tras, FOLGA.frente + tela * 0.9],
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
    if (!comecou) return
    alturaHero = hero.offsetHeight
    topo = alturaDoCabecalho()
    fimDaPagina = Math.max(1, raiz.scrollHeight - window.innerHeight)
    celula = 4 * Number.parseFloat(getComputedStyle(raiz).fontSize) || 64
    aplicarModo()
    ajustarTamanho()
    if (!preso) {
      absorcao.definirCena(cenaDaAbsorcao())
      absorcao.medir()
      // a entrada da cortina é medida em pixels da tela, que mudam com o zoom
      if (entradaDaCortina) relogio.soltar(entradaDaCortina)
      entradaDaCortina = aparecerAoRolar(relogio, cortina)
      // na hora, e não no próximo quadro: um bloco que mudou de tamanho perdeu as cópias (e as cópias
      // novas precisam já do quadro dos vídeos)
      relogio.acertar(window.scrollY)
      preparar(window.scrollY)
      absorcao.acompanhar()
    }
    // mudar o tamanho do canvas apaga o que estava desenhado: redesenha na hora
    desenhar()
    ignorar = 2
  }

  /**
   * Abaixo de 25 quadros por segundo, a qualidade desce um degrau (no segundo, o buraco negro fica
   * parado de vez). Cada janela de ~1 s é julgada pelo quadro típico, a mediana dos intervalos, e não
   * pela média: um engasgo isolado não é o aparelho que não dá conta. E engasgos acontecem: quando um
   * vídeo começa a tocar ou muda de camada, o Windows às vezes leva um ou dois segundos para
   * reorganizar a composição da tela, e pela média dois desses bastavam para parar o efeito no meio
   * da página.
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
    const tipico = janela[Math.floor((janela.length - 1) / 2)]
    janela.length = 0
    janelaTempo = 0
    // Abaixo de 10 quadros por segundo não há dúvida. Entre 10 e 25, só duas janelas seguidas contam.
    janelasLentas = tipico > 1 / 25 ? janelasLentas + 1 : 0
    if (janelasLentas < 2 && tipico <= 1 / 10) return
    janelasLentas = 0
    if (escala > 1.01) {
      escalaLimite = 1
      ajustarTamanho()
      desenhar()
      ignorar = 2
    } else {
      lento = true
      aplicarModo()
      ajustarTamanho()
      desenhar()
    }
  }

  function laco(agora: number) {
    pedido = 0
    try {
      quadro(agora)
    } finally {
      // um erro num quadro (aparece no console) não pode parar a animação e congelar a absorção
      if (deveAnimar()) pedido = requestAnimationFrame(laco)
    }
  }

  function quadro(agora: number) {
    const intervalo = anterior ? (agora - anterior) / 1000 : 0
    anterior = agora
    const dt = Math.min(intervalo, 0.1)

    const s = window.scrollY
    const rolou = s !== rolagemAnterior
    if (rolou) {
      sentido = Math.sign(s - rolagemAnterior)
      ultimaRolagem = agora
    }
    // A velocidade sobe logo (a rolagem que acelera precisa de cópias prontas mais longe já no quadro
    // seguinte) e desce devagar (a roda do mouse rola aos trancos). Um salto (um link do menu, a
    // tecla End) não é velocidade: a amostra tem um teto, senão o quadro do salto preparava cópias
    // para a página inteira.
    if (dt > 0) {
      const amostra = Math.min(Math.abs(s - rolagemAnterior) / dt, VELOCIDADE_MAXIMA)
      velocidade += (amostra - velocidade) * (1 - Math.exp(-dt / (amostra > velocidade ? 0.03 : 0.3)))
      if (velocidade < 1) velocidade = 0
    }
    rolagemAnterior = s
    // sem ScrollTimeline, as animações da absorção andam daqui (com ele, o navegador já as andou)
    relogio.acertar(s)

    // A atividade acompanha devagar o sentido da rolagem, e não a velocidade: rolando devagar ou
    // rápido, com a roda, o botão do meio ou a barra, o disco reage do mesmo jeito.
    const meta = agora - ultimaRolagem < PAUSA_DA_ROLAGEM ? sentido : 0
    const constante = Math.abs(meta) > Math.abs(atividade) ? ATIVIDADE.sobe : ATIVIDADE.desce
    if (dt > 0) atividade += (meta - atividade) * (1 - Math.exp(-dt / constante))
    // com a página parada, o finzinho da volta já não se vê: corta, e o desenho volta a 30 por segundo
    if (meta === 0 && Math.abs(atividade) < 0.01) atividade = 0

    tempo = (tempo + dt) % (2 * Math.PI)
    // enquanto absorve, o disco gira um pouco mais rápido
    fase = (fase + dt * 2.4 * (1 + 0.6 * Math.max(atividade, 0))) % CICLO
    const suavizar = 1 - Math.exp(-dt * 2.5)
    atual.x += (alvo.x - atual.x) * suavizar
    atual.y += (alvo.y - atual.y) * suavizar

    // A absorção anda sozinha com a rolagem; daqui só se preparam as cópias que ela pode trazer: quando
    // a rolagem muda (e enquanto a folga encolhe depois dela), quando faltou tempo no quadro anterior
    // ou quando mudou algo dentro de um bloco.
    if (rolou || velocidade > 0 || reabsorver || absorcao.pendente()) {
      reabsorver = false
      // Depois de um salto (um link do menu, a barra de rolagem arrastada) chegam blocos inteiros de
      // uma vez, e esse quadro pesa mais que os de rolar: ele não diz se o aparelho dá conta.
      if (preparar(s) > 6) ignorar = Math.max(ignorar, 2)
    }
    // o que muda no original sem rolagem (quadros de vídeo, o mouse em cima) chega às cópias
    absorcao.acompanhar()

    // com movimento, um quadro a cada atualização da tela; parado, 30 por segundo bastam
    const movendo = rolou || atividade !== 0 || agora - ultimoPonteiro < 400
    if (movendo || agora - ultimoDesenho >= 1000 / 30 - 4) {
      ultimoDesenho = agora
      desenhar(s)
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

  /** Desenha assim que o shader terminar de compilar; depois anima, se for o caso. */
  function quandoPronto() {
    if (desligado || !renderizador) return
    if (renderizador.pronto()) {
      remedir()
      retomar()
    } else if (!renderizador.falhou()) {
      requestAnimationFrame(quandoPronto)
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
  aoRedimensionar.observe(canvas)
  aoRedimensionar.observe(hero)
  aoRedimensionar.observe(document.body)

  // Blocos trocados na página (o filtro dos projetos recria a lista). Outras mudanças, como o
  // ícone de um vídeo que começou a tocar, não pedem novas medidas (a absorção refaz só as cópias
  // daquele bloco).
  let esperaBlocos = 0
  const aoMudarPagina = new MutationObserver((mudancas) => {
    if (!mudancas.some((m) => [...m.addedNodes, ...m.removedNodes].some(temBlocos))) return
    cancelAnimationFrame(esperaBlocos)
    esperaBlocos = requestAnimationFrame(() => {
      if (!comecou || preso) return
      absorcao.medir()
      preparar(window.scrollY)
      absorcao.acompanhar()
    })
  })
  const principal = document.querySelector('main')
  if (principal) aoMudarPagina.observe(principal, { childList: true, subtree: true })

  // Troca de tema: redesenha na hora, para a transição circular já pegar as cores novas.
  const aoMudarTema = new MutationObserver(() => {
    const novas = lerCores()
    if (novas.escuro === cores.escuro && novas.tinta.join() === cores.tinta.join()) return
    cores = novas
    desenhar()
  })
  aoMudarTema.observe(raiz, { attributes: true, attributeFilter: ['class'] })

  const aoMudarVisibilidade = () => (document.hidden ? pausar() : retomar())
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

  const aoMoverPonteiro = (evento: PointerEvent) => {
    alvo.x = evento.clientX / window.innerWidth - 0.5
    alvo.y = evento.clientY / window.innerHeight - 0.5
    ultimoPonteiro = performance.now()
  }
  if (ponteiroFino.matches) window.addEventListener('pointermove', aoMoverPonteiro, { passive: true })

  // Se a placa de vídeo resetar, volta a malha em CSS até o contexto ser restaurado.
  const aoPerderContexto = (evento: Event) => {
    evento.preventDefault()
    pausar()
    desligarAbsorcao()
    raiz.style.removeProperty('--topo-livre')
    renderizador = null
    ativo = false
    aoAtivar(false)
  }
  const aoRestaurarContexto = () => {
    renderizador = criarRenderizador(canvas)
    quandoPronto()
  }
  canvas.addEventListener('webglcontextlost', aoPerderContexto)
  canvas.addEventListener('webglcontextrestored', aoRestaurarContexto)

  void aposEntrada(hero).then(() => {
    if (desligado) return
    comecou = true
    quandoPronto()
    // as fontes mudam a largura dos textos
    void document.fonts?.ready.then(remedir)
  })

  return () => {
    desligado = true
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
    window.removeEventListener('pointermove', aoMoverPonteiro)
    canvas.removeEventListener('webglcontextlost', aoPerderContexto)
    canvas.removeEventListener('webglcontextrestored', aoRestaurarContexto)
    desligarAbsorcao()
    cortina.remove()
    raiz.style.removeProperty('--topo-livre')
    canvas.removeAttribute('data-preso')
    canvas.style.height = ''
    renderizador?.destruir()
    renderizador = null
  }
}
