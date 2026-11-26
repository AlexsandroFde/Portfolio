// A passagem de dentro do cartão para a página do projeto (veja ProjectDialog.tsx): o que os dois
// têm voa de um lugar para o outro, e o resto de um se apaga enquanto o resto do outro aparece. Aqui
// ficam as peças, sem React: quem voa e como, o que aparece e some, a cópia do cartão e o vídeo.
import { ATRIBUTO_ESCONDIDO, ATRIBUTO_POR_CIMA } from '../../lib/buracoNegro/beira.ts'
import { ABRE_PROJETO, voo, type Caixa } from '../../lib/foco.ts'

/**
 * O atributo que marca, no cartão e na página, o que os dois têm: o mesmo valor nos dois lados (o
 * vídeo, o nome, a área e o ano). O nome, a área e o ano são texto, e mudam de tamanho por igual.
 */
export const ATRIBUTO_DO_VOO = 'data-voo'
export type NomeDoVoo = 'midia' | 'titulo' | 'area' | 'ano'
const TEXTOS: ReadonlySet<string> = new Set<NomeDoVoo>(['titulo', 'area', 'ano'])

/** O atributo, para pôr num elemento: `{...marcaDoVoo('titulo')}`. */
export const marcaDoVoo = (nome: NomeDoVoo) => ({ [ATRIBUTO_DO_VOO]: nome })

/** Os quadros-chave das duas pontas de uma peça: sobre a do cartão e no lugar dela, na página. */
type Pontas = [noCartao: Keyframe, naPagina: Keyframe]

/**
 * Uma peça que voa: a do cartão (que fica escondida enquanto isso), a da página (que é quem voa) e as
 * pontas do caminho. O movimento é só o transform (e o que não muda nele), que o navegador move fora
 * da thread principal: no começo da abertura ela está ocupada com a página nova, e as peças andariam
 * aos saltos, cada uma num passo, e atrás do recorte do painel, que corre fora dela. Uma cor que muda
 * na mesma animação a prenderia lá. O resto (a cor do texto, a borda do vídeo) muda à parte, na
 * thread principal, e um atraso ali quase não se vê.
 */
export interface Voo {
  cartao: HTMLElement
  pagina: HTMLElement
  movimento: Pontas
  aparencia: Pontas | null
}

/** Põe a peça para voar: do cartão para a página (`ida`) ou de volta. */
export function voar(voo: Voo, ida: boolean, opcoes: KeyframeAnimationOptions): Animation[] {
  const sentido = (pontas: Pontas) => (ida ? pontas : [pontas[1], pontas[0]])
  const animacoes = [voo.pagina.animate(sentido(voo.movimento), opcoes)]
  if (voo.aparencia) animacoes.push(voo.pagina.animate(sentido(voo.aparencia), opcoes))
  return animacoes
}

