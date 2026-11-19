// A ponte entre a página e o motor do buraco negro (motor.ts). Onde dá, o motor roda num worker, com
// o canvas do fundo e a cortina transferidos para ele (OffscreenCanvas): o laço de quadros dele fica
// fora da thread principal, e nada do que pesa nela atrasa o buraco negro. Onde não dá (sem worker
// de módulo ou sem OffscreenCanvas), o mesmo motor roda aqui.

import type { DoMotor, Inicio, ParaOMotor } from './motor.ts'
import type { Iniciar } from './trabalhador.ts'

export interface Ponte {
  enviar(mensagem: ParaOMotor): void
  destruir(): void
}

/**
 * Quanto esperar (ms) o worker avisar que carregou antes de rodar o motor aqui mesmo. Os canvas só
 * vão para o worker depois desse aviso: um canvas transferido não volta, e sem o worker no ar ele
 * ficaria vazio.
 */
const ESPERA = 8000

/** Liga o motor no canvas e na cortina. `ouvir` recebe as mensagens dele. */
export function criarPonte(
  canvas: HTMLCanvasElement,
  cortina: HTMLCanvasElement,
  inicio: Inicio,
  ouvir: (mensagem: DoMotor) => void,
): Ponte {
  /** O que a página mandou antes de o motor estar no ar. */
  const fila: ParaOMotor[] = []
  let entregar: ((mensagem: ParaOMotor) => void) | null = null
  let destruido = false
  let worker: Worker | null = null
  let desistir = 0

  /** O motor roda aqui mesmo, na thread principal. */
  function aqui() {
    window.clearTimeout(desistir)
    worker?.terminate()
    worker = null
    void import('./motor.ts').then(({ criarMotor }) => {
      if (destruido) return
      const motor = criarMotor(canvas, cortina, inicio, ouvir)
      entregar = (mensagem) => motor.receber(mensagem)
      for (const mensagem of fila.splice(0)) entregar(mensagem)
    })
  }

  if (typeof Worker === 'function' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype) {
    try {
      worker = new Worker(new URL('./trabalhador.ts', import.meta.url), { type: 'module', name: 'buraco-negro' })
    } catch {
      worker = null
    }
  }

  if (!worker) aqui()
  else {
    const esse = worker
    desistir = window.setTimeout(aqui, ESPERA)
    // O worker não carregou (sem worker de módulo, por exemplo): o motor roda aqui. Depois de ele
    // começar, um erro num quadro só aparece no console, e o laço continua.
    esse.addEventListener('error', () => {
      if (esse === worker && !entregar) aqui()
    })
    esse.addEventListener('message', ({ data }: MessageEvent<DoMotor | { tipo: 'ola' }>) => {
      if (esse !== worker) return
      if (data.tipo !== 'ola') {
        ouvir(data)
        return
      }
      if (entregar) return
      window.clearTimeout(desistir)
      const telaDoCanvas = canvas.transferControlToOffscreen()
      const telaDaCortina = cortina.transferControlToOffscreen()
      const iniciar: Iniciar = { tipo: 'iniciar', canvas: telaDoCanvas, cortina: telaDaCortina, ...inicio }
      esse.postMessage(iniciar, [telaDoCanvas, telaDaCortina])
      entregar = (mensagem) => esse.postMessage(mensagem)
      for (const mensagem of fila.splice(0)) entregar(mensagem)
    })
  }

  return {
    enviar(mensagem) {
      if (entregar) entregar(mensagem)
      else fila.push(mensagem)
    },
    destruir() {
      destruido = true
      window.clearTimeout(desistir)
      entregar?.({ tipo: 'destruir' })
      entregar = null
      worker?.terminate()
      worker = null
    },
  }
}
