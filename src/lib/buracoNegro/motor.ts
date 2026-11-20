// O motor do buraco negro: o laço que o desenha, quadro a quadro, no canvas do fundo da página, na
// cortina, na tampa e, na volta ao topo, na tela de cima (veja index.ts). Roda num worker (veja
// trabalhador.ts e ponte.ts), fora da thread principal: o que pesa nela (a absorção, os vídeos, o
// React) não atrasa nem um quadro do buraco negro, que gira e anda junto com a rolagem como o resto
// da página, que o navegador rola também fora dela. Sem worker, o mesmo motor roda na thread principal.
//
// Quase nada é calculado aqui: o caminho da luz em volta do buraco negro já foi traçado uma vez, no
// mapa dos raios (veja geodesicas.frag), e o trajeto dele pela página está tabelado, uma posição
// para cada pixel de rolagem (veja trajeto.ts). A cada quadro, o motor só escolhe a posição na
// tabela, move o gás do disco sobre o mapa (a rotação) e compõe a imagem. No mergulho, a imagem
// passa pela vista de quem cai (queda.frag); na entrada, o motor desenha o site chegando, pela
// janela, na mesma vista (entrada.ts e entrada.frag).

import { curvaDaEntrada, vistaDaEntrada } from './entrada.ts'
import { HORIZONTE, esmaecimento, forcaEm, type Faixa } from './faixa.ts'
import { criarRenderizador, type Entrada, type Renderizador, type Rgb, type Rgba, type Tela, type Vista } from './renderizador.ts'
import {
  GIRO,
  INCLINACAO,
  PARALAXE_MALHA,
  SENTIDO,
  SUBIDA,
  alvoEm,
  caminhoDaPagina,
  lerTabela,
  progressoDoMergulho,
  suave,
  tabelar,
  type Caminho,
  type Palco,
  type Posicao,
  type Tabela,
} from './trajeto.ts'

/** Cores do tema atual (de 0 a 1). */
export interface Cores {
  linha: Rgba
  tinta: Rgb
  texto: Rgb
  fundo: Rgb
  escuro: boolean
}

/**
 * O tamanho do canvas e o da cortina, que é também o da tampa (px CSS), e quantos pixels da tela há
 * em cada px CSS.
 */
export interface Tamanho {
  largura: number
  altura: number
  cortina: number
  dpr: number
}

/** O que o motor precisa para começar. */
export interface Inicio {
  cores: Cores
  /** Resolução do mapa dos raios, em texels por rs. */
  densidade: number
}

/** Mensagens da página para o motor. */
export type ParaOMotor =
  | { tipo: 'tamanho'; tamanho: Tamanho }
  | { tipo: 'palco'; palco: Palco }
  /** A faixa da absorção e a rolagem em que o puxão fica pleno (veja faixa.ts): a tampa é desenhada com elas. */
  | { tipo: 'faixa'; faixa: Faixa; plena: number }
  /** A rolagem `s` no quadro da página que começou em `t` (ms desde a época, veja performance.timeOrigin). */
  | { tipo: 'rolagem'; s: number; t: number; salto?: boolean }
  /**
   * O ponteiro, na tela (px CSS), e se é o mouse sobre a página (`dentro`): fora da janela, ou num
   * toque, a massa do mouse some.
   */
  | { tipo: 'ponteiro'; x: number; y: number; dentro: boolean }
  | { tipo: 'cores'; cores: Cores }
  /** Preso: o buraco negro fica parado no alto da página, sem animação (movimento reduzido, aparelho lento). */
  | { tipo: 'modo'; preso: boolean }
  /**
   * A entrada (veja entrada.ts) começa no instante `inicio` (ms desde a época) e dura `duracao` ms.
   * Com `comFoto`, o motor desenha o próprio site chegando (a foto do topo dele), na tela de cima,
   * por cima da página parada no topo, e avisa quando ele chegou; sem ela, as animações da página
   * trazem o site, a partir do mesmo instante, e o motor desenha só a janela e o escuro atrás dele.
   */
  | { tipo: 'entrada'; inicio: number; duracao: number; comFoto: boolean }
  /**
   * A foto do topo do site (veja fotos.ts), pré-multiplicada, e a tela que ela cobre (px CSS). A
   * `chave` volta no aviso de que ela ficou pronta.
   */
  | { tipo: 'foto'; foto: ImageBitmap; largura: number; altura: number; chave: string }
  | { tipo: 'visivel'; visivel: boolean }
  | { tipo: 'destruir' }

