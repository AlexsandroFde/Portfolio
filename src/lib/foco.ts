// O foco num projeto (veja ProjectDialog.tsx): o cartão cresce até virar a página do projeto, e
// volta a ser cartão ao fechar. Quem cresce é o painel da página, já no tamanho final: um recorte
// (clip-path) mostra dele, no começo, só o retângulo do cartão, e se abre até ele inteiro. O painel
// não estica nem distorce os cantos (como numa escala). Por dentro, o cartão vira a página: o que os
// dois têm (o vídeo, o nome, a área e o ano) voa do lugar no cartão para o lugar na página, e o resto
// do cartão se apaga enquanto o resto da página aparece (veja transicao.ts).
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
  /** Quando (ms depois do começo) o resto da página aparece, ao abrir, e em quanto tempo. */
  conteudo: { espera: 200, duracao: 340 },
  /** Em quanto tempo (ms) o resto da página some, ao fechar, antes de o painel chegar ao cartão. */
  saida: 140,
  /**
   * Em quanto tempo (ms) o resto do cartão se apaga, ao abrir, e reaparece, no fim do fechar: junto
   * com ele, o fundo do painel aparece e some, e o cartão nunca muda de cor.
   */
  cartao: 220,
  /**
   * O máximo (ms) que o clique espera o texto da página chegar (junto com a rolagem até o cartão)
   * antes de abri-la: no computador, o vídeo dela fica no meio da altura do texto, e o texto que
   * chegasse no meio do caminho o tiraria do lugar para onde ele está voando.
   */
  texto: 300,
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
 * cantos de raio `raio` (os dois de cima, `raioDeCima`: retos quando a origem é o que sobra de um
 * cartão cortado em cima). Uma origem maior que o painel de algum lado não recorta desse lado.
 */
export function recorteDaOrigem(origem: Retangulo, painel: Retangulo, raio: number, raioDeCima = raio): string {
  const cima = origem.top - painel.top
  const direita = painel.right - origem.right
  const baixo = painel.bottom - origem.bottom
  const esquerda = origem.left - painel.left
  return `inset(${cima}px ${direita}px ${baixo}px ${esquerda}px round ${raioDeCima}px ${raioDeCima}px ${raio}px ${raio}px)`
}

/** O painel inteiro, com os cantos de raio `raio` (os quatro escritos, como na origem, para o meio do caminho ser contínuo). */
export const recorteInteiro = (raio: number) => `inset(0px 0px 0px 0px round ${raio}px ${raio}px ${raio}px ${raio}px)`

/**
 * Sem um cartão à vista de onde sair (a página aberta já no endereço do projeto, ou o cartão fora da
 * tela), o painel cresce de um pouco menor que ele, no lugar.
 */
export function recorteSemOrigem(painel: Retangulo, raio: number): string {
  const x = (painel.right - painel.left) * 0.06
  const y = (painel.bottom - painel.top) * 0.06
  return `inset(${y}px ${x}px ${y}px ${x}px round ${raio}px)`
}

/** Menos que isto (px) à vista de um cartão não serve de origem: a página aparece no lugar. */
const MINIMO_A_VISTA = 24

/**
 * A parte do cartão `r` que se vê numa tela de `largura` x `altura` px, com o alto da tela cortado em
 * `beira`, a linha a partir da qual ele aparece (0 sem nada por cima): a beira da absorção do buraco
 * negro, se ele ainda estiver sendo puxado (acima dela, o que se vê dele são as fatias esticadas a
 * caminho do buraco negro). Sem parte à vista que preste (fora da tela, ou quase toda coberta), null.
 * `cortado` diz se a beira cortou o cartão: em cima, então, ele acaba reto, na linha dela.
 */
export function parteVisivel(r: Retangulo, beira: number, largura: number, altura: number): { retangulo: Retangulo; cortado: boolean } | null {
  const cortado = r.top < beira
  // (um a um: os lados de um DOMRect são getters, que o espalhamento não copia)
  const retangulo = { top: Math.max(r.top, beira), right: r.right, bottom: r.bottom, left: r.left }
  const aVista = Math.min(retangulo.bottom, altura) - Math.max(retangulo.top, 0)
  if (aVista < MINIMO_A_VISTA || r.right <= 0 || r.left >= largura) return null
  return { retangulo, cortado }
}

/** Uma caixa na tela (px CSS), com o tamanho. */
export interface Caixa {
  left: number
  top: number
  width: number
  height: number
}

/**
 * O transform que põe um elemento, que está em `destino`, sobre `origem` (com a origem do transform
 * no canto de cima à esquerda): animado dele até 'none', o elemento voa de lá até o lugar dele. Uma
 * caixa (o vídeo) estica até cobrir a origem. Um texto muda de tamanho por igual, na `escalaDoTexto`
 * (a razão entre os tamanhos da letra), com o meio no meio da origem: a altura da linha não é a
 * mesma nos dois lugares, e esticá-lo pela caixa o deformaria.
 */
export function voo(origem: Caixa, destino: Caixa, escalaDoTexto?: number): string {
  if (escalaDoTexto === undefined) {
    const sx = origem.width / destino.width
    const sy = origem.height / destino.height
    return `translate(${origem.left - destino.left}px, ${origem.top - destino.top}px) scale(${sx}, ${sy})`
  }
  const s = escalaDoTexto
  const x = origem.left + (origem.width - destino.width * s) / 2 - destino.left
  const y = origem.top + (origem.height - destino.height * s) / 2 - destino.top
  return `translate(${x}px, ${y}px) scale(${s})`
}
