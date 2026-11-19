// O motor do buraco negro: o laço que o desenha, quadro a quadro, no canvas do fundo da página e na
// cortina (veja index.ts). Roda num worker (veja trabalhador.ts e ponte.ts), fora da thread
// principal: o que pesa nela (a absorção, os vídeos, o React) não atrasa nem um quadro
// do buraco negro, que gira e anda junto com a rolagem como o resto da página, que o navegador rola
// também fora dela. Sem worker, o mesmo motor roda na thread principal.
//
// Quase nada é calculado aqui: o caminho da luz em volta do buraco negro já foi traçado uma vez, no
// mapa dos raios (veja geodesicas.frag), e o trajeto dele pela página está tabelado, uma posição
// para cada pixel de rolagem (veja trajeto.ts). A cada quadro, o motor só escolhe a posição na
// tabela, move o gás do disco sobre o mapa (a rotação) e compõe a imagem. No mergulho, a imagem
// passa pela queda (queda.frag), vista por quem cai; na entrada, o motor desenha o túnel por onde o
// site chega (entrada.ts e entrada.frag), no mesmo passo das animações da página.

import { curvaDaEntrada } from './entrada.ts'
import { criarRenderizador, type Entrada, type Renderizador, type Rgb, type Rgba, type Tela } from './renderizador.ts'
import {
  GIRO,
  INCLINACAO,
  PARALAXE_MALHA,
  SENTIDO,
  SUBIDA,
  lerTabela,
  progressoDoMergulho,
  suave,
  tabelar,
  type Palco,
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

/** O tamanho do canvas e da cortina (px CSS) e quantos pixels da tela há em cada px CSS. */
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
  /** A rolagem `s` no quadro da página que começou em `t` (ms desde a época, veja performance.timeOrigin). */
  | { tipo: 'rolagem'; s: number; t: number; salto?: boolean }
  /** O ponteiro, de -0,5 a 0,5 em cada eixo a partir do meio da tela. */
  | { tipo: 'ponteiro'; x: number; y: number }
  | { tipo: 'cores'; cores: Cores }
  /** Preso: o buraco negro fica parado no alto da página, sem animação (movimento reduzido, aparelho lento). */
  | { tipo: 'modo'; preso: boolean }
  /**
   * A entrada (veja entrada.ts) começa no instante `inicio` (ms desde a época) e dura `duracao` ms:
   * as animações da página começam no mesmo instante.
   */
  | { tipo: 'entrada'; inicio: number; duracao: number }
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
 * Liga o motor no canvas e na cortina (um canvas cada, ou o OffscreenCanvas de cada um, num worker).
 * `avisar` leva as mensagens do motor para a página.
 */
export function criarMotor(canvas: Tela, cortina: Tela, inicio: Inicio, avisar: (mensagem: DoMotor) => void): Motor {
  let renderizador: Renderizador | null = criarRenderizador(canvas, inicio.densidade)
  if (!renderizador) {
    avisar({ tipo: 'falhou' })
    return { receber() {} }
  }
  const pincel = (cortina as HTMLCanvasElement).getContext('2d')

  let cores = inicio.cores
  let palco: Palco | null = null
  let tabela: Tabela | null = null
  let tamanho: Tamanho | null = null

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
  /** A entrada em andamento: quando começa (ms desde a época), quanto dura e quantos quadros já teve. */
  let entrada: { inicio: number; duracao: number; quadros: number } | null = null
  // De -1 a 1: positiva enquanto a página rola para baixo (absorve), negativa para cima (cospe).
  // Segue o sentido da rolagem, e não a velocidade (veja quadro).
  let atividade = 0
  let sentido = 0
  let ultimaRolagem = -Infinity

  // Paralaxe leve com o mouse: a câmera acompanha o ponteiro.
  const alvo = { x: 0, y: 0 }
  const atual = { x: 0, y: 0 }
  let ultimoPonteiro = -Infinity

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
    // A cortina tem a resolução do canvas e cobre a faixa do alto da tela (veja index.ts).
    const hc = Math.max(1, Math.min(h, Math.round(tamanho.cortina * escala)))
    if (cortina.width !== w || cortina.height !== hc) {
      cortina.width = w
      cortina.height = hc
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

  /** O que a entrada mostra com ela em `u` (de 0 a 1): o site, a janela e o meio da tela. */
  function quadroDaEntrada(u: number, largura: number, alturaTela: number): Entrada {
    const ponto = curvaDaEntrada(u)
    const meiaDiagonal = Math.hypot(largura / 2, alturaTela / 2)
    return { u, vistaX: largura / 2, vistaY: alturaTela / 2, escala: ponto.escala, torcao: ponto.torcao, janela: ponto.janela * meiaDiagonal }
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
    r.desenhar({
      mergulho,
      rastro: mergulho > 0 && palco.mergulho ? rastroEm(tabela, palco.mergulho, rolagem, mergulho) : 0,
      entrada: u === null ? null : quadroDaEntrada(u, tamanho.largura, palco.alturaTela),
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
      ...cores,
    })
    // O alto do quadro vai também para a cortina, no mesmo quadro, sobre o fundo da página (ela
    // cobre a faixa com o que está atrás da página ali). Uma cópia de imagem na placa de vídeo:
    // desenhar o buraco negro duas vezes custaria o desenho em dobro.
    if (!preso && pincel) {
      pincel.fillStyle = `rgb(${cores.fundo.map((v) => Math.round(v * 255)).join(',')})`
      pincel.fillRect(0, 0, cortina.width, cortina.height)
      pincel.drawImage(canvas, 0, 0, cortina.width, cortina.height, 0, 0, cortina.width, cortina.height)
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

    // Na entrada, um quadro a cada atualização da tela, no passo das animações da página. A página
    // tira o véu dela quando sabe que o túnel já está na tela: o aviso vai no segundo quadro, quando
    // o primeiro com certeza já chegou lá.
    if (entrada) {
      const u = Math.min(1, Math.max(0, (instante - entrada.inicio) / entrada.duracao))
      desenhar(s, u)
      ultimoDesenho = agora
      if (++entrada.quadros === 2) avisar({ tipo: 'cobriu' })
      if (u >= 1) {
        entrada = null
        desenhada = Number.NaN
      }
      return
    }

    // com movimento, um quadro a cada atualização da tela; parado, 30 por segundo bastam
    const movendo = rolou || atividade !== 0 || agora - ultimoPonteiro < 400
    if (movendo || agora - ultimoDesenho >= 1000 / 30 - 4) {
      ultimoDesenho = agora
      desenhar(s)
    }
    avaliarDesempenho(intervalo)
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
    avisar({ tipo: 'perdido' })
  })
  eventos.addEventListener('webglcontextrestored', () => {
    if (desligado) return
    renderizador = criarRenderizador(canvas, inicio.densidade)
    if (!renderizador) {
      avisar({ tipo: 'falhou' })
      return
    }
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
          desenhada = Number.NaN
          break
        case 'rolagem':
          receberRolagem(m.s, m.t, m.salto ?? false)
          break
        case 'ponteiro':
          alvo.x = m.x
          alvo.y = m.y
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
        case 'entrada':
          entrada = { inicio: m.inicio, duracao: m.duracao, quadros: 0 }
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
          return
      }
      retomar()
    },
  }
}
