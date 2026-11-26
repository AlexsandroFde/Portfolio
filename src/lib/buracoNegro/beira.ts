// A beira da absorção: a linha do alto da tela abaixo da qual a página aparece como é. Acima dela,
// na faixa em que o buraco negro absorve o conteúdo, o que se vê é a cortina e, por cima, as fatias
// do que está sendo puxado, esticadas a caminho dele; o original fica atrás, cortado na beira (veja
// absorcao.ts). O efeito publica a beira numa variável CSS enquanto a absorção age e a tira quando
// ela para. Quem precisa saber que parte da página está à vista (a página de um projeto, que sai do
// cartão) lê aqui, sem carregar o efeito, que é baixado à parte.

/** A variável CSS, na raiz, com a beira em px (do alto da janela). */
export const VARIAVEL_DA_BEIRA = '--beira-da-absorcao'

/**
 * Onde a absorção corta a tela agora (px CSS do alto da janela), ou 0 sem ela: com o efeito parado
 * ou com a página no topo, onde a cortina ainda não apareceu (ela surge no primeiro pixel de rolagem).
 */
export function beiraDaAbsorcao(): number {
  if (window.scrollY < 1) return 0
  const valor = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(VARIAVEL_DA_BEIRA))
  return Number.isFinite(valor) ? valor : 0
}

/**
 * O elemento com o foco do teclado, ou null. O foco de um clique (num botão, num link) não conta,
 * só o que aparece (`:focus-visible`): senão o bloco clicado nunca seria absorvido.
 */
export function focoDoTeclado(): Element | null {
  const focado = document.activeElement
  return focado instanceof Element && focado !== document.body && focado.matches(':focus-visible') ? focado : null
}

/**
 * O atributo que a absorção põe num bloco que ela deixou inteiro, no lugar, por cima da cortina:
 * com o foco do teclado dentro, ou ainda sem foto (veja elevar, em absorcao.ts). Um bloco assim não
 * está sendo puxado, mesmo dentro da faixa.
 */
export const ATRIBUTO_POR_CIMA = 'data-por-cima'

/** O bloco está inteiro, por cima da cortina (e não esticado a caminho do buraco negro)? */
export const estaPorCima = (bloco: Element) => bloco.hasAttribute(ATRIBUTO_POR_CIMA)

/**
 * O atributo que esconde um bloco enquanto outra coisa o mostra: o cartão de um projeto, enquanto ele
 * é a página do projeto (veja ProjectDialog.tsx). O CSS o esconde (veja index.css), e a absorção não
 * tira foto dele assim: a foto sairia vazia, e depois de o cartão voltar, a parte dele que vem da foto
 * (tudo menos o vídeo, que é desenhado ao vivo) passaria vazia pela faixa. Quando o atributo sai, a
 * foto é refeita (veja absorcao.ts).
 */
export const ATRIBUTO_ESCONDIDO = 'data-escondido'