/** Mensagens do motor para a página. */
export type DoMotor =
  /** O mapa dos raios está pronto: o efeito pode começar. */
  | { tipo: 'pronto' }
  /** O primeiro quadro foi desenhado. */
  | { tipo: 'ativo' }
  /** Sem WebGL 2, ou o shader não compilou: fica a malha em CSS. */
  | { tipo: 'falhou' }
  /** A placa de vídeo resetou: a malha em CSS volta até o motor avisar que está pronto de novo. */
  | { tipo: 'perdido' }
  /** Nem com a resolução mais baixa o aparelho dá conta. */
  | { tipo: 'lento' }
  /** O primeiro quadro da entrada foi desenhado: o túnel já cobre a tela, e o véu da página pode sair. */
  | { tipo: 'cobriu' }
  /** A foto do topo do site com esta chave está pronta para a entrada (ou não pôde ser usada). */
  | { tipo: 'foto'; chave: string; pronta: boolean }
  /**
   * O site da entrada com a foto chegou: a tela de cima ficou com o último quadro dela (o site no
   * lugar, como a página), e o canvas, por baixo da página, já tem a cena de sempre.
   */
  | { tipo: 'chegou' }

export interface Motor {
  receber(mensagem: ParaOMotor): void
}

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
 * Duração do ciclo de rotação do disco, em unidades de fase (a constante VOLTAS de disco.frag vezes
 * 2π). A fase anda em laço dentro do ciclo: assim nunca cresce a ponto de perder precisão.
 */
const CICLO = 4000 * 2 * Math.PI
/**
 * A rolagem chega da thread principal no ritmo dela, que, com a página pesada, pode ser a metade do
 * da tela (veja rolagemEm). O motor a desenha com um atraso do tamanho do maior intervalo entre as
 * últimas notícias (até ATRASO_MAXIMO ms), entre duas que ele já tem. Acima de SALTO px/ms não é
 * rolagem, é um salto: vai direto para onde chegou.
 */
const ATRASO_MAXIMO = 50
const SALTO = 12
/** Quantas notícias da rolagem o motor guarda. */
const AMOSTRAS = 16
/**
 * A rolagem que a thread principal lê a cada quadro oscila um pouco em relação ao relógio do
 * quadro (ora é a do quadro, ora a do anterior): seguida à risca, a malha andaria aos trancos de um
 * ou dois pixels rolando rápido. O motor a segue com esta suavização (s), que nunca passa do ponto.
 */
const SUAVIZAR = 0.012
/**
 * Os rastros da queda (veja queda.frag): o comprimento deles por quanto o buraco negro cresce a cada
 * fração do mergulho (a derivada do logaritmo do raio), e o máximo. Com a página parada fica uma
 * parte deles (PARADA); o resto vem com a rolagem, até RAPIDA px/s.
 */
const RASTRO = { porQueda: 0.055, maximo: 0.18, parada: 0.35, rapida: 1500 }

/**
 * A vista de quem cai com o mergulho em `m` (de 0 a 1) e os rastros em `rastro` (veja queda.frag):
 * o redemoinho, mais forte no meio da queda, com o disco à vista, e mais calmo quando a sombra já
 * toma a tela; a poeira, que aparece quando a queda engrena e some no horizonte, andando cada vez
 * mais depressa (o buraco negro também cresce cada vez mais rápido); as cores que se separam, a luz
 * que azula, o túnel que se fecha e, perto do horizonte, o tremor.
 */
function vistaNaQueda(m: number, rastro: number): Vista {
  return {
    rastro,
    redemoinho: 0.9 * suave(0.05, 0.45, m) * (1 - 0.6 * suave(0.5, 0.9, m)),
    tremor: 1.8 * suave(0.5, 0.9, m),
    separa: 0.007 * suave(0.15, 0.85, m),
    viagem: 4 * m * m,
    poeira: suave(0.08, 0.35, m) * (1 - suave(0.88, 0.97, m)),
    azul: suave(0.35, 0.95, m),
    tunel: 0.55 * suave(0.2, 0.95, m),
  }
}
/**
 * A massa do mouse, que curva e revela a malha em volta dele (veja cena.glsl): em quanto tempo (s)
 * ela alcança o ponteiro (com essa inércia ela fica um pouco para trás quando ele corre, e o atraso
 * de o ponteiro chegar da thread principal não se vê), em quanto tempo ela aparece e some quando o
 * mouse entra e sai da janela, e a agitação: a velocidade (px/s) em que ela é plena e em quanto
 * tempo ela sobe e assenta (com o mouse parado, a malha em volta dele fica mais fraca).
 */
const MASSA = { seguir: 0.075, aparece: 0.25, some: 0.45, rapida: 900, agita: 0.08, assenta: 1.4 }
/** Até que fração do mergulho a massa do mouse some: na queda, a vista é de quem cai. */
const MASSA_NO_MERGULHO = 0.2

interface Amostra {
  s: number
  t: number
}

const pedirQuadro: (f: FrameRequestCallback) => number =
  typeof requestAnimationFrame === 'function'
    ? (f) => requestAnimationFrame(f)
    : (f) => setTimeout(() => f(performance.now()), 1000 / 60) as unknown as number
