// A ponte entre a página e o motor do buraco negro (motor.ts). Onde dá, o motor roda num worker, com
// o canvas do fundo, a cortina, a tampa e a tela de cima transferidos para ele (OffscreenCanvas): o
// laço de quadros dele fica fora da thread principal, e nada do que pesa nela atrasa o buraco negro.
// Onde não dá (sem worker de módulo ou sem OffscreenCanvas), o mesmo motor roda aqui.

import type { DoMotor, Inicio, ParaOMotor } from './motor.ts'
import type { Iniciar } from './trabalhador.ts'

export interface Ponte {
  /** Manda a mensagem ao motor; o que vai em `transferir` (a foto do topo) passa para ele, sem cópia. */
  enviar(mensagem: ParaOMotor, transferir?: Transferable[]): void
  destruir(): void
}

/**
 * Quanto esperar (ms) o worker avisar que carregou antes de rodar o motor aqui mesmo. Os canvas só
 * vão para o worker depois desse aviso: um canvas transferido não volta, e sem o worker no ar ele
 * ficaria vazio.
 */
const ESPERA = 8000

/** Liga o motor no canvas, na cortina, na tampa e na tela de cima. `ouvir` recebe as mensagens dele. */
export function criarPonte(
  canvas: HTMLCanvasElement,
  cortina: HTMLCanvasElement,
  tampa: HTMLCanvasElement,
  topo: HTMLCanvasElement,
  inicio: Inicio,
  ouvir: (mensagem: DoMotor) => void,
): Ponte {
  /** O que a página mandou antes de o motor estar no ar. */
  const fila: [ParaOMotor, Transferable[]][] = []
  let entregar: ((mensagem: ParaOMotor, transferir: Transferable[]) => void) | null = null
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
      const motor = criarMotor(canvas, cortina, tampa, topo, inicio, ouvir)
      entregar = (mensagem) => motor.receber(mensagem)
      for (const [mensagem, transferir] of fila.splice(0)) entregar(mensagem, transferir)
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
      const telas = [canvas, cortina, tampa, topo].map((tela) => tela.transferControlToOffscreen())
      const [telaDoCanvas, telaDaCortina, telaDaTampa, telaDeCima] = telas as [OffscreenCanvas, OffscreenCanvas, OffscreenCanvas, OffscreenCanvas]
      const iniciar: Iniciar = { tipo: 'iniciar', canvas: telaDoCanvas, cortina: telaDaCortina, tampa: telaDaTampa, topo: telaDeCima, ...inicio }
      esse.postMessage(iniciar, telas)
      entregar = (mensagem, transferir) => esse.postMessage(mensagem, transferir)
      for (const [mensagem, transferir] of fila.splice(0)) entregar(mensagem, transferir)
    })
  }

  return {
    enviar(mensagem, transferir = []) {
      if (entregar) entregar(mensagem, transferir)
      else fila.push([mensagem, transferir])
    },
    destruir() {
      destruido = true
      window.clearTimeout(desistir)
      entregar?.({ tipo: 'destruir' }, [])
      entregar = null
      worker?.terminate()
      worker = null
    },
  }
}
