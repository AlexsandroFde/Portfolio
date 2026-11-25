// O pintor dos vídeos da tira da absorção (veja telas.ts e absorcao.ts): um worker que desenha, em
// cada fatia que cruza um vídeo, a parte dele que cai nela, a cada quadro novo do vídeo. As telas
// das fatias são canvas transferidos para cá (OffscreenCanvas), e o que se desenha nelas vai para a
// tela sem esperar a thread principal: rolando rápido, com a placa de vídeo ocupada, a página chega
// a desenhar só uns 25 quadros por segundo, e os vídeos da tira andavam no passo dela, aos trancos.

/** Um recorte que o original aplica ao vídeo (um overflow com cantos arredondados), relativo a ele (px CSS). */
export interface Recorte {
  x: number
  y: number
  largura: number
  altura: number
  /** [horizontal, vertical] de cada canto: em cima à esquerda, em cima à direita, embaixo à direita, embaixo à esquerda. */
  raios: [number, number][]
}

/**
 * O que o original desenha na frente do vídeo (o botão de pausa, veja Frente em absorcao.ts): a
 * foto dela sobre o vídeo, em pixels da tela (`dpr` por px CSS), com o canto do vídeo em (`x`,
 * `y`) nela, e o retângulo que ela cobre, relativo ao vídeo (px CSS). Só as telas que o cruzam a
 * desenham.
 */
export interface FrenteDoVideo {
  imagem: ImageBitmap
  dpr: number
  x: number
  y: number
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * O anel do progresso do vídeo, dentro da frente (o do botão de pausa, veja ProjectVideo.tsx): sobre
 * um trilho apagado, um arco da mesma cor, cheia, que cresce do alto, no sentido do relógio, e fecha
 * a volta no fim do vídeo, com as pontas retas. Na página ele anda com o vídeo, e numa foto ficaria
 * parado: fica fora da foto da frente (veja ANEL, em fotos.ts), e o pintor o desenha por cima dela,
 * com o tempo de cada quadro, se o botão aparece nela (veja anelAVista). O centro, relativo ao
 * vídeo, o raio e a espessura da linha (px CSS), a cor e a opacidade do trilho.
 */
export interface Anel {
  x: number
  y: number
  raio: number
  espessura: number
  cor: string
  trilho: number
}

/** Mensagens da página para o pintor. */
export type ParaOPintor =
  /**
   * Um vídeo novo, ou com outras medidas: o tamanho (px CSS), quantos pixels por px CSS, o que o
   * recorta e o anel do progresso dele, se houver.
   */
  | { tipo: 'video'; video: number; largura: number; altura: number; escala: number; recortes: Recorte[]; anel: Anel | null }
  /** Um quadro novo do vídeo e onde ele cai no vídeo, de 0 (o começo) a 1 (o fim). */
  | { tipo: 'quadro'; video: number; quadro: VideoFrame; progresso: number }
  | { tipo: 'frente'; video: number; frente: FrenteDoVideo | null }
  /** Uma tela nova, que fica com o pintor. */
  | { tipo: 'tela'; tela: number; canvas: OffscreenCanvas }
  /**
   * A tela passa a mostrar o trecho do vídeo entre as alturas `cima` e `baixo` (px CSS, relativas
   * a ele), com `largura` x `altura` pixels.
   */
  | { tipo: 'mostrar'; tela: number; video: number; largura: number; altura: number; cima: number; baixo: number }
  /**
   * A fatia da tela pode aparecer nos próximos quadros (`sim`), ou ainda espera longe da faixa (ou
   * já foi engolida): só as acordadas recebem cada quadro do vídeo.
   */
  | { tipo: 'acordar'; tela: number; sim: boolean }
  /** A tela deixou de mostrar o vídeo e voltou para a reserva. */
  | { tipo: 'esconder'; tela: number }
  /** O vídeo saiu da página. */
  | { tipo: 'esquecer'; video: number }

type Pincel = OffscreenCanvasRenderingContext2D

interface Video {
  largura: number
  altura: number
  escala: number
  recortes: Recorte[]
  /** O quadro atual, recortado como na página, de onde cada tela tira a sua parte. */
  fonte: OffscreenCanvas
  pincel: Pincel | null
  /** A fonte tem um quadro (sem ele, as fatias mostram o pôster, que está na foto do bloco). */
  pintada: boolean
  frente: FrenteDoVideo | null
  anel: Anel | null
  /** O botão do anel aparece na foto da frente (veja anelAVista). */
  anelAVista: boolean
  /** Onde o quadro da fonte cai no vídeo, de 0 a 1 (o anel mostra até aí). */
  progresso: number
  telas: Set<Tela>
}

interface Tela {
  canvas: OffscreenCanvas
  pincel: Pincel | null
  video: number | null
  cima: number
  baixo: number
  acordada: boolean
  /** Mudou de trecho dormindo: desenha quando acordar. */
  atrasada: boolean
}

/** O escopo do worker (os tipos do TypeScript aqui são os da página). */
interface Escopo {
  addEventListener(tipo: 'message', ouvinte: (evento: MessageEvent<ParaOPintor>) => void): void
}

const videos = new Map<number, Video>()
const telas = new Map<number, Tela>()

/** Copia o quadro para a fonte do vídeo, recortado como o object-fit: cover da página, com os cantos que o original corta transparentes. */
function pintarFonte(video: Video, quadro: VideoFrame) {
  const { pincel, fonte, recortes, escala } = video
  if (!pincel || !quadro.displayWidth || !quadro.displayHeight) return
  const w = fonte.width
  const h = fonte.height
  const k = Math.max(w / quadro.displayWidth, h / quadro.displayHeight)
  const sw = w / k
  const sh = h / k
  if (recortes.length) {
    pincel.clearRect(0, 0, w, h)
    pincel.save()
    for (const r of recortes) {
      pincel.beginPath()
      pincel.roundRect(r.x * escala, r.y * escala, r.largura * escala, r.altura * escala, r.raios.map(([rx, ry]) => ({ x: rx * escala, y: ry * escala })))
      pincel.clip()
    }
  }
  pincel.drawImage(quadro, (quadro.displayWidth - sw) / 2, (quadro.displayHeight - sh) / 2, sw, sh, 0, 0, w, h)
  if (recortes.length) pincel.restore()
  video.pintada = true
}

/** Um pixel para olhar a foto da frente (veja anelAVista). */
let sonda: OffscreenCanvasRenderingContext2D | null | undefined

/**
 * O anel só aparece com o botão em que ele fica, que pode estar escondido (ele aparece com o mouse em
 * cima do vídeo ou depois de um toque): o pintor olha a foto da frente no ponto do trilho às 3 horas,
 * sobre o fundo do botão (o anel fica fora da foto), e desenha o anel só se ali há alguma coisa.
 */
function anelAVista({ frente, anel }: Video): boolean {
  if (!frente || !anel) return false
  sonda ??= new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true })
  if (!sonda) return false
  sonda.clearRect(0, 0, 1, 1)
  sonda.drawImage(frente.imagem, frente.x + (anel.x + anel.raio) * frente.dpr, frente.y + anel.y * frente.dpr, 1, 1, 0, 0, 1, 1)
  return (sonda.getImageData(0, 0, 1, 1).data[3] ?? 0) > 8
}

