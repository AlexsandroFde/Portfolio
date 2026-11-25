// O foco num projeto (veja ProjectDialog.tsx): o cartão cresce até virar a página do projeto, e
// volta a ser cartão ao fechar. Quem cresce é o painel da página, já no tamanho final: um recorte
// (clip-path) mostra dele, no começo, só o retângulo do cartão, e se abre até ele inteiro. O conteúdo
// não estica nem distorce os cantos (como numa escala), e aparece quando o painel já está aberto.
//
// Aqui ficam só as contas, os tempos e o elo entre o cartão e a página, sem nada de React: quem anima
// é o diálogo.

/** O id do cartão de um projeto em destaque: é dele que a página do projeto sai, e para ele que volta. */
export const idDoCartao = (id: string) => `projeto-${id}`

/** O atributo do botão do cartão que abre o projeto: o foco volta a ele quando a página fecha. */
export const ABRE_PROJETO = 'data-abre-projeto'

/**
 * Duração (ms) e curva de cada movimento. A curva sai rápido e chega devagar, mas distribui o
 * crescimento pelo tempo todo: com a do resto do site (ease-out-expo), o painel já estava quase
 * aberto em 100 ms, e não dava para ver que ele saía do cartão.
 */
export const TEMPOS = {
  abrir: 620,
  fechar: 420,
  /** Quando (ms depois do começo) o conteúdo aparece, e em quanto tempo. */
  conteudo: { espera: 260, duracao: 340 },
  /** Sem movimento (para quem prefere menos movimento): só aparece e some. */
  semMovimento: 160,
  curva: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const

/** Um retângulo na tela (px CSS), como o de getBoundingClientRect. */
export interface Retangulo {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * O recorte que deixa à vista, do painel em `painel`, só o retângulo `origem` (o cartão), com os
 * cantos de raio `raio`. Uma origem maior que o painel de algum lado não recorta desse lado.
 */
export function recorteDaOrigem(origem: Retangulo, painel: Retangulo, raio: number): string {
  const cima = origem.top - painel.top
  const direita = painel.right - origem.right
  const baixo = painel.bottom - origem.bottom
  const esquerda = origem.left - painel.left
  return `inset(${cima}px ${direita}px ${baixo}px ${esquerda}px round ${raio}px)`
}

/** O painel inteiro, com os cantos de raio `raio`. */
export const recorteInteiro = (raio: number) => `inset(0px 0px 0px 0px round ${raio}px)`

/**
 * Sem um cartão à vista de onde sair (a página aberta já no endereço do projeto, ou o cartão fora da
 * tela), o painel cresce de um pouco menor que ele, no lugar.
 */
export function recorteSemOrigem(painel: Retangulo, raio: number): string {
  const x = (painel.right - painel.left) * 0.06
  const y = (painel.bottom - painel.top) * 0.06
  return `inset(${y}px ${x}px ${y}px ${x}px round ${raio}px)`
}

/** O retângulo aparece, ao menos em parte, numa tela de `largura` x `altura` px? */
export function estaNaTela(r: Retangulo, largura: number, altura: number): boolean {
  return r.bottom > 0 && r.top < altura && r.right > 0 && r.left < largura && r.bottom - r.top > 0
}