const cancelarQuadro: (id: number) => void =
  typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id)

/**
 * Liga o motor no canvas, na cortina, na tampa e na tela de cima (um canvas cada, ou o
 * OffscreenCanvas de cada um, num worker). `avisar` leva as mensagens do motor para a página.
 */
export function criarMotor(
  canvas: Tela,
  cortina: Tela,
  tampa: Tela,
  topo: Tela,
  inicio: Inicio,
  avisar: (mensagem: DoMotor) => void,
): Motor {
  let renderizador: Renderizador | null = criarRenderizador(canvas, inicio.densidade)
  if (!renderizador) {
    avisar({ tipo: 'falhou' })
    return { receber() {} }
  }
  const pincel = (cortina as HTMLCanvasElement).getContext('2d')
  const pincelDaTampa = (tampa as HTMLCanvasElement).getContext('2d')
  /**
   * A tela de cima: na entrada com a foto, por cima da página (até do cabeçalho), a mesma imagem do
   * canvas, copiada a cada quadro. A página fica parada no topo, por baixo dela, já desenhada, e
   * aparece quando ela se esvazia, no fim.
   */
  const pincelDoTopo = (topo as HTMLCanvasElement).getContext('2d')
  /** Onde se recorta, a cada quadro, o pedaço da cortina em volta da sombra (veja desenharTampa). */
  const furo: Tela = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas')
  const pincelDoFuro = (furo as HTMLCanvasElement).getContext('2d')

  let cores = inicio.cores
  let palco: Palco | null = null
  let tabela: Tabela | null = null
  /** O caminho do buraco negro ao longo da página, o mesmo que a absorção segue (veja trajeto.ts). */
  let caminho: Caminho | null = null
  let tamanho: Tamanho | null = null
  let absorcao: { faixa: Faixa; plena: number } | null = null

  // Qualidade: resolução da tela (até 2x). Se o aparelho não der conta, cai para 1x e, se ainda
  // assim sofrer, a página prende o buraco negro no alto da página (veja index.ts).
  let escalaLimite = 2
  let escala = 1
  let preso = false
  let visivel = true
  let desligado = false
  let avisouPronto = false
  let ativo = false

  let pedido = 0
  let anterior = 0
  let ultimoDesenho = 0
  let tempo = 0
  let fase = 0
  /** A rolagem do último quadro desenhado. */
  let desenhada = Number.NaN

  // A rolagem, como chega da página (veja rolagemEm), o atraso com que ela é desenhada (ms) e ela já
  // suavizada (veja SUAVIZAR; NaN até o primeiro quadro, ou depois de um salto).
  const amostras: Amostra[] = []
  let atraso = 0
  let suavizada = Number.NaN
  /** Quão rápido a rolagem desenhada anda (px/s), suavizado: alonga os rastros da queda. */
  let velocidade = 0
  /**
   * A entrada em andamento: quando começa (ms desde a época), quanto dura, quantos quadros já teve,
   * se é o motor que desenha o site (com a foto, na tela de cima) e se ele já chegou (o último quadro
   * dela já foi desenhado: no próximo, a tela de cima se esvazia).
   */
  let entrada: { inicio: number; duracao: number; quadros: number; comFoto: boolean; chegou: boolean } | null = null
  /** A foto do topo do site, guardada para refazer a textura se a placa de vídeo resetar. */
  let foto: { imagem: ImageBitmap; largura: number; altura: number } | null = null
  /** A textura da foto está pronta para a entrada. */
  let fotoPronta = false
  // De -1 a 1: positiva enquanto a página rola para baixo (absorve), negativa para cima (cospe).
  // Segue o sentido da rolagem, e não a velocidade (veja quadro).
  let atividade = 0
  let sentido = 0
  let ultimaRolagem = -Infinity

  // Paralaxe leve com o mouse: a câmera acompanha o ponteiro (de -0,5 a 0,5 em cada eixo, a partir
  // do meio da tela).
  const alvo = { x: 0, y: 0 }
  const atual = { x: 0, y: 0 }
  let ultimoPonteiro = -Infinity
  // A massa do mouse (veja MASSA): o ponteiro como chegou (px CSS), onde a massa está (NaN: vai
  // direto para o ponteiro no próximo quadro), quanto ela aparece e quanto o mouse se mexe (de 0 a 1).
  const ponteiro = { x: 0, y: 0, dentro: false }
  const massa = { x: Number.NaN, y: Number.NaN }
  let presenca = 0
  let agito = 0

  // desempenho, medido em janelas de ~1 s de quadros (os intervalos entre eles, em s)
  let janelaTempo = 0
  const janela: number[] = []
  let janelasLentas = 0
  let ignorar = 2

  const temTrabalho = () =>
    !desligado && visivel && renderizador !== null && (!renderizador.mapaPronto() || (palco !== null && tamanho !== null && !preso))

  function ajustarTamanho() {
    if (!tamanho) return
    escala = Math.min(tamanho.dpr, escalaLimite)
    const w = Math.max(1, Math.round(tamanho.largura * escala))
    const h = Math.max(1, Math.round(tamanho.altura * escala))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    // A cortina e a tampa têm a resolução do canvas e cobrem a faixa do alto da tela (veja index.ts).
    const hc = Math.max(1, Math.min(h, Math.round(tamanho.cortina * escala)))
    for (const tela of [cortina, tampa]) {
      if (tela.width !== w || tela.height !== hc) {
        tela.width = w
        tela.height = hc
      }
    }
    // A tela de cima cobre a tela toda, como o canvas. O primeiro desenho nela cria os recursos dela
    // na placa de vídeo: é feito já, escondido, e não no primeiro quadro da volta ao topo.
    if (topo.width !== w || topo.height !== h) {
      topo.width = w
      topo.height = h
      pincelDoTopo?.drawImage(canvas, 0, 0, 1, 1, 0, 0, 1, 1)
      pincelDoTopo?.clearRect(0, 0, 1, 1)
    }
  }

  /**
   * A rolagem neste quadro. A página manda a dela a cada quadro seu, e com a thread principal
   * ocupada isso pode ser um a cada dois ou três da tela. O motor desenha a cada quadro da tela a
   * rolagem de um instante um pouco antes, entre duas notícias que ele já tem (em linha reta entre
   * elas): o buraco negro e a malha andam lisos, sem esperar a thread principal e sem passar do
   * ponto quando a rolagem para. O atraso é o maior intervalo entre as últimas notícias, e se ajusta
   * aos poucos quando o ritmo da página muda.
   */
  function rolagemEm(agora: number, dt: number): number {
    const n = amostras.length
    const ultima = amostras[n - 1]
    if (!ultima) return 0
    let maior = 0
    for (let i = 1; i < n; i++) {
      const passo = amostras[i].t - amostras[i - 1].t
      // (uma pausa longa, como a da aba escondida, não é o ritmo da página)
      if (passo < 120) maior = Math.max(maior, passo)
    }
    atraso += (Math.min(maior, ATRASO_MAXIMO) - atraso) * Math.min(1, dt * 10)
    const instante = agora - atraso
    for (let i = n - 1; i > 0; i--) {
      const a = amostras[i - 1]
      const b = amostras[i]
      if (instante < a.t) continue
      if (instante >= b.t) return b.s
      // um salto (um link, a tecla End) vai direto para onde chegou
      if (Math.abs(b.s - a.s) > SALTO * (b.t - a.t)) return b.s
      return a.s + ((b.s - a.s) * (instante - a.t)) / (b.t - a.t)
    }
    return (amostras[0] ?? ultima).s
  }

  function receberRolagem(s: number, t: number, salto: boolean) {
    const ultima = amostras[amostras.length - 1]
    if (salto) {
      // A volta ao topo, no fim do mergulho, não é o leitor rolando para cima: sem jatos.
      amostras.length = 0
      amostras.push({ s, t })
      suavizada = Number.NaN
      sentido = 0
      atividade = 0
      return
    }
    if (ultima && t <= ultima.t) return
    if (ultima && s !== ultima.s) {
      sentido = Math.sign(s - ultima.s)
      ultimaRolagem = t
    }
    amostras.push({ s, t })
    if (amostras.length > AMOSTRAS) amostras.shift()
  }

  /**
   * O comprimento dos rastros da queda com a página rolada até `rolagem` (veja RASTRO): quanto o
   * buraco negro cresce a cada fração do mergulho ali, lido na tabela, e quão rápida está a rolagem.
   */
  function rastroEm(tabelaAtual: Tabela, trecho: { inicio: number; fim: number }, rolagem: number, mergulho: number): number {
    const de = Math.max(0, rolagem - 4)
    const ate = Math.min(tabelaAtual.posicoes - 1, rolagem + 4)
    if (ate <= de) return 0
    const queda = ((Math.log(lerTabela(tabelaAtual, ate).raio) - Math.log(lerTabela(tabelaAtual, de).raio)) / (ate - de)) * (trecho.fim - trecho.inicio)
    const embalo = RASTRO.parada + (1 - RASTRO.parada) * Math.min(1, velocidade / RASTRO.rapida)
    return Math.min(RASTRO.maximo, RASTRO.porQueda * Math.max(0, queda)) * suave(0.02, 0.25, mergulho) * embalo
  }

  /**
   * O que a entrada mostra com ela em `u` (de 0 a 1): o site, a janela, o meio da tela e quanto o
   * site vem arredondado (só com a foto: sem ela, quem traz o site é a página, plano).
   */
  function quadroDaEntrada(u: number, largura: number, alturaTela: number, comFoto: boolean, bojo: number): Entrada {
    const ponto = curvaDaEntrada(u)
    const meiaDiagonal = Math.hypot(largura / 2, alturaTela / 2)
    return {
      u,
      vistaX: largura / 2,
      vistaY: alturaTela / 2,
      escala: ponto.escala,
      janela: ponto.janela * meiaDiagonal,
      bojo: comFoto ? bojo : 0,
      comFoto,
    }
  }

  /**
   * A tampa (veja index.ts): por cima das fatias da absorção, a mesma imagem da cortina, tanto mais
   * opaca quanto mais o conteúdo já esmaeceu naquela altura da tela (veja esmaecimento), e inteira
   * na sombra do buraco negro, a deste quadro. Sobre a cortina, as fatias aparecem com a
   * transparência que lhes cabe ali: o mesmo que uma máscara na camada delas, mas sem a máscara, que
   * obrigava a placa de vídeo a desenhar todas as fatias à parte e só então recortá-las, a cada
   * quadro (rolando rápido, ela não dava conta).
   */
  function desenharTampa(rolagem: number, b: Posicao) {
    if (!pincelDaTampa || !pincelDoFuro || !absorcao || !caminho || !tamanho) return
    const { faixa, plena } = absorcao
    const w = tampa.width
    const h = tampa.height
    // a imagem da cortina, inteira
    pincelDaTampa.globalCompositeOperation = 'copy'
    pincelDaTampa.drawImage(cortina, 0, 0)
    // menos o quanto o conteúdo ainda aparece, em cada altura
    const queda = alvoEm(caminho, rolagem).y - faixa.frente
    const gradiente = pincelDaTampa.createLinearGradient(0, 0, 0, h)
    for (const [y, aparece] of esmaecimento(faixa, queda, forcaEm(plena, rolagem))) {
      gradiente.addColorStop(Math.min(1, Math.max(0, y / tamanho.cortina)), `rgba(0,0,0,${aparece})`)
    }
    pincelDaTampa.globalCompositeOperation = 'destination-out'
    pincelDaTampa.fillStyle = gradiente
    pincelDaTampa.fillRect(0, 0, w, h)
    pincelDaTampa.globalCompositeOperation = 'source-over'
    // Em volta da sombra, a imagem volta por cima, inteira dentro dela e sumindo até HORIZONTE raios
    // do centro: recortada da cortina, com essa transparência, num canvas à parte.
    const ex = canvas.width / tamanho.largura
    const ey = canvas.height / tamanho.altura
    const fora = b.raio * HORIZONTE + 1
    const x0 = Math.max(0, Math.floor((b.x - fora) * ex))
    const y0 = Math.max(0, Math.floor((b.y - fora) * ey))
    const x1 = Math.min(w, Math.ceil((b.x + fora) * ex))
    const y1 = Math.min(h, Math.ceil((b.y + fora) * ey))
    if (x1 <= x0 || y1 <= y0) return
    const fw = x1 - x0
    const fh = y1 - y0
    if (furo.width < fw || furo.height < fh) {
      furo.width = Math.max(furo.width, fw)
      furo.height = Math.max(furo.height, fh)
    }
    pincelDoFuro.globalCompositeOperation = 'copy'
    pincelDoFuro.drawImage(cortina, x0, y0, fw, fh, 0, 0, fw, fh)
    const cx = b.x * ex - x0
    const cy = b.y * ey - y0
    const sombra = pincelDoFuro.createRadialGradient(cx, cy, b.raio * ex, cx, cy, fora * ex)
    sombra.addColorStop(0, '#000')
    sombra.addColorStop(1, 'rgba(0,0,0,0)')
    pincelDoFuro.globalCompositeOperation = 'destination-in'
    pincelDoFuro.fillStyle = sombra
    pincelDoFuro.fillRect(0, 0, fw, fh)
    pincelDaTampa.drawImage(furo, 0, 0, fw, fh, x0, y0, fw, fh)
  }

  /** Desenha o quadro com a página rolada até `s` (e, na entrada, com ela em `u`). */
  function desenhar(s: number, u: number | null = null) {
    const r = renderizador
    if (!r?.mapaPronto() || !palco || !tabela || !tamanho) return
    desenhada = s
    // Sem animação, o buraco negro fica parado no alto da página (o canvas rola junto com ela).
    const rolagem = preso ? 0 : s
    const b = lerTabela(tabela, rolagem)
    // No mergulho, a malha para de subir com a rolagem e cresce junto com o buraco negro, em volta dele.
    const desloc = Math.min(rolagem, palco.fimDoCaminho) * PARALAXE_MALHA
    const malhaX = (tamanho.largura - palco.celula) / 2
    const mergulho = preso || u !== null ? 0 : progressoDoMergulho(palco, rolagem)
    // A massa do mouse fica na página: some no começo do mergulho, e na entrada não existe.
    const cursor = preso || u !== null || Number.isNaN(massa.x) ? 0 : presenca * (1 - suave(0, MASSA_NO_MERGULHO, mergulho))
    // A vista de quem cai: na queda e, já dentro do buraco negro, na entrada.
    let vista: Vista | null = null
    let quadroDeEntrada: Entrada | null = null
    if (u !== null) {
      const { bojo, ...resto } = vistaDaEntrada(u)
      vista = { ...resto, redemoinho: 0, tremor: 0 }
      quadroDeEntrada = quadroDaEntrada(u, tamanho.largura, palco.alturaTela, entrada?.comFoto ?? false, bojo)
    } else if (mergulho > 0) {
      vista = vistaNaQueda(mergulho, palco.mergulho ? rastroEm(tabela, palco.mergulho, rolagem, mergulho) : 0)
    }
    r.desenhar({
      vista,
      entrada: quadroDeEntrada,
      largura: tamanho.largura,
      altura: tamanho.altura,
      centroX: b.x,
      centroY: b.y,
      raio: b.raio,
      celula: palco.celula * b.zoom,
      malhaX: b.x + (malhaX - b.x) * b.zoom,
      desloc: desloc * b.zoom + (b.zoom - 1) * b.y,
      alturaHero: palco.alturaHero,
      ciclo: fase / CICLO,
      tempo,
      // a câmera sobe um pouco ao longo da página e acompanha de leve o ponteiro
      inclinacao: INCLINACAO + b.subida * SUBIDA - atual.y * 0.07,
      giro: GIRO + atual.x * 0.05,
      sentido: SENTIDO,
      atividade,
      cursorX: cursor > 0 ? massa.x : 0,
      cursorY: cursor > 0 ? massa.y : 0,
      cursor,
      agito,
      ...cores,
    })
    // Na entrada com a foto, o quadro vai também para a tela de cima, por cima da página.
    if (quadroDeEntrada?.comFoto && pincelDoTopo) {
      pincelDoTopo.globalCompositeOperation = 'copy'
      pincelDoTopo.drawImage(canvas, 0, 0)
    }
    // O alto do quadro vai também para a cortina, no mesmo quadro, sobre o fundo da página (ela
    // cobre a faixa com o que está atrás da página ali), e dela para a tampa. Cópias de imagem na
    // placa de vídeo: desenhar o buraco negro mais vezes custaria o desenho em dobro.
    if (!preso && pincel) {
      pincel.fillStyle = `rgb(${cores.fundo.map((v) => Math.round(v * 255)).join(',')})`
      pincel.fillRect(0, 0, cortina.width, cortina.height)
      pincel.drawImage(canvas, 0, 0, cortina.width, cortina.height, 0, 0, cortina.width, cortina.height)
      desenharTampa(rolagem, b)
    }
    if (!ativo) {
      ativo = true
      avisar({ tipo: 'ativo' })
    }
  }

  /**
   * Abaixo de 25 quadros por segundo, a qualidade desce um degrau (no segundo, a página prende o
   * buraco negro de vez). Cada janela de ~1 s é julgada pelo quadro típico, a mediana dos
   * intervalos, e não pela média: um engasgo isolado (o Windows às vezes leva um ou dois segundos
   * para reorganizar a composição da tela quando um vídeo começa a tocar) não é o aparelho que não
   * dá conta. Medido aqui, fora da thread principal, conta só o que o desenho custa.
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
    // Abaixo de 10 quadros por segundo não há dúvida. Entre 10 e 25, só duas janelas seguidas contam.
    janelasLentas = tipico > 1 / 25 ? janelasLentas + 1 : 0
    if (janelasLentas < 2 && tipico <= 1 / 10) return
    janelasLentas = 0
    if (escala > 1.01) {
      escalaLimite = 1
      // (mudar o tamanho do canvas apaga o desenho: o próximo quadro o refaz)
      ajustarTamanho()
      desenhada = Number.NaN
      ignorar = 2
    } else {
      avisar({ tipo: 'lento' })
    }
  }

  function quadro(agora: number) {
    const r = renderizador
    if (!r) return
    if (!r.pronto()) {
      if (r.falhou()) {
        desligado = true
        avisar({ tipo: 'falhou' })
      }
      return
    }
    // O mapa dos raios é traçado aos poucos, uma faixa por quadro, antes de qualquer desenho.
    if (!r.mapaPronto()) {
      if (r.tracar() && !avisouPronto) {
        avisouPronto = true
        avisar({ tipo: 'pronto' })
      }
      anterior = 0
      return
    }
    if (!palco || !tamanho) return
    // parado, só se desenha de novo o que mudou (o tamanho, o tema)
    if (preso) {
      if (Number.isNaN(desenhada)) desenhar(0)
      return
    }

    const intervalo = anterior ? (agora - anterior) / 1000 : 0
    anterior = agora
    const dt = Math.min(intervalo, 0.1)
    const instante = performance.timeOrigin + agora
    const alvoDaRolagem = rolagemEm(instante, dt)
    if (Number.isNaN(suavizada)) suavizada = alvoDaRolagem
    else suavizada += (alvoDaRolagem - suavizada) * (1 - Math.exp(-dt / SUAVIZAR))
    // (o finzinho não se vê, e com ele o desenho voltaria logo a 30 por segundo)
    if (Math.abs(alvoDaRolagem - suavizada) < 0.02) suavizada = alvoDaRolagem
    const s = suavizada
    const rolou = s !== desenhada
    if (dt > 0 && !Number.isNaN(desenhada)) {
      const amostra = Math.abs(s - desenhada) / dt
      velocidade += (amostra - velocidade) * (1 - Math.exp(-dt / 0.15))
    }

    // A atividade acompanha devagar o sentido da rolagem, e não a velocidade: rolando devagar ou
    // rápido, com a roda, o botão do meio ou o toque, o disco reage do mesmo jeito.
    const meta = instante - ultimaRolagem < PAUSA_DA_ROLAGEM ? sentido : 0
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
    const massaAnda = moverMassa(dt)

    // Na entrada, um quadro a cada atualização da tela, no passo das animações da página. A página
    // tira o véu dela quando sabe que o túnel já está na tela: o aviso vai no segundo quadro, quando
    // o primeiro com certeza já chegou lá.
    if (entrada) {
      // (a massa do mouse volta aos poucos depois, com o site já no lugar)
      presenca = 0
      ultimoDesenho = agora
      // Com a foto, o último quadro da entrada (o site no lugar, pixel por pixel) ficou na tela de
      // cima, e o canvas, por baixo da página, já recebeu a cena de sempre: a página esmaece a tela
      // de cima, e a página de verdade, parada ali embaixo, aparece no lugar da foto. (O aviso vai no
      // quadro seguinte: se o canvas chegar à tela um quadro depois, a tela de cima ainda o cobre.)
      if (entrada.chegou) {
        entrada = null
        desenhar(s)
        avisar({ tipo: 'chegou' })
        return
      }
      const u = Math.min(1, Math.max(0, (instante - entrada.inicio) / entrada.duracao))
      desenhar(s, u)
      if (++entrada.quadros === 2) avisar({ tipo: 'cobriu' })
      if (u >= 1) {
        if (entrada.comFoto) {
          // o canvas, por baixo da página, já recebe a cena de sempre (a tela de cima guarda a entrada)
          desenhar(s)
          entrada.chegou = true
        } else {
          entrada = null
          desenhada = Number.NaN
        }
      }
      return
    }

    // com movimento, um quadro a cada atualização da tela; parado, 30 por segundo bastam
    const movendo = rolou || atividade !== 0 || massaAnda || agora - ultimoPonteiro < 400
    if (movendo || agora - ultimoDesenho >= 1000 / 30 - 4) {
      ultimoDesenho = agora
      desenhar(s)
    }
    avaliarDesempenho(intervalo)
  }

  /**
   * A massa do mouse segue o ponteiro com inércia, aparece e some com ele e se agita com a
   * velocidade dele (veja MASSA). Devolve se ela ainda está a caminho (do ponteiro ou de aparecer ou
   * sumir): até chegar, um quadro a cada atualização da tela. A agitação assenta devagar, e para isso
   * os 30 quadros por segundo da página parada bastam.
   */
  function moverMassa(dt: number): boolean {
    if (Number.isNaN(massa.x)) {
      if (!ponteiro.dentro) return false
      massa.x = ponteiro.x
      massa.y = ponteiro.y
    }
    const antesX = massa.x
    const antesY = massa.y
    const seguir = 1 - Math.exp(-dt / MASSA.seguir)
    massa.x += (ponteiro.x - massa.x) * seguir
    massa.y += (ponteiro.y - massa.y) * seguir
    // (o finzinho não se vê)
    const chegou = Math.hypot(ponteiro.x - massa.x, ponteiro.y - massa.y) < 0.05
    if (chegou) {
      massa.x = ponteiro.x
      massa.y = ponteiro.y
    }
    const metaPresenca = ponteiro.dentro ? 1 : 0
    presenca += (metaPresenca - presenca) * (1 - Math.exp(-dt / (metaPresenca > presenca ? MASSA.aparece : MASSA.some)))
    const apareceu = Math.abs(metaPresenca - presenca) < 0.002
    if (apareceu) presenca = metaPresenca
    if (dt > 0) {
      const meta = Math.min(1, Math.hypot(massa.x - antesX, massa.y - antesY) / dt / MASSA.rapida)
      agito += (meta - agito) * (1 - Math.exp(-dt / (meta > agito ? MASSA.agita : MASSA.assenta)))
      if (meta === 0 && agito < 0.002) agito = 0
    }
    return !chegou || !apareceu
  }

  function laco(agora: number) {
    pedido = 0
    try {
      quadro(agora)
    } finally {
      // um erro num quadro não pode parar a animação
      if (temTrabalho()) pedido = pedirQuadro(laco)
    }
  }

  /** Volta a desenhar (ou desenha uma vez, parado), se houver o que fazer. */
  function retomar() {
    if (pedido) return
    if (temTrabalho()) {
      anterior = 0
      ignorar = Math.max(ignorar, 2)
      janelaTempo = 0
      janela.length = 0
      janelasLentas = 0
      pedido = pedirQuadro(laco)
    } else if (preso && visivel && !desligado && renderizador?.mapaPronto() && Number.isNaN(desenhada)) {
      // parado: um quadro só, no próximo da tela
      pedido = pedirQuadro((agora) => {
        pedido = 0
        quadro(agora)
      })
    }
  }

  function pausar() {
    cancelarQuadro(pedido)
    pedido = 0
  }

  // Se a placa de vídeo resetar, volta a malha em CSS até o contexto ser restaurado.
  const eventos = canvas as EventTarget
  eventos.addEventListener('webglcontextlost', (evento) => {
    evento.preventDefault()
    pausar()
    renderizador = null
    ativo = false
    avisouPronto = false
    // (a página esconde a tela de cima e mostra o site ela mesma)
    entrada = null
    pincelDoTopo?.clearRect(0, 0, topo.width, topo.height)
    avisar({ tipo: 'perdido' })
  })
  eventos.addEventListener('webglcontextrestored', () => {
    if (desligado) return
    renderizador = criarRenderizador(canvas, inicio.densidade)
    if (!renderizador) {
      avisar({ tipo: 'falhou' })
      return
    }
    // a textura da foto se foi com o contexto
    fotoPronta = renderizador.definirFoto(foto)
    ajustarTamanho()
    retomar()
  })

  retomar()

  return {
    receber(m) {
      switch (m.tipo) {
        case 'tamanho':
          tamanho = m.tamanho
          ajustarTamanho()
          // mudar o tamanho do canvas apaga o que estava desenhado: redesenha já
          desenhada = Number.NaN
          ignorar = Math.max(ignorar, 2)
          break
        case 'palco':
          palco = m.palco
          tabela = tabelar(m.palco)
          caminho = caminhoDaPagina(m.palco)
          desenhada = Number.NaN
          break
        case 'faixa':
          absorcao = { faixa: m.faixa, plena: m.plena }
          desenhada = Number.NaN
          break
        case 'rolagem':
          receberRolagem(m.s, m.t, m.salto ?? false)
          break
        case 'ponteiro':
          if (tamanho) {
            alvo.x = m.x / tamanho.largura - 0.5
            alvo.y = m.y / tamanho.altura - 0.5
          }
          // o mouse que volta à janela, com a massa já sumida, não vem arrastando ela de onde saiu
          if (m.dentro && !ponteiro.dentro && presenca < 0.05) massa.x = massa.y = Number.NaN
          ponteiro.x = m.x
          ponteiro.y = m.y
          ponteiro.dentro = m.dentro
          ultimoPonteiro = performance.now()
          break
        case 'cores':
          cores = m.cores
          desenhada = Number.NaN
          break
        case 'modo':
          preso = m.preso
          desenhada = Number.NaN
          break
        case 'entrada': {
          const comFoto = m.comFoto && fotoPronta
          // A página desistiu da foto no meio (o motor demorou a responder) e traz o site ela mesma:
          // a tela de cima, que ela esconde, fica vazia, e o canvas passa a desenhar sem a foto.
          if (entrada?.comFoto && !comFoto) pincelDoTopo?.clearRect(0, 0, topo.width, topo.height)
          const quadros = entrada?.inicio === m.inicio ? entrada.quadros : 0
          entrada = { inicio: m.inicio, duracao: m.duracao, quadros, comFoto, chegou: false }
          break
        }
        case 'foto':
          foto?.imagem.close()
          foto = { imagem: m.foto, largura: m.largura, altura: m.altura }
          fotoPronta = renderizador?.definirFoto(foto) ?? false
          avisar({ tipo: 'foto', chave: m.chave, pronta: fotoPronta })
          break
        case 'visivel':
          visivel = m.visivel
          if (!visivel) pausar()
          break
        case 'destruir':
          desligado = true
          pausar()
          renderizador?.destruir()
          renderizador = null
          foto?.imagem.close()
          foto = null
          return
      }
      retomar()
    },
  }
}