const caixaDe = (elemento: Element): Caixa => {
  const r = elemento.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

/** A caixa inteira dentro da área `a`? */
const dentro = (c: Caixa, a: DOMRect) =>
  c.top >= a.top - 0.5 && c.top + c.height <= a.bottom + 0.5 && c.left >= a.left - 0.5 && c.left + c.width <= a.right + 0.5

/** A área da tela em que o elemento aparece: a da caixa que o rola, se houver uma, ou a janela. */
function areaVisivel(elemento: Element): DOMRect {
  for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
    const { overflowY } = getComputedStyle(pai)
    if (overflowY === 'auto' || overflowY === 'scroll') return pai.getBoundingClientRect()
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
}

/** Em quantas linhas o texto está quebrado. */
function linhas(altura: number, estilo: CSSStyleDeclaration): number {
  const linha = Number.parseFloat(estilo.lineHeight) || Number.parseFloat(estilo.fontSize) * 1.2
  return Math.round(altura / linha)
}

/**
 * Um texto: muda de tamanho por igual, do tamanho da letra no cartão até o da página, e de cor (a do
 * cartão pode ser a do mouse em cima). Passa por cima do vídeo, que ele cruza no caminho (no cartão
 * ele fica embaixo do vídeo, na página, em cima). Quebrado em linhas diferentes nos dois lugares, ele
 * não vira um no outro só mudando de tamanho: não voa.
 */
function pontasDoTexto(cartao: HTMLElement, pagina: HTMLElement, de: Caixa, para: Caixa): Pick<Voo, 'movimento' | 'aparencia'> | null {
  const noCartao = getComputedStyle(cartao)
  const naPagina = getComputedStyle(pagina)
  if (linhas(de.height, noCartao) !== linhas(para.height, naPagina)) return null
  const escala = Number.parseFloat(noCartao.fontSize) / Number.parseFloat(naPagina.fontSize)
  const comum = { transformOrigin: '0 0', zIndex: 1 }
  return {
    movimento: [
      { ...comum, transform: voo(de, para, escala) },
      { ...comum, transform: 'none' },
    ],
    aparencia: noCartao.color === naPagina.color ? null : [{ color: noCartao.color }, { color: naPagina.color }],
  }
}

/**
 * O vídeo: estica do quadro do cartão até a caixa da página. No cartão, ele não tem borda própria
 * (a do cartão o envolve) nem canto redondo embaixo, só a linha que o separa do texto; os cantos de
 * cima são os do cartão, que o recorte do painel já arredonda.
 */
function pontasDaCaixa(pagina: HTMLElement, de: Caixa, para: Caixa): Pick<Voo, 'movimento' | 'aparencia'> {
  const estilo = getComputedStyle(pagina)
  const raio = estilo.borderTopLeftRadius
  const linha = estilo.borderTopColor
  return {
    movimento: [
      { transformOrigin: '0 0', transform: voo(de, para) },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    aparencia: [
      { borderRadius: `${raio} ${raio} 0px 0px`, borderColor: `transparent transparent ${linha} transparent` },
      { borderRadius: `${raio} ${raio} ${raio} ${raio}`, borderColor: `${linha} ${linha} ${linha} ${linha}` },
    ],
  }
}

/**
 * As peças que voam entre o cartão e a página: as que os dois têm e que estão inteiras à vista dos
 * dois lados (no cartão, abaixo de `alto`, a linha a partir da qual ele aparece), e dentro da caixa
 * que rola a da página, que cortaria o caminho. Uma peça cortada (o vídeo da página com o texto
 * rolado, por exemplo) não voa: ela some e aparece com o resto.
 */
export function voosEntre(cartao: HTMLElement, pagina: HTMLElement, alto: number): Voo[] {
  const tela = new DOMRect(0, alto, window.innerWidth, window.innerHeight - alto)
  const voos: Voo[] = []
  for (const naPagina of pagina.querySelectorAll<HTMLElement>(`[${ATRIBUTO_DO_VOO}]`)) {
    const nome = naPagina.getAttribute(ATRIBUTO_DO_VOO) ?? ''
    const noCartao = cartao.querySelector<HTMLElement>(`[${ATRIBUTO_DO_VOO}="${CSS.escape(nome)}"]`)
    if (!noCartao) continue
    const de = caixaDe(noCartao)
    const para = caixaDe(naPagina)
    const area = areaVisivel(naPagina)
    if (de.width < 1 || para.width < 1 || !dentro(de, tela) || !dentro(de, area) || !dentro(para, area)) continue
    const pontas = TEXTOS.has(nome) ? pontasDoTexto(noCartao, naPagina, de, para) : pontasDaCaixa(naPagina, de, para)
    if (pontas) voos.push({ cartao: noCartao, pagina: naPagina, ...pontas })
  }
  return voos
}

/**
 * O que, dentro de `raiz`, aparece e some por inteiro: os pedaços que não levam nenhuma peça que voa
 * (as que voam vão e voltam inteiras, e o que as tem dentro só passa a vez para os filhos). Quem tem
 * uma peça que voa dentro não pode pintar nada (fundo, borda): isso apareceria de uma vez.
 */
export function semVoo(raiz: Element, voos: readonly Voo[]): HTMLElement[] {
  const voam = voos.map((voo) => voo.pagina)
  const partes: HTMLElement[] = []
  const visitar = (pai: Element) => {
    for (const filho of pai.children) {
      if (!(filho instanceof HTMLElement) || voam.includes(filho)) continue
      if (voam.some((peca) => filho.contains(peca))) visitar(filho)
      else partes.push(filho)
    }
  }
  visitar(raiz)
  return partes
}

/** O quadro em que o vídeo está, numa tela (canvas) do tamanho dele, ou null sem quadro ainda. */
function fotoDoVideo(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (video.readyState < 2 || !video.videoWidth) return null
  const tela = document.createElement('canvas')
  tela.width = video.videoWidth
  tela.height = video.videoHeight
  try {
    tela.getContext('2d')?.drawImage(video, 0, 0)
  } catch {
    return null
  }
  tela.setAttribute('aria-hidden', 'true')
  return tela
}

/** O que o mouse em cima muda no cartão (as cores, o ícone que cresce): a cópia fica igual a ele. */
const CORES = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'] as const
const FORMA = ['opacity', 'transform', 'scale', 'translate', 'rotate'] as const

/**
 * Uma cópia do cartão, inerte, no lugar dele dentro de `caixa` (que fica no painel, por baixo da
 * página): o que dele não voa (a descrição, as tecnologias, o fundo e a borda) se apaga dali enquanto
 * a página aparece, ou volta a aparecer quando ela vira cartão de novo. As peças que voam ficam
 * escondidas na cópia: quem as mostra são as da página, voando. A cópia tem a cara que o cartão tem
 * agora (com o mouse em cima, que nela não está), e o vídeo dela, o quadro em que o do cartão está,
 * ou o de `quadroDe` (o da página, que o do cartão vai continuar), se ele tiver um.
 */
export function copiaDoCartao(cartao: HTMLElement, caixa: HTMLElement, voos: readonly Voo[], quadroDe?: HTMLVideoElement | null): HTMLElement {
  const copia = cartao.cloneNode(true) as HTMLElement
  const originais = [...cartao.querySelectorAll('*')]
  const copias = [...copia.querySelectorAll('*')]
  const escondidos = voos.map((voo) => voo.cartao)
  originais.forEach((original, i) => {
    const peca = copias[i]
    if (!(peca instanceof HTMLElement || peca instanceof SVGElement)) return
    // (a cópia não é o cartão: ninguém a acha por estes)
    for (const atributo of ['id', ATRIBUTO_DO_VOO, ABRE_PROJETO]) peca.removeAttribute(atributo)
    if (escondidos.includes(original as HTMLElement)) {
      peca.style.visibility = 'hidden'
      return
    }
    if (escondidos.some((escondido) => escondido.contains(original))) {
      // um vídeo escondido não serve para nada na cópia
      if (peca instanceof HTMLVideoElement) peca.remove()
      return
    }
    const estilo = getComputedStyle(original)
    for (const nome of CORES) peca.style.setProperty(nome, estilo.getPropertyValue(nome))
    // (dentro de um ícone, a forma vem dos atributos do SVG)
    if (!(peca instanceof SVGElement && peca.ownerSVGElement)) for (const nome of FORMA) peca.style.setProperty(nome, estilo.getPropertyValue(nome))
    if (original instanceof HTMLVideoElement) {
      const foto = (quadroDe && fotoDoVideo(quadroDe)) ?? fotoDoVideo(original)
      if (foto) {
        foto.className = original.className
        peca.replaceWith(foto)
      }
    }
  })
  const estilo = getComputedStyle(cartao)
  for (const nome of CORES) copia.style.setProperty(nome, estilo.getPropertyValue(nome))
  for (const atributo of ['id', 'data-reveal', 'data-revealed', ATRIBUTO_POR_CIMA, ATRIBUTO_ESCONDIDO]) copia.removeAttribute(atributo)
  copia.inert = true
  copia.setAttribute('aria-hidden', 'true')
  const r = cartao.getBoundingClientRect()
  const base = caixa.getBoundingClientRect()
  Object.assign(copia.style, {
    position: 'absolute',
    left: `${r.left - base.left}px`,
    top: `${r.top - base.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    margin: '0',
    zIndex: 'auto',
    visibility: 'visible',
  })
  caixa.replaceChildren(copia)
  return copia
}

/**
 * Leva o vídeo `para` ao ponto em que `de` está, tocando ou parado como ele: o cartão continua o
 * vídeo da página, ou a página o do cartão, em vez de recomeçá-lo. Sem quadro em `de` (ainda no
 * pôster), nada muda. Diz se continuou.
 */
export function continuarVideo(de: HTMLVideoElement | null | undefined, para: HTMLVideoElement | null | undefined): boolean {
  if (!de || !para || de.readyState < 2) return false
  para.currentTime = de.currentTime
  if (de.paused) para.pause()
  else {
    para.muted = true
    void para.play().catch(() => {})
  }
  return true
}

/**
 * O quadro em que o vídeo `de` está, por cima do vídeo `para` (que continua dali, veja
 * continuarVideo), até ele mostrar o quadro dele: até ele carregar e chegar lá, não aparece o pôster
 * (nem fica preto). Logo depois do vídeo, e não por cima da caixa toda: o botão de pausar continua
 * por cima. Devolve como tirá-lo antes.
 */
export function quadroPorCima(de: HTMLVideoElement | null | undefined, para: HTMLVideoElement | null | undefined): () => void {
  const foto = de && para ? fotoDoVideo(de) : null
  if (!de || !para || !foto) return () => {}
  Object.assign(foto.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: getComputedStyle(para).objectFit, pointerEvents: 'none' })
  para.after(foto)
  const alvo = de.currentTime
  let pedido = 0
  const tirar = () => {
    foto.remove()
    para.removeEventListener('seeked', depoisDoSalto)
    if (pedido) para.cancelVideoFrameCallback(pedido)
    pedido = 0
  }
  // Onde dá para saber de cada quadro, sai no primeiro do ponto certo; onde não dá, quando o vídeo
  // chega ao ponto, e um quadro depois (o da chegada já está na tela).
  const depoisDoSalto = () => requestAnimationFrame(() => requestAnimationFrame(tirar))
  if (typeof para.requestVideoFrameCallback === 'function') {
    const aCadaQuadro: VideoFrameRequestCallback = (_, quadro) => {
      if (quadro.mediaTime >= alvo - 0.25) tirar()
      else pedido = para.requestVideoFrameCallback(aCadaQuadro)
    }
    pedido = para.requestVideoFrameCallback(aCadaQuadro)
  } else para.addEventListener('seeked', depoisDoSalto, { once: true })
  return tirar
}