/**
 * O anel do vídeo (veja Anel), com o arco até onde o quadro atual chegou, na tela que começa na
 * altura `cima` do vídeo.
 */
function desenharAnel(pincel: Pincel, video: Video, cima: number) {
  const { anel, progresso, escala: k } = video
  if (!anel || !video.anelAVista) return
  const x = anel.x * k
  const y = (anel.y - cima) * k
  const topo = -Math.PI / 2
  pincel.save()
  pincel.lineWidth = anel.espessura * k
  pincel.strokeStyle = anel.cor
  pincel.globalAlpha = anel.trilho
  pincel.beginPath()
  pincel.arc(x, y, anel.raio * k, 0, 2 * Math.PI)
  pincel.stroke()
  if (progresso > 0) {
    pincel.globalAlpha = 1
    pincel.beginPath()
    pincel.arc(x, y, anel.raio * k, topo, topo + 2 * Math.PI * Math.min(1, progresso))
    pincel.stroke()
  }
  pincel.restore()
}

/**
 * Desenha na tela a parte do quadro atual que cai nela (ou nada, com o pôster da foto à vista) e,
 * por cima, o que fica na frente do vídeo, com o anel do progresso.
 */
function desenhar(tela: Tela) {
  tela.atrasada = false
  const video = tela.video === null ? undefined : videos.get(tela.video)
  const { pincel, canvas } = tela
  if (!pincel) return
  if (!video) {
    pincel.clearRect(0, 0, canvas.width, canvas.height)
    return
  }
  const { cima, baixo } = tela
  // um quadro sem cantos recortados cobre a tela inteira: nada do anterior sobra
  if (!video.pintada || video.recortes.length) pincel.clearRect(0, 0, canvas.width, canvas.height)
  if (video.pintada) {
    const sy = Math.min(video.fonte.height - 1, Math.round(cima * video.escala))
    const sh = Math.max(1, Math.min(video.fonte.height - sy, canvas.height))
    pincel.drawImage(video.fonte, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh)
  }
  const { frente } = video
  if (!frente) return
  const y0 = Math.max(cima, frente.y0)
  const y1 = Math.min(baixo, frente.y1)
  if (frente.x1 <= frente.x0 || y1 <= y0) return
  const { dpr } = frente
  const k = video.escala
  pincel.drawImage(
    frente.imagem,
    frente.x + frente.x0 * dpr,
    frente.y + y0 * dpr,
    (frente.x1 - frente.x0) * dpr,
    (y1 - y0) * dpr,
    frente.x0 * k,
    (y0 - cima) * k,
    (frente.x1 - frente.x0) * k,
    (y1 - y0) * k,
  )
  desenharAnel(pincel, video, cima)
}

