// Levar a página até um ponto do jeito que os links dela levam. Enquanto a absorção do buraco negro
// age, quem move a página é a rolagem suave dela (veja rolagemSuave.ts), com a aceleração e a
// velocidade dos links: o efeito é baixado à parte e se oferece aqui quando a liga. Sem ela, fica a
// rolagem do navegador, suave como a dos links pelo CSS (o scroll-behavior do index.css), ou na hora
// para quem prefere menos movimento.

/** Leva a página até `destino` (px de rolagem) e avisa quando ela para, lá ou antes. */
export type Condutor = (destino: number) => Promise<void>

let condutor: Condutor | null = null

/** A rolagem suave do buraco negro se oferece (ao ligar) ou sai (null, ao desligar). */
export function oferecerRolagem(quem: Condutor | null) {
  condutor = quem
}

/** O máximo (ms) que se espera a página chegar: ela pode parar antes, ou o laço de quadros, dormir. */
const LIMITE = 2000

/**
 * A que distância (px) do destino a página já conta como chegada. A rolagem suave chega freando aos
 * poucos (a velocidade cai com a distância que falta, veja CHEGADA em rolagemSuave.ts), e daqui ela
 * anda menos de um pixel por quadro, a 60 Hz: esperar esse resto só atrasaria quem espera por ela (a
 * página de um projeto, que abre em seguida), sem nada mudar na tela.
 */
export const QUASE_LA = 8

const quadro = () => new Promise<void>((pronto) => requestAnimationFrame(() => pronto()))
const tempo = (ms: number) => new Promise<void>((pronto) => window.setTimeout(pronto, ms))

/**
 * Espera a rolagem do navegador parar: o evento scrollend, onde há, ou alguns quadros com a rolagem
 * parada, onde não há.
 */
async function pararDoNavegador(destino: number) {
  await quadro()
  // na hora (para quem prefere menos movimento), ela já chegou
  if (Math.abs(window.scrollY - destino) < 1) return
  const temFim = 'onscrollend' in window
  if (temFim) {
    await new Promise<void>((pronto) => {
      const fim = () => {
        window.removeEventListener('scrollend', fim)
        window.clearTimeout(espera)
        pronto()
      }
      const espera = window.setTimeout(fim, LIMITE)
      window.addEventListener('scrollend', fim)
    })
    return
  }
  const ate = performance.now() + LIMITE
  let antes = Number.NaN
  let parados = 0
  while (performance.now() < ate) {
    await quadro()
    const agora = window.scrollY
    if (Math.abs(agora - destino) < 1) return
    parados = agora === antes ? parados + 1 : 0
    if (parados >= 6) return
    antes = agora
  }
}

/**
 * Leva a página até `destino` (px de rolagem), como os links dela, e espera ela parar: lá ou antes
 * (a roda, o dedo, o fim da página). Quem chama confere onde ela parou.
 */
export async function rolarAte(destino: number): Promise<void> {
  if (condutor) {
    await Promise.race([condutor(destino), tempo(LIMITE)])
    return
  }
  // 'auto' segue o scroll-behavior do CSS, como os links
  window.scrollTo({ top: destino, behavior: 'auto' })
  await pararDoNavegador(destino)
}
