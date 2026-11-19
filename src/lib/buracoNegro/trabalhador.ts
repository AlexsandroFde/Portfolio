// O worker do buraco negro: recebe da página o canvas do fundo e a cortina (OffscreenCanvas,
// transferidos de lá, veja ponte.ts) e roda neles o motor (motor.ts), com o laço de quadros dele,
// longe da thread principal.

import { criarMotor, type Inicio, type Motor, type ParaOMotor } from './motor.ts'

/** O que a página manda primeiro: os dois canvas e o resto do que o motor precisa para começar. */
export interface Iniciar extends Inicio {
  tipo: 'iniciar'
  canvas: OffscreenCanvas
  cortina: OffscreenCanvas
}

/** O escopo do worker (os tipos do TypeScript aqui são os da página). */
interface Escopo {
  postMessage(mensagem: unknown): void
  addEventListener(tipo: 'message', ouvinte: (evento: MessageEvent<ParaOMotor | Iniciar>) => void): void
  close(): void
}

const escopo = self as unknown as Escopo
let motor: Motor | null = null

escopo.addEventListener('message', ({ data }) => {
  if (data.tipo === 'iniciar') {
    motor ??= criarMotor(data.canvas, data.cortina, data, (mensagem) => escopo.postMessage(mensagem))
    return
  }
  motor?.receber(data)
  if (data.tipo === 'destruir') escopo.close()
})

// avisa a página que o worker carregou: só então ela entrega os canvas
escopo.postMessage({ tipo: 'ola' })