/** A tela sai do vídeo que mostrava. */
function largar(tela: Tela) {
  if (tela.video !== null) videos.get(tela.video)?.telas.delete(tela)
  tela.video = null
}

function receber(m: ParaOPintor) {
  switch (m.tipo) {
    case 'video': {
      let video = videos.get(m.video)
      if (!video) {
        const fonte = new OffscreenCanvas(1, 1)
        video = {
          largura: 0,
          altura: 0,
          escala: 1,
          recortes: [],
          fonte,
          pincel: fonte.getContext('2d'),
          pintada: false,
          frente: null,
          anel: null,
          anelAVista: false,
          progresso: 0,
          telas: new Set(),
        }
        videos.set(m.video, video)
      }
      video.largura = m.largura
      video.altura = m.altura
      video.escala = m.escala
      video.recortes = m.recortes
      video.anel = m.anel
      video.anelAVista = anelAVista(video)
      const w = Math.max(1, Math.round(m.largura * m.escala))
      const h = Math.max(1, Math.round(m.altura * m.escala))
      if (video.fonte.width !== w || video.fonte.height !== h) {
        video.fonte.width = w
        video.fonte.height = h
        video.pintada = false
      }
      break
    }
    case 'quadro': {
      const video = videos.get(m.video)
      if (video) {
        pintarFonte(video, m.quadro)
        video.progresso = m.progresso
        for (const tela of video.telas) {
          if (tela.acordada) desenhar(tela)
          else tela.atrasada = true
        }
      }
      // o quadro prende um buffer do decodificador: sai já
      m.quadro.close()
      break
    }
    case 'frente': {
      const video = videos.get(m.video)
      video?.frente?.imagem.close()
      if (!video) {
        m.frente?.imagem.close()
        break
      }
      video.frente = m.frente
      video.anelAVista = anelAVista(video)
      for (const tela of video.telas) {
        if (tela.acordada) desenhar(tela)
        else tela.atrasada = true
      }
      break
    }
    case 'tela':
      telas.set(m.tela, { canvas: m.canvas, pincel: m.canvas.getContext('2d'), video: null, cima: 0, baixo: 0, acordada: false, atrasada: false })
      break
    case 'mostrar': {
      const tela = telas.get(m.tela)
      if (!tela) break
      largar(tela)
      tela.video = m.video
      tela.cima = m.cima
      tela.baixo = m.baixo
      videos.get(m.video)?.telas.add(tela)
      if (tela.canvas.width !== m.largura || tela.canvas.height !== m.altura) {
        tela.canvas.width = m.largura
        tela.canvas.height = m.altura
      }
      // com o que já tem do vídeo (ou vazia, com o pôster da foto à vista), já
      desenhar(tela)
      break
    }
    case 'acordar': {
      const tela = telas.get(m.tela)
      if (!tela) break
      tela.acordada = m.sim
      if (m.sim && tela.atrasada) desenhar(tela)
      break
    }
    case 'esconder': {
      const tela = telas.get(m.tela)
      if (!tela) break
      largar(tela)
      tela.acordada = false
      desenhar(tela)
      break
    }
    case 'esquecer': {
      const video = videos.get(m.video)
      if (!video) break
      for (const tela of video.telas) {
        tela.video = null
        desenhar(tela)
      }
      video.frente?.imagem.close()
      videos.delete(m.video)
      break
    }
  }
}

const escopo = self as unknown as Escopo
escopo.addEventListener('message', ({ data }) => receber(data))
