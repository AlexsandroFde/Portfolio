// As telas dos vídeos da tira (veja absorcao.ts): um canvas em cada fatia que cruza um vídeo, com o
// trecho dele que cai na fatia. Quem desenha nelas é o pintor (pintor.ts), num worker, e o que ele
// desenha vai para a tela sem esperar a thread principal. Os quadros dos vídeos vão para ele assim
// que existem, lidos por um relógio próprio, e não a cada quadro da página: rolando rápido, com a
// placa de vídeo ocupada, a página fica para trás, e os vídeos da tira andavam aos trancos com ela.
//
// As telas são guardadas numa reserva e passam de fatia em fatia: um canvas entregue ao worker não
// volta, e cada um novo custa à placa de vídeo uma superfície nova.

import type { Anel, FrenteDoVideo, ParaOPintor, Recorte } from './pintor.ts'

/** De quanto em quanto tempo (ms) se olha se os vídeos com telas têm um quadro novo (eles têm uns 30 por segundo). */
const RELOGIO = 16

/** Uma tela, com o que o pintor sabe dela. */
export interface Tela {
  canvas: HTMLCanvasElement
  id: number
  /** O vídeo que ela mostra, ou -1 (na reserva). */
  video: number
  largura: number
  altura: number
  cima: number
  baixo: number
  acordada: boolean
}

/**
 * As medidas de um vídeo, como o pintor precisa: tamanho (px CSS), pixels das telas por px CSS, o
 * que o recorta e o anel do progresso dele, se houver.
 */
export interface MedidasDoVideo {
  largura: number
  altura: number
  escala: number
  recortes: Recorte[]
  anel: Anel | null
}

/** Onde o quadro cai no vídeo, de 0 (o começo) a 1 (o fim), pelo tempo dele (em µs) e a duração do vídeo. */
function progressoDe(quadro: VideoFrame, elemento: HTMLVideoElement): number {
  const { duration } = elemento
  return duration > 0 && Number.isFinite(duration) ? Math.min(1, Math.max(0, quadro.timestamp / 1e6 / duration)) : 0
}

export interface Pintor {
  /** Apresenta o vídeo ao pintor (de novo, se as medidas mudaram). */
  video(id: number, elemento: HTMLVideoElement, medidas: MedidasDoVideo): void
  /** O que o original desenha na frente do vídeo, ou null (veja FrenteDoVideo). A imagem passa ao pintor. */
  frente(id: number, frente: FrenteDoVideo | null): void
  /** Uma tela da reserva, ou uma nova. */
  pegar(): Tela
  /** A tela mostra o trecho do vídeo entre `cima` e `baixo` (px CSS, relativos a ele), com `largura` x `altura` pixels. */
  mostrar(tela: Tela, video: number, largura: number, altura: number, cima: number, baixo: number): void
  /** A fatia da tela pode aparecer nos próximos quadros: ela recebe cada quadro do vídeo. */
  acordar(tela: Tela, sim: boolean): void
  /** A tela sai da fatia e volta para a reserva. */
  devolver(tela: Tela): void
  /** O vídeo saiu da página. */
  esquecer(id: number): void
  destruir(): void
}

/** Liga o pintor, ou devolve null onde não há como (sem worker, OffscreenCanvas ou VideoFrame: as fatias mostram o pôster). */
export function criarPintor(): Pintor | null {
  if (typeof Worker !== 'function' || typeof VideoFrame !== 'function' || !('transferControlToOffscreen' in HTMLCanvasElement.prototype)) {
    return null
  }
  let worker: Worker
  try {
    worker = new Worker(new URL('./pintor.ts', import.meta.url), { type: 'module', name: 'pintor' })
  } catch {
    return null
  }
  const enviar = (mensagem: ParaOPintor, transferir: Transferable[] = []) => worker.postMessage(mensagem, transferir)
  const reserva: Tela[] = []
  let proximaTela = 0
  /** Os vídeos que o pintor conhece: o elemento, o último quadro enviado (o tempo dele) e quantas telas o mostram. */
  const videos = new Map<number, { elemento: HTMLVideoElement; ultimo: number; telas: number }>()
  let relogio = 0

  /** Os vídeos com telas que têm um quadro novo o mandam para o pintor. */
  function olhar() {
    for (const [id, video] of videos) {
      if (!video.telas || video.elemento.readyState < 2) continue
      let quadro: VideoFrame
      try {
        quadro = new VideoFrame(video.elemento)
      } catch {
        continue
      }
      if (quadro.timestamp === video.ultimo) {
        quadro.close()
        continue
      }
      video.ultimo = quadro.timestamp
      enviar({ tipo: 'quadro', video: id, quadro, progresso: progressoDe(quadro, video.elemento) }, [quadro])
    }
  }

  /** O relógio só anda enquanto algum vídeo tem telas. */
  function acertarRelogio() {
    const algum = [...videos.values()].some((video) => video.telas > 0)
    if (algum && !relogio) {
      relogio = window.setInterval(olhar, RELOGIO)
      olhar()
    } else if (!algum && relogio) {
      window.clearInterval(relogio)
      relogio = 0
    }
  }

  function contar(video: number, quanto: number) {
    const registro = videos.get(video)
    if (registro) registro.telas = Math.max(0, registro.telas + quanto)
  }

  return {
    video(id, elemento, { largura, altura, escala, recortes, anel }) {
      const antes = videos.get(id)
      // com outras medidas, a fonte do pintor recomeça vazia: o quadro atual vai de novo
      videos.set(id, { elemento, ultimo: Number.NaN, telas: antes?.telas ?? 0 })
      enviar({ tipo: 'video', video: id, largura, altura, escala, recortes, anel })
      acertarRelogio()
    },

    frente(id, frente) {
      enviar({ tipo: 'frente', video: id, frente }, frente ? [frente.imagem] : [])
    },

    pegar() {
      const guardada = reserva.pop()
      if (guardada) return guardada
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;overflow:visible'
      const id = proximaTela++
      const tela = canvas.transferControlToOffscreen()
      enviar({ tipo: 'tela', tela: id, canvas: tela }, [tela])
      return { canvas, id, video: -1, largura: 0, altura: 0, cima: 0, baixo: 0, acordada: false }
    },

    mostrar(tela, video, largura, altura, cima, baixo) {
      if (tela.video === video && tela.largura === largura && tela.altura === altura && tela.cima === cima && tela.baixo === baixo) return
      if (tela.video !== video) {
        contar(tela.video, -1)
        contar(video, 1)
      }
      Object.assign(tela, { video, largura, altura, cima, baixo })
      enviar({ tipo: 'mostrar', tela: tela.id, video, largura, altura, cima, baixo })
      acertarRelogio()
    },

    acordar(tela, sim) {
      if (tela.acordada === sim) return
      tela.acordada = sim
      enviar({ tipo: 'acordar', tela: tela.id, sim })
    },

    devolver(tela) {
      tela.canvas.remove()
      if (tela.video >= 0) {
        contar(tela.video, -1)
        enviar({ tipo: 'esconder', tela: tela.id })
      }
      Object.assign(tela, { video: -1, largura: 0, altura: 0, cima: 0, baixo: 0, acordada: false })
      reserva.push(tela)
      acertarRelogio()
    },

    esquecer(id) {
      videos.delete(id)
      enviar({ tipo: 'esquecer', video: id })
      acertarRelogio()
    },

    destruir() {
      window.clearInterval(relogio)
      relogio = 0
      videos.clear()
      reserva.length = 0
      worker.terminate()
    },
  }
}
