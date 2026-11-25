import { beiraDaAbsorcao } from './buracoNegro/beira.ts'
import { QUASE_LA, rolarAte } from './rolarAte.ts'

/** Folga (px) entre o elemento revelado e o alto livre da tela, ou o que flutua no canto de baixo. */
const FOLGA = 16

/**
 * Folga (px) entre ele e o pé da tela: mais que a margem da página de um projeto (até 24 px), que
 * sai do cartão e, com ele mais embaixo que ela, o cortaria.
 */
const FOLGA_DO_PE = 32

/**
 * Quantas vezes, no máximo, a página rola até ele: se ela parar antes de ele aparecer inteiro (a
 * roda ou o dedo no caminho, a página mudando de altura), rola de novo de onde parou.
 */
const TENTATIVAS = 3

/**
 * A faixa da tela em que um elemento com estes lados aparece inteiro, sem nada por cima (px do alto
 * da janela). Em cima, abaixo do cabeçalho (o mesmo recuo das âncoras, veja index.css) e, com a
 * absorção do buraco negro, abaixo da faixa dela, onde nada é puxado. Embaixo, acima do pé da tela e
 * do que flutua no canto de baixo (o link do idioma e o botão do som), quando ele está na mesma
 * coluna (no celular, está).
 */
function faixaLivre(lados: DOMRect): { alto: number; pe: number } {
  const recuo = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  let pe = window.innerHeight - FOLGA_DO_PE
  for (const flutuante of document.querySelectorAll('[data-flutuante]')) {
    const f = flutuante.getBoundingClientRect()
    const naColuna = f.width > 0 && f.left < lados.right && f.right > lados.left
    if (naColuna && f.top > window.innerHeight / 2) pe = Math.min(pe, f.top - FOLGA)
  }
  return { alto: Math.max(recuo, beiraDaAbsorcao()) + FOLGA, pe }
}

/**
 * Quanto a página pode rolar (px, para baixo é positivo) com o elemento inteiro à vista: ao menos
 * `menor` (o pé dele chega ao limite de baixo) e no máximo `maior` (o alto chega ao limite de cima).
 * Se ele não couber, o alto dele tem a vez, e os dois são o mesmo.
 */
function quantoRolar(elemento: HTMLElement): { menor: number; maior: number } {
  const r = elemento.getBoundingClientRect()
  const { alto, pe } = faixaLivre(r)
  const maior = r.top - alto
  return { menor: Math.min(r.bottom - pe, maior), maior }
}

const quadro = () => new Promise<void>((pronto) => requestAnimationFrame(() => pronto()))

/**
 * Rola a página o mínimo para `elemento` aparecer inteiro: abaixo do alto livre da tela (fora do
 * alcance do buraco negro, que o devolve inteiro ao rolar para cima) e acima do pé dela. Rola como os
 * links do site (veja rolarAte.ts), confere onde ele ficou e, se ainda faltar alguma parte, rola de
 * novo. Só termina quando a página para, com a absorção já em dia.
 */
export async function revelar(elemento: HTMLElement): Promise<void> {
  for (let vez = 0; vez < TENTATIVAS; vez++) {
    const { menor, maior } = quantoRolar(elemento)
    // já inteiro à vista (a poucos pixels da beira, ainda dentro da folga, também)
    if (menor <= QUASE_LA && maior >= -QUASE_LA) return
    // Um pouco além do mínimo, sem passar do outro limite: a rolagem avisa quase lá (veja QUASE_LA),
    // e ele já tem de estar inteiro à vista nesse ponto.
    const alvo = menor > 0 ? Math.min(menor + QUASE_LA, maior) : Math.max(maior - QUASE_LA, menor)
    // (até onde a página rola: além disso a rolagem nem começa, e não haveria fim para esperar)
    const maxima = document.documentElement.scrollHeight - window.innerHeight
    const destino = Math.min(maxima, Math.max(0, window.scrollY + alvo))
    if (Math.abs(destino - window.scrollY) < 1) return
    await rolarAte(destino)
    // dois quadros: a absorção põe o bloco de volta inteiro no lugar (veja preparar, em absorcao.ts)
    await quadro()
    await quadro()
  }
}
