// Absorção: o conteúdo que sobe até perto do buraco negro é puxado até ele e engolido, e é cuspido
// de volta quando a página sobe. Quanto ele já foi absorvido depende só de onde ele está na tela, e
// o desenho de cada posição da rolagem é calculado de antemão: rolando devagar ou rápido, com a
// roda, o botão do meio, o toque ou o teclado, cada posição da página mostra sempre a mesma imagem,
// como um filme que a rolagem avança e volta.
//
// O efeito acontece numa faixa estreita no alto da tela (veja Faixa). Cada linha horizontal do
// conteúdo que entra nela é puxada no seu ritmo, devagar no começo e cada vez mais rápido: quanto
// mais alto ela está, mais perto do buraco negro já chegou, mais estreita e mais apagada ficou (ela
// esmaece na medida em que se estreita). As linhas de cima vão na frente e as de baixo ainda estão
// presas à página: o conteúdo se alonga numa tira contínua que sai da página e entra no buraco
// negro, a "espaguetificação" de quem cai num, sumindo aos poucos até cruzar a borda da sombra (o
// horizonte).
// Um bloco alto (um cartão de projeto) não espera chegar inteiro: só o trecho dele que já está na
// faixa é puxado, e o resto continua no lugar até a sua vez.
//
// Uma transformação CSS deforma o elemento inteiro de um jeito só, então o trecho na faixa é
// desenhado em fatias finas, cada uma com o seu trapézio. As bordas de fatias vizinhas coincidem, e
// a tira sai contínua. Tudo é pré-renderizado: cada bloco tem uma foto (veja fotos.ts), feita uma
// vez, longe da faixa, e cada fatia é só um retângulo com o pedaço dela da foto, sem nada dentro.
// As fatias ficam numa camada fixa no alto da tela, sem foco, clique ou leitor de tela, por cima de
// uma cortina (veja index.ts) que cobre a faixa com o fundo e o buraco negro: o original não sai do
// lugar nem muda, só passa por trás dela. Por cima das fatias fica a tampa, a mesma imagem da
// cortina, que as esmaece pelo caminho e as apaga na sombra do buraco negro.
//
// Quem move as fatias é o navegador, e não o JavaScript: cada uma tem uma animação presa à rolagem
// (veja rolagem.ts), com um quadro-chave para cada pixel da tela que a página rola enquanto a fatia
// atravessa a faixa. A rolagem corre fora do JavaScript, que chega a ficar um quadro ou mais para
// trás dela; as animações correm junto com ela, na mesma etapa, e a tira nunca se descola do
// original na beira da cortina, por mais rápida que seja a rolagem. Ao JavaScript resta pôr as
// fatias no lugar com antecedência, enquanto a página se aproxima delas (veja preparar), trocar a
// foto quando o original muda (o mouse em cima, o tema, o que o React redesenhar) e dizer ao pintor
// dos vídeos (veja telas.ts) que trecho de que vídeo cada fatia mostra.
//
// Os blocos são os que já têm animação de entrada ([data-reveal] e .enter). As linhas soltas da
// página (a borda de cima das seções e das listas) entram como blocos de uma fatia só, desenhadas
// por um modelo da linha (uma linha só não precisa de foto).

import { ACELERACAO, type Faixa } from './faixa.ts'
import { ANEL, elementosDe, enquadrar, fotografar, soltarFoto, type Foto, type Fotos } from './fotos.ts'
import type { Anel, Recorte } from './pintor.ts'
import type { Relogio } from './rolagem.ts'
import { criarPintor, type Pintor, type Tela } from './telas.ts'
import { alvoEm, type Alvo, type Caminho } from './trajeto.ts'

/**
 * O que a absorção precisa saber da tela. Nada disso muda com a rolagem, só com o tamanho da janela.
 * O caminho do buraco negro ao longo da página é o mesmo que o motor desenha (veja trajeto.ts).
 */
export interface Cena extends Caminho {
  faixa: Faixa
  /** A força do puxão com a página rolada até `s`: de 0 (nada é puxado, como no topo da página) a 1. */
  forca(s: number): number
  /** A partir de qual rolagem a força é 1. */
  plena: number
}

/**
 * Um trecho da rolagem em volta da posição atual, em px: para cima ([0], de volta ao que já foi
 * engolido) e para baixo ([1], o que vem pela frente).
 */
export type Folga = readonly [number, number]

/** Quanto preparar, a cada quadro (veja preparar). */
export interface Preparo {
  /** As fatias que aparecem com a página rolada dentro da folga ficam presas à rolagem. */
  folga: Folga
  /** As que podem aparecer até `urgencia` px daqui, na hora (até ORCAMENTO_URGENTE ms). */
  urgencia: number
  /** As outras, com o tempo que sobrar: até `orcamento` ms por quadro. */
  orcamento: number
  /**
   * Os blocos que aparecem com a página dentro desta faixa têm a foto refeita primeiro, quando o
   * original muda; os mais longe, só quando chegarem perto.
   */
  aquecer: Folga
}

export interface Absorcao {
  /** A tela mudou (tamanho da janela, do cabeçalho, o zoom): refaz as trajetórias. */
  definirCena(cena: Cena): void
  /** Mede os blocos de novo (depois de mudanças no layout). */
  medir(): void
  /**
   * Põe no lugar as fatias que a rolagem pode levar à faixa (veja Preparo), com a página rolada até
   * `rolagem`. Devolve quantas fatias novas foram criadas.
   */
  preparar(rolagem: number, preparo: Preparo): number
  /** Ficaram fatias por pôr no lugar para o próximo quadro. */
  pendente(): boolean
  /** Devolve todos os blocos ao normal e apaga as fatias e as fotos. */
  limpar(): void
}

interface Video {
  /** O número dele no pintor (veja telas.ts). */
  id: number
  elemento: HTMLVideoElement
  /** Posição dentro do bloco e tamanho (px CSS). */
  x: number
  y: number
  largura: number
  altura: number
  /** O que corta o vídeo no original (os cantos arredondados do cartão): as telas mostram o vídeo recortado assim. */
  recortes: Recorte[]
  /** O anel do progresso dele, que as telas desenham a cada quadro (veja Anel), ou null. */
  anel: Anel | null
  /** Pixels das telas por px CSS. */
  escala: number
  /** O pintor já conhece o vídeo. */
  apresentado: boolean
  /** Conta as frentes mandadas ao pintor: uma que chega depois de outra mais nova não vale. */
  frentes: number
}

/**
 * Um elemento do bloco que se anima sem parar (o ponto que pulsa ao lado do status): numa foto ele
 * ficaria parado. Ele fica fora da foto, e a fatia que passa pelo meio dele leva uma cópia dele,
 * viva, no mesmo passo do original.
 */
interface Vivo {
  elemento: HTMLElement
  /** A posição dele entre os elementos do bloco (veja elementosDe). */
  indice: number
  /** Posição relativa ao bloco e tamanho (px CSS). */
  x: number
  y: number
  largura: number
  altura: number
}

/** Uma fatia na tela: um retângulo com o seu pedaço da foto do bloco. */
interface Tira {
  caixa: HTMLDivElement
  /** Para cada vídeo do bloco, a tela em que a fatia mostra a parte dele que cai nela, se cair alguma. */
  telas: (Tela | null)[]
  /** Para cada elemento vivo do bloco, a cópia dele na fatia, se for ela que passa pelo meio dele. */
  copias: (HTMLElement | null)[]
  /** A fatia que ela mostra, ou -1 (ainda sem lugar, ou já fora da página). */
  fatia: number
  /** A animação que a leva pela faixa, presa à rolagem. */
  animacao: Animation | null
  /** O modelo dos quadros-chave dessa animação (veja trajeto). */
  modelo: KeyframeEffect | null
}

/**
 * O que o original desenha na frente dos vídeos (o botão de pausa). Fica fora da foto do bloco, numa
 * foto à parte, que as telas desenham por cima de cada quadro do vídeo.
 */
interface Frente {
  /** Os elementos, pela posição (veja elementosDe). */
  elementos: number[]
  /** Os mesmos elementos, no original. */
  nos: Element[]
  /** O retângulo que eles ocupam, relativo ao bloco (px CSS): só as telas que o cruzam desenham a frente. */
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Bloco {
  /** O elemento da página, ou, numa linha solta, o modelo dela (fora da página). */
  elemento: HTMLElement
  /** Uma linha solta (a borda de uma seção ou lista), sem foto, vídeos nem React dentro. */
  linha: boolean
  // posição e tamanho na página, sem transformações
  x: number
  y: number
  largura: number
  altura: number
  /**
   * A grade das fatias (veja enquadrar): o retângulo em pixels inteiros da tela que contém o bloco,
   * o mesmo da foto. As fatias ficam sempre em pixels inteiros, e a foto cai nelas pixel a pixel.
   */
  esquerda: number
  topo: number
  larguraDaGrade: number
  alturaDaGrade: number
  fase: string
  videos: Video[]
  frente: Frente | null
  vivos: Vivo[]
  tiras: Tira[]
  /** A foto que as fatias mostram. */
  foto: Foto | null
  /**
   * As fotos do conteúdo de agora, uma para cada estado do mouse sobre o bloco em que uma foi feita
   * (veja chaveDoMouse), a que está à vista entre elas: o mouse que sai do bloco, ou volta a um
   * estado já visto, troca a foto na hora, mesmo rolando.
   */
  variantes: Map<string, Foto>
  /** O estado do mouse da foto à vista. */
  chave: string
  /** O que fica na frente dos vídeos, sozinho (veja Frente). */
  fotoDaFrente: HTMLCanvasElement | null
  /** O original mudou depois da foto: ela precisa ser refeita (a de agora vale até a nova ficar pronta). */
  velha: boolean
  /** Só o que fica na frente dos vídeos mudou (o ícone do botão de pausa). */
  soFrente: boolean
  /** Só o mouse mudou o bloco: a foto nova pode esperar o bloco chegar perto da faixa. */
  soMouse: boolean
  /** Uma foto está sendo feita. */
  fotografando: boolean
  /** Quando a última foto falhou (ms): espera um pouco para tentar de novo. */
  falhou: number
  /** Quando o mouse mudou o bloco pela última vez (ms): a foto espera as transições acabarem. */
  mexido: number
  /** O elemento mais fundo do bloco com o mouse em cima (os outros são os ancestrais dele), ou null. */
  mouse: Element | null
  /**
   * Os trajetos já calculados (veja trajeto): efeitos com os quadros-chave, sem elemento, de que
   * cada fatia usa uma cópia.
   */
  trajetos: Map<string, KeyframeEffect>
  /** Com o foco do teclado dentro. */
  focado: boolean
  /** Por cima da cortina, no lugar, com as fatias escondidas: com o foco dentro, ou ainda sem foto. */
  elevado: boolean
  /** O position e o z-index do estilo do original antes de ele subir. */
  estiloAntes: [string, string]
  /** A caixa das fatias do bloco, dentro da camada (veja grupoDo). */
  grupo: HTMLDivElement | null
}

/** Para onde foi puxada uma linha do conteúdo: um segmento horizontal na tela. */
interface Linha {
  esquerda: number
  direita: number
  y: number
  /** Progresso: 0 no lugar, 1 engolida. */
  q: number
}

const SELETOR = 'main [data-reveal], main .enter'

/** O nó é um bloco de conteúdo, ou tem blocos dentro? (Para saber se uma mudança na página pede novas medidas.) */
export function temBlocos(no: Node): boolean {
  return no instanceof Element && (no.matches('[data-reveal], .enter') || no.querySelector('[data-reveal], .enter') !== null)
}

/**
 * Altura das fatias (px CSS), arredondada a pixels inteiros da tela (13 px da tela, 10,4 px CSS,
 * numa tela com 125% de escala). Cada uma é um trapézio: finas, a tira fica lisa mesmo onde ela se
 * curva mais (com 12 px já aparecem quinas na borda); cada uma a mais é uma camada.
 */
const FATIA = 10
/** Largura que uma linha ainda tem ao chegar ao centro do buraco negro (px). */
const FIO = 1
/** A maior razão aceita entre as larguras das bordas de uma fatia (só chega perto disso dentro da sombra). */
const PERSPECTIVA_MAXIMA = 12
/**
 * Quanto tempo (ms) um quadro pode gastar, no máximo, pondo no lugar as fatias que podem aparecer
 * já nos próximos quadros (as outras têm o orçamento que preparar recebe). Um quadro longo demais
 * não adianta: enquanto ele roda, a rolagem anda sem o JavaScript e passa das fatias que ele ainda
 * está preparando.
 */
const ORCAMENTO_URGENTE = 8
/**
 * Uma fatia que deixou de ser precisa continua pronta enquanto está a até MANTER folgas de aparecer:
 * se a rolagem voltar logo, ela já está lá (e a folga pode oscilar sem que as fatias mudem de lugar
 * o tempo todo).
 */
const MANTER = 1.25
/**
 * Onde fica uma fatia escondida (recém-criada, ou de um bloco por cima da cortina): muito acima da
 * camada, fora do recorte dela (nada é desenhado).
 */
const ESCONDIDA = '0 -100000px'
/**
 * Quanto acima do alto da tela a fatia presa à rolagem espera a sua vez (px): fora da tela, mas
 * perto. O navegador a desenha de antemão, sem pressa, e ela entra na faixa pronta. Dentro da tela,
 * mesmo recortada pela camada, ela conta como à vista: cada fatia nova precisava estar desenhada
 * antes de o quadro seguinte da página aparecer, e rolando rápido, com a placa de vídeo ocupada, a
 * página inteira esperava por elas.
 */
const ACIMA = 8
/**
 * O z-index que põe um elemento da página por cima da cortina, das fatias e da tampa (veja
 * index.ts), e ainda abaixo do cabeçalho.
 */
const POR_CIMA = '42'
/**
 * A quantos px de rolagem de aparecer a fatia já recebe cada quadro dos vídeos (veja acordarTelas).
 * As outras recebem o quadro quando chegarem perto: o pintor desenha a tela na hora em que ela
 * acorda, e se a rolagem a trouxer antes disso, ela aparece por um instante com um quadro anterior,
 * nunca vazia.
 */
const PERTO = 12
/** Quantas fotos são feitas ao mesmo tempo (cada uma espera a imagem carregar, e enquanto isso a outra anda). */
const FOTOS_AO_MESMO_TEMPO = 2
/**
 * Quanto a foto nova espera (ms) depois que o mouse muda o bloco: as transições do original (as
 * cores, a seta do link) terminam antes, e a foto sai com o estado final, sem pesar no meio delas.
 */
const ESPERA_DO_MOUSE = 350
/**
 * Quanto tempo (ms) sem rolagem antes de refazer uma foto velha. Refazer custa um documento novo
 * para o navegador montar (vários ms numa tarefa só), e rolando isso aparece como um tranco: a foto
 * velha serve até a página parar. Rolando com o botão do meio, os cartões passam por baixo do
 * cursor, e o vídeo que sai da tela pausa (o ícone do botão muda): sem esta espera, era uma foto
 * nova a cada poucos segundos, no meio da rolagem.
 */
const ESPERA_DA_ROLAGEM = 300
/** Depois de uma foto que falhou, quanto esperar (ms) para tentar de novo. */
const NOVA_TENTATIVA = 3000
/** Quantas fotos do mesmo bloco, para estados diferentes do mouse, ficam guardadas (veja variantes). */
const VARIANTES = 4

const temOcioso = typeof window !== 'undefined' && 'requestIdleCallback' in window

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Posição e tamanho na página, sem a translação da animação de entrada (se ela ainda estiver no meio). */
function medirBloco(elemento: HTMLElement) {
  const caixa = elemento.getBoundingClientRect()
  const transform = getComputedStyle(elemento).transform
  const { e, f } = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : { e: 0, f: 0 }
  return { x: caixa.left + window.scrollX - e, y: caixa.top + window.scrollY - f, largura: caixa.width, altura: caixa.height }
}

/** Um raio de border-radius ("16px", "50%") em px, numa caixa de `base` px. */
function raioEmPx(valor: string, base: number): number {
  const n = Number.parseFloat(valor)
  if (!Number.isFinite(n)) return 0
  return valor.trim().endsWith('%') ? (n / 100) * base : n
}

/**
 * O que corta o vídeo no original, relativo a ele: o próprio vídeo, com o seu border-radius, e os
 * ancestrais até o bloco com overflow (na caixa por dentro da borda, com os raios de dentro). Só o
 * que corta de fato: com cantos arredondados ou menor que o vídeo.
 */
function medirRecortes(video: HTMLVideoElement, bloco: HTMLElement): Recorte[] {
  const r = video.getBoundingClientRect()
  const recortes: Recorte[] = []
  for (let elemento: Element | null = video; elemento; elemento = elemento.parentElement) {
    const estilo = getComputedStyle(elemento)
    if (elemento === video || estilo.overflowX !== 'visible' || estilo.overflowY !== 'visible') {
      const caixa = elemento.getBoundingClientRect()
      const cima = Number.parseFloat(estilo.borderTopWidth) || 0
      const direita = Number.parseFloat(estilo.borderRightWidth) || 0
      const baixo = Number.parseFloat(estilo.borderBottomWidth) || 0
      const esquerda = Number.parseFloat(estilo.borderLeftWidth) || 0
      const recorte: Recorte = {
        x: caixa.left + esquerda - r.left,
        y: caixa.top + cima - r.top,
        largura: caixa.width - esquerda - direita,
        altura: caixa.height - cima - baixo,
        raios: (
          [
            [estilo.borderTopLeftRadius, esquerda, cima],
            [estilo.borderTopRightRadius, direita, cima],
            [estilo.borderBottomRightRadius, direita, baixo],
            [estilo.borderBottomLeftRadius, esquerda, baixo],
          ] as const
        ).map(([valor, bordaX, bordaY]): [number, number] => {
          const [h = '0', v = h] = valor.split(' ')
          return [Math.max(0, raioEmPx(h, caixa.width) - bordaX), Math.max(0, raioEmPx(v, caixa.height) - bordaY)]
        }),
      }
      const arredondado = recorte.raios.some(([h, v]) => h > 0 && v > 0)
      const menor =
        recorte.x > 0.5 || recorte.y > 0.5 || recorte.x + recorte.largura < r.width - 0.5 || recorte.y + recorte.altura < r.height - 0.5
      if (arredondado || menor) recortes.push(recorte)
    }
    if (elemento === bloco) break
  }
  return recortes
}

/** Em que camada da pintura fica o elemento entre os irmãos: null no fluxo, senão o z-index (auto conta como 0). */
function camadaDe(estilo: CSSStyleDeclaration): number | null {
  if (estilo.position === 'static') return null
  return estilo.zIndex === 'auto' ? 0 : Number(estilo.zIndex) || 0
}

/**
 * O que o original pinta na frente dos vídeos e os cobre: os irmãos que vêm depois de cada vídeo (e
 * dos ancestrais dele dentro do bloco) e ficam numa camada igual ou acima da dele.
 */
function medirFrente(elemento: HTMLElement, videos: Video[]): Frente | null {
  if (!videos.length) return null
  const posicoes = new Map(elementosDe(elemento).map((filho, i): [Element, number] => [filho, i]))
  const caixa = elemento.getBoundingClientRect()
  const indices = new Set<number>()
  const nos: Element[] = []
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const video of videos) {
    const r = video.elemento.getBoundingClientRect()
    for (let no: Element = video.elemento; no !== elemento && no.parentElement; no = no.parentElement) {
      const camada = camadaDe(getComputedStyle(no))
      for (let irmao = no.nextElementSibling; irmao; irmao = irmao.nextElementSibling) {
        const estilo = getComputedStyle(irmao)
        const sua = camadaDe(estilo)
        const naFrente = sua === null ? camada === null : camada === null || sua >= camada
        const i = posicoes.get(irmao)
        if (!naFrente || i === undefined || estilo.display === 'none') continue
        const q = irmao.getBoundingClientRect()
        if (q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom) continue
        if (!indices.has(i)) nos.push(irmao)
        indices.add(i)
        x0 = Math.min(x0, q.left - caixa.left)
        y0 = Math.min(y0, q.top - caixa.top)
        x1 = Math.max(x1, q.right - caixa.left)
        y1 = Math.max(y1, q.bottom - caixa.top)
      }
    }
  }
  return indices.size ? { elementos: [...indices], nos, x0, y0, x1, y1 } : null
}

/**
 * O anel do progresso do vídeo (veja Anel), relativo a ele: o do lado do vídeo (veja ANEL), medido
 * pelo trilho, o círculo de SVG dentro dele. Ou null, se não houver.
 */
function medirAnel(video: HTMLVideoElement, r: DOMRect): Anel | null {
  const trilho = video.parentElement?.querySelector(`${ANEL} circle`)
  const svg = trilho instanceof SVGCircleElement ? trilho.ownerSVGElement : null
  if (!(trilho instanceof SVGCircleElement) || !svg) return null
  // do viewBox do SVG para px CSS
  const caixa = svg.getBoundingClientRect()
  const vista = svg.viewBox.baseVal
  const k = vista?.width ? caixa.width / vista.width : 1
  const estilo = getComputedStyle(trilho)
  return {
    x: caixa.left + (trilho.cx.baseVal.value - (vista?.x ?? 0)) * k - r.left,
    y: caixa.top + (trilho.cy.baseVal.value - (vista?.y ?? 0)) * k - r.top,
    raio: trilho.r.baseVal.value * k,
    espessura: (Number.parseFloat(estilo.strokeWidth) || 1) * k,
    cor: estilo.stroke,
    trilho: Number.parseFloat(estilo.opacity) || 0,
  }
}

/** Numera os vídeos para o pintor (veja telas.ts). */
let proximoVideo = 0

function medirVideos(elemento: HTMLElement): Video[] {
  const caixa = elemento.getBoundingClientRect()
  return [...elemento.querySelectorAll('video')].map((video) => {
    const r = video.getBoundingClientRect()
    return {
      id: proximoVideo++,
      elemento: video,
      x: r.left - caixa.left,
      y: r.top - caixa.top,
      largura: r.width,
      altura: r.height,
      recortes: medirRecortes(video, elemento),
      anel: medirAnel(video, r),
      escala: Math.min(window.devicePixelRatio || 1, 2),
      apresentado: false,
      frentes: 0,
    }
  })
}

const infinita = (animacao: Animation) => animacao.effect?.getComputedTiming().iterations === Infinity

/** Os elementos do bloco que se animam sem parar (veja Vivo). */
function medirVivos(elemento: HTMLElement): Vivo[] {
  const alvos = new Set<Element>()
  for (const animacao of elemento.getAnimations({ subtree: true })) {
    const efeito = animacao.effect
    if (infinita(animacao) && efeito instanceof KeyframeEffect && efeito.target) alvos.add(efeito.target)
  }
  if (!alvos.size) return []
  const posicoes = new Map(elementosDe(elemento).map((filho, i): [Element, number] => [filho, i]))
  const caixa = elemento.getBoundingClientRect()
  return [...alvos].flatMap((alvo): Vivo[] => {
    const indice = posicoes.get(alvo)
    if (indice === undefined || indice === 0 || !(alvo instanceof HTMLElement)) return []
    const r = alvo.getBoundingClientRect()
    return [{ elemento: alvo, indice, x: r.left - caixa.left, y: r.top - caixa.top, largura: r.width, altura: r.height }]
  })
}

/** As animações sem fim da cópia andam no mesmo passo das do original. */
function sincronizar(original: Element, copia: Element) {
  const deles = original.getAnimations({ subtree: true }).filter(infinita)
  copia
    .getAnimations({ subtree: true })
    .filter(infinita)
    .forEach((animacao, i) => {
      const par = deles[i]
      if (!par || par.startTime === null) return
      animacao.playbackRate = par.playbackRate
      animacao.startTime = par.startTime
    })
}

/**
 * Uma chave para o estado do mouse sobre o bloco: o caminho, de filho em filho, da raiz até o
 * elemento mais fundo com o mouse em cima ('' sem o mouse).
 */
function chaveDoMouse(raiz: Element, fundo: Element | null): string {
  if (!fundo) return ''
  const caminho: number[] = []
  for (let no: Element | null = fundo; no && no !== raiz; no = no.parentElement) {
    const pai: Element | null = no.parentElement
    if (!pai) break
    caminho.push(Array.prototype.indexOf.call(pai.children, no))
  }
  return `/${caminho.reverse().join('/')}`
}

/** Uma borda solta da página: o lado de um elemento que não é bloco nem está dentro de um. */
interface Borda {
  fonte: HTMLElement
  lado: 'top' | 'bottom'
  espessura: number
}

/**
 * As bordas de cima e de baixo dos elementos de `raiz` que ficam fora dos blocos (a linha no alto
 * de cada seção e de cada lista). Sem elas, a cortina cortaria essas linhas na beira da faixa.
 */
function medirBordas(raiz: Element, blocos: Set<Element>): Borda[] {
  const bordas: Borda[] = []
  const visitar = (pai: Element) => {
    for (const filho of pai.children) {
      if (!(filho instanceof HTMLElement) || blocos.has(filho)) continue
      const estilo = getComputedStyle(filho)
      // os títulos fixos ficam por cima da cortina (veja medir), com tudo o que têm dentro
      if (estilo.display === 'none' || estilo.position === 'sticky' || estilo.position === 'fixed') continue
      for (const lado of ['top', 'bottom'] as const) {
        const espessura = Number.parseFloat(estilo.getPropertyValue(`border-${lado}-width`)) || 0
        const tipo = estilo.getPropertyValue(`border-${lado}-style`)
        const cor = estilo.getPropertyValue(`border-${lado}-color`)
        const transparente = cor === 'transparent' || /rgba?\([^)]*[,/]\s*0\)$/.test(cor)
        if (espessura > 0 && tipo !== 'none' && tipo !== 'hidden' && !transparente) bordas.push({ fonte: filho, lado, espessura })
      }
      visitar(filho)
    }
  }
  visitar(raiz)
  return bordas
}

/**
 * O modelo de uma borda solta: uma cópia rasa do elemento (com as mesmas classes, a cor acompanha o
 * tema) reduzida só àquela borda.
 */
function modeloDaBorda({ fonte, lado, espessura }: Borda, largura: number): HTMLElement {
  const modelo = fonte.cloneNode(false) as HTMLElement
  for (const { name } of [...modelo.attributes]) if (name !== 'class') modelo.removeAttribute(name)
  const tipo = getComputedStyle(fonte).getPropertyValue(`border-${lado}-style`)
  modelo.style.cssText =
    `display:block;box-sizing:border-box;width:${largura}px;max-width:none;min-width:0;height:${espessura}px;margin:0;padding:0;` +
    `background:none;box-shadow:none;outline:none;border-style:none;border-${lado}-style:${tipo};border-${lado}-width:${espessura}px`
  return modelo
}

/**
 * A transformação que leva a fatia (`largura` x `altura` px, com o canto de cima à esquerda na
 * origem da camada) ao trapézio entre as linhas `cima` e `baixo`. As duas bordas são horizontais:
 * ao longo delas a projeção não distorce, e a borda que duas fatias dividem fica igual nas duas.
 */
function trapezio(largura: number, altura: number, cima: Linha, baixo: Linha): string {
  let l0 = cima.esquerda
  let r0 = cima.direita
  let l1 = baixo.esquerda
  let r1 = baixo.direita
  // uma borda muito mais larga que a outra só bem perto do centro, dentro da sombra: limita, para a conta não degenerar
  if (r0 - l0 > (r1 - l1) * PERSPECTIVA_MAXIMA) {
    const meio = (l1 + r1) / 2
    const meia = (r0 - l0) / PERSPECTIVA_MAXIMA / 2
    l1 = meio - meia
    r1 = meio + meia
  } else if (r1 - l1 > (r0 - l0) * PERSPECTIVA_MAXIMA) {
    const meio = (l0 + r0) / 2
    const meia = (r1 - l1) / PERSPECTIVA_MAXIMA / 2
    l0 = meio - meia
    r0 = meio + meia
  }
  // (u, v) em px da fatia → ((w0·u/largura + m1·v/altura + l0) / d, (m4·v/altura + y0) / d), com
  // d = 1 + h·v/altura: a projeção do retângulo no trapézio, escrita em colunas para a matrix3d.
  const w0 = r0 - l0
  const h = w0 / (r1 - l1) - 1
  const m1 = (1 + h) * l1 - l0
  const m4 = (1 + h) * baixo.y - cima.y
  return `matrix3d(${w0 / largura},0,0,0,${m1 / altura},${m4 / altura},0,${h / altura},0,0,1,0,${l0},${cima.y},0,1)`
}

export function criarAbsorcao(relogio: Relogio): Absorcao {
  let blocos: Bloco[] = []
  let cena: Cena | null = null
  let camada: HTMLDivElement | null = null
  /** Faltou tempo, no último quadro, para pôr no lugar todas as fatias da folga. */
  let incompleto = false
  /** As fatias que mudaram de lugar e esperam a animação nova (veja animarPendentes). */
  const porAnimar: [Bloco, Tira][] = []
  /** Até quando o quadro pode pôr no lugar as fatias urgentes (veja ORCAMENTO_URGENTE). */
  let limiteUrgente = 0
  /** A rolagem do último preparar. */
  let rolagemAtual = 0
  /** A folga e a faixa de aquecer do último preparar (para a ordem das fotos). */
  let folgaAtual: Folga = [0, 0]
  let aquecerAtual: Folga = [0, 0]
  /** Quando a rolagem mudou pela última vez (ms): as fotos velhas esperam ela parar. */
  let rolouEm = Number.NEGATIVE_INFINITY
  let dpr = window.devicePixelRatio || 1
  /** A altura das fatias em pixels da tela (inteira) e em px CSS: FATIA arredondada a pixels inteiros da tela. */
  let pixelsDaFatia = Math.max(1, Math.round(FATIA * dpr))
  let passo = pixelsDaFatia / dpr
  /** Os títulos fixos das seções, postos por cima da cortina: elemento → z-index que tinham no estilo. */
  const fixos = new Map<HTMLElement, string>()
  /** Um número para cada elemento com bordas soltas (chave das linhas, veja medir). */
  const numeros = new WeakMap<Element, number>()
  let proximoNumero = 0
  /** As linhas soltas medidas, pela chave (número do elemento e lado). */
  let linhas = new Map<string, Bloco>()
  /** Quantas fotos estão sendo feitas, e a vez marcada para começar outras. */
  let fotografando = 0
  let vezDasFotos = 0
  let esperaDasFotos = 0
  /** A vez das fotos que não podem esperar, logo depois do quadro (veja agendarFotos). */
  let vezUrgente = 0
  /** Sobe a cada limpar: as fotos que estavam sendo feitas antes dele não valem mais. */
  let geracao = 0
  /** A classe da raiz da página (o tema) com que as fotos foram feitas. */
  let tema = document.documentElement.className
  let esperaDoMouse = 0
  /** O pintor dos vídeos da tira (veja obterPintor), e se já se viu que não há como ligá-lo. */
  let pintor: Pintor | null = null
  let semPintor = false

  const quantasFatias = (bloco: Bloco) => Math.max(1, Math.ceil(Math.round(bloco.alturaDaGrade * dpr) / pixelsDaFatia))
  /** O trecho da grade do bloco (px CSS a partir do alto dela) que a fatia mostra. */
  const trechoDaFatia = (bloco: Bloco, fatia: number): [number, number] => [
    (fatia * pixelsDaFatia) / dpr,
    Math.min(((fatia + 1) * pixelsDaFatia) / dpr, bloco.alturaDaGrade),
  ]
  // as bordas entre fatias ficam em pixels inteiros da tela: sem a suavização das bordas, não aparecem as emendas
  const alinhar = (v: number) => Math.round(v * dpr) / dpr

  /** A grade das fatias do bloco, que é também o enquadramento da foto (veja enquadrar). */
  function atualizarGrade(bloco: Bloco) {
    const quadro = enquadrar(bloco.x, bloco.y, bloco.largura, bloco.altura, dpr)
    bloco.esquerda = quadro.esquerda
    bloco.topo = quadro.topo
    bloco.larguraDaGrade = quadro.largura
    bloco.alturaDaGrade = quadro.altura
    bloco.fase = quadro.fase
  }

  // O React redesenhou algo dentro de um bloco (o ícone de um vídeo que pausou, um texto que trocou
  // de idioma): a foto dele é refeita. Os estilos que este efeito põe no original (atributo style) e
  // a entrada dos blocos (data-revealed) não contam.
  const vigiaConteudo = new MutationObserver((registros) => {
    for (const { target } of registros) {
      const bloco = blocos.find((outro) => !outro.linha && outro.elemento.contains(target))
      if (!bloco) continue
      envelhecer(bloco, { soFrente: bloco.frente?.nos.some((no) => no.contains(target)) ?? false })
    }
  })

  // O tema mudou (a classe da raiz): todas as fotos são refeitas, as mais perto da faixa primeiro.
  const vigiaTema = new MutationObserver(() => {
    const novo = document.documentElement.className
    if (novo === tema) return
    tema = novo
    for (const bloco of blocos) if (!bloco.linha) envelhecer(bloco, {})
  })

  /**
   * O mouse entrou ou saiu de um elemento: os blocos em que os elementos com o mouse em cima
   * mudaram trocam de foto, na hora, se já há uma para esse estado (veja variantes), ou ganham foto
   * nova (com as regras de :hover valendo para eles, veja fotos.ts), depois que as transições do
   * original acabarem.
   */
  const aoMexerMouse = () => {
    if (!esperaDoMouse) esperaDoMouse = requestAnimationFrame(verMouse)
  }

  function verMouse() {
    esperaDoMouse = 0
    // os elementos com o mouse em cima, do mais de fora ao mais fundo: uma linha de ancestrais
    const emCima = [...document.querySelectorAll(':hover')]
    const agora = performance.now()
    for (const bloco of blocos) {
      if (bloco.linha) continue
      const fundo = emCima.includes(bloco.elemento) ? (emCima.findLast((elemento) => bloco.elemento.contains(elemento)) ?? null) : null
      if (fundo === bloco.mouse) continue
      bloco.mouse = fundo
      bloco.mexido = agora
      if (!trocarPelaVariante(bloco)) envelhecer(bloco, { soMouse: true })
    }
  }

  /**
   * A camada das fatias: fixa no alto da tela, entre a cortina e a tampa (veja index.ts), abaixo
   * do cabeçalho. Fixa como a cortina: as fatias andam pela rolagem com as animações, e não com a
   * página. Ela mostra só a faixa e recorta o resto: o que passa da beira fica por conta do
   * original. Nada nela muda a opacidade (nem para escondê-la no topo da página, veja trajeto):
   * com uma animação de opacidade, o navegador desenhava todas as fatias à parte, a cada quadro,
   * antes de pô-las na tela.
   */
  function obterCamada(): HTMLDivElement {
    if (!camada) {
      camada = document.createElement('div')
      camada.className = 'print-hidden'
      camada.setAttribute('aria-hidden', 'true')
      camada.setAttribute('data-copias-buraco-negro', '')
      camada.inert = true
      camada.style.cssText =
        'position:fixed;left:0;top:0;width:100%;overflow:hidden;z-index:40;pointer-events:none;user-select:none;contain:layout style'
      if (cena) camada.style.height = `${cena.faixa.inicio}px`
      document.body.append(camada)
      const principal = document.querySelector('main')
      if (principal) {
        vigiaConteudo.observe(principal, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['class', 'src', 'srcset', 'hidden', 'd', 'aria-pressed', 'aria-expanded'],
        })
      }
      tema = document.documentElement.className
      vigiaTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      document.addEventListener('pointerover', aoMexerMouse, { passive: true })
      document.addEventListener('pointerout', aoMexerMouse, { passive: true })
    }
    return camada
  }

  /**
   * Onde o bloco mira: o buraco negro anda com a rolagem (veja alvoEm), e o bloco vai até onde ele
   * está quando o meio do bloco passa pelo meio da faixa. Todas as fatias do bloco miram o mesmo
   * ponto: as bordas que elas dividem coincidem, e as que cruzam a faixa com a força inteira dividem
   * os mesmos quadros-chave. No começo e no fim da passagem de um bloco alto o buraco negro já está
   * um pouco ao lado desse ponto, mas a tira chega a ele por dentro da sombra, onde a tampa a apaga.
   */
  function alvoDoBloco(bloco: Bloco): Alvo {
    const { faixa } = cena!
    return alvoEm(cena!, bloco.topo + bloco.alturaDaGrade / 2 - (faixa.frente + faixa.inicio) / 2)
  }

  /** Para onde vai a linha da grade do bloco que estaria na altura `y` da tela, com a força `forca`, rumo a `alvo`. */
  function linhaEm(bloco: Bloco, y: number, forca: number, alvo: Alvo): Linha {
    const { faixa } = cena!
    const banda = Math.max(1, faixa.inicio - faixa.frente)
    // A linha que chega ao fim da faixa desce até a altura do buraco negro. As de baixo descem
    // menos, na proporção do progresso, e nenhuma passa da que vem antes dela.
    const queda = alvo.y - faixa.frente
    const q = forca * clamp01((faixa.inicio - y) / banda)
    const k = q ** ACELERACAO
    const centro = bloco.esquerda + bloco.larguraDaGrade / 2
    const meio = centro + k * (alvo.x - centro)
    const meia = Math.max(FIO, bloco.larguraDaGrade * (1 - k)) / 2
    return { esquerda: meio - meia, direita: meio + meia, y: alinhar(y + q * q * queda), q }
  }

  /**
   * Por onde a fatia passa, em pixels inteiros da tela de rolagem: da rolagem n0 / dpr, a última
   * em que ela ainda está inteira abaixo da faixa (e espera a vez fora da tela), à n1 / dpr, em
   * que ela foi engolida de vez (no começo da página, não antes de a força chegar a 1). Contas em
   * inteiros: cada fatia sai exatamente pixelsDaFatia pixels depois da de cima.
   */
  function grade(bloco: Bloco, fatia: number): [number, number] {
    const { faixa, plena } = cena!
    const [, ate] = trechoDaFatia(bloco, fatia)
    const topo = Math.round(bloco.topo * dpr)
    const n0 = Math.max(0, topo + fatia * pixelsDaFatia - Math.round(faixa.inicio * dpr))
    const fim = topo + Math.round(ate * dpr) - Math.round(faixa.frente * dpr)
    return [n0, Math.max(n0 + 1, fim, Math.ceil(plena * dpr - 1e-6))]
  }

  /**
   * O trecho da rolagem em que vale a animação da fatia. Cada quadro-chave vale de meio pixel da
   * tela antes a meio pixel depois da sua rolagem: com a página parada entre dois pixels (o
   * navegador desenha a página no pixel mais próximo), a fatia fica no mesmo pixel que o original.
   */
  function trecho(bloco: Bloco, fatia: number): [number, number] {
    const [n0, n1] = grade(bloco, fatia)
    return [(n0 - 0.5) / dpr, (n1 - 0.5) / dpr]
  }

  /**
   * Os quadros-chave da fatia: a transformação dela em cada pixel da tela de rolagem da sua
   * passagem pela faixa, sem nada entre um e outro (cada um vale até o próximo). Calculados uma
   * vez, quando a fatia é posta no lugar; dali em diante, a rolagem só escolhe qual vale.
   *
   * Nada entre um e outro de propósito: o navegador interpolaria a perspectiva do trapézio, e perto
   * do buraco negro, onde a fatia fica muito mais estreita em cima que embaixo, a conta degenera e
   * a fatia salta para longe entre um pixel e outro. Com um quadro-chave por pixel, cada posição
   * da página mostra exatamente o desenho calculado para ela, e as bordas de fatias vizinhas
   * coincidem sempre.
   *
   * Com a força já inteira em todo o caminho, as fatias de um bloco fazem o mesmo trajeto, uma
   * depois da outra (cada uma uma fatia de rolagem depois da de cima, já que a fatia tem um número
   * inteiro de pixels da tela): um só modelo serve a todas as fatias da mesma altura.
   */
  function trajeto(bloco: Bloco, fatia: number): KeyframeEffect {
    const [de, ate] = trechoDaFatia(bloco, fatia)
    const altura = ate - de
    const [n0, n1] = grade(bloco, fatia)
    const comum = n0 > 0 && n0 / dpr >= cena!.plena
    const ultima = fatia === quantasFatias(bloco) - 1
    const chave = comum ? (ultima ? 'ultima' : 'comum') : `fatia ${fatia}`
    const pronto = bloco.trajetos.get(chave)
    if (pronto) return pronto

    const passos = n1 - n0
    const quadros: Keyframe[] = []
    const alvo = alvoDoBloco(bloco)
    // esperando a vez, logo acima da tela (veja ACIMA)
    const direita = bloco.esquerda + bloco.larguraDaGrade
    const espera = trapezio(
      bloco.larguraDaGrade,
      altura,
      { esquerda: bloco.esquerda, direita, y: -altura - ACIMA, q: 0 },
      { esquerda: bloco.esquerda, direita, y: -ACIMA, q: 0 },
    )
    for (let i = 0; i <= passos; i++) {
      // No primeiro quadro-chave a fatia ainda está inteira abaixo da faixa, e no topo da página a
      // absorção ainda não aparece: ela começa no segundo pixel da tela de rolagem, junto com a
      // cortina e a tampa (veja aparecerAoRolar).
      if (i === 0 || n0 + i < 2) {
        quadros.push({ offset: i / passos, easing: 'step-end', transform: espera })
        continue
      }
      const rolagem = (n0 + i) / dpr
      const forca = comum ? 1 : cena!.forca(rolagem)
      const y = bloco.topo + de - rolagem
      const cima = linhaEm(bloco, y, forca, alvo)
      const baixo = linhaEm(bloco, y + altura, forca, alvo)
      // as duas bordas na mesma linha não formam um trapézio (e a matriz não teria inversa)
      if (baixo.y - cima.y < 0.01) baixo.y = cima.y + 0.01
      quadros.push({ offset: i / passos, easing: 'step-end', transform: trapezio(bloco.larguraDaGrade, altura, cima, baixo) })
    }
    const modelo = new KeyframeEffect(null, quadros, { fill: 'both' })
    bloco.trajetos.set(chave, modelo)
    return modelo
  }

  /** O trecho do vídeo (relativo a ele) que cai entre as linhas `de` e `ate` da grade do bloco, ou null. */
  function trechoDoVideo(bloco: Bloco, video: Video, de: number, ate: number): [number, number] | null {
    const topo = video.y + bloco.y - bloco.topo
    const cima = Math.max(de, topo) - topo
    const baixo = Math.min(ate, topo + video.altura) - topo
    return baixo > cima ? [cima, baixo] : null
  }

  /** O pintor dos vídeos (veja telas.ts), ligado na primeira vez que uma fatia cruza um vídeo; null onde não há como. */
  function obterPintor(): Pintor | null {
    if (!pintor && !semPintor) {
      pintor = criarPintor()
      semPintor = pintor === null
    }
    return pintor
  }

  /** Apresenta o vídeo ao pintor, com o que fica na frente dele, na primeira vez que uma fatia o mostra. */
  function apresentar(bloco: Bloco, video: Video) {
    if (video.apresentado || !pintor) return
    video.apresentado = true
    pintor.video(video.id, video.elemento, video)
    mandarFrente(bloco, video)
  }

  /**
   * Manda ao pintor o que fica na frente do vídeo (veja Frente): a foto da frente, recortada na área
   * do vídeo, e o retângulo que ela cobre nele.
   */
  function mandarFrente(bloco: Bloco, video: Video) {
    const p = pintor
    if (!p || !video.apresentado) return
    const vez = ++video.frentes
    const { fotoDaFrente, frente } = bloco
    const x0 = frente ? Math.max(0, frente.x0 - video.x) : 0
    const x1 = frente ? Math.min(video.largura, frente.x1 - video.x) : 0
    const y0 = frente ? Math.max(0, frente.y0 - video.y) : 0
    const y1 = frente ? Math.min(video.altura, frente.y1 - video.y) : 0
    if (!fotoDaFrente || x1 <= x0 || y1 <= y0) {
      p.frente(video.id, null)
      return
    }
    // a área do vídeo na foto da frente (que cobre a grade do bloco, em pixels da tela), em pixels inteiros
    const gx = (video.x + bloco.x - bloco.esquerda) * dpr
    const gy = (video.y + bloco.y - bloco.topo) * dpr
    const sx = Math.floor(gx)
    const sy = Math.floor(gy)
    const sw = Math.max(1, Math.ceil(gx + video.largura * dpr) - sx)
    const sh = Math.max(1, Math.ceil(gy + video.altura * dpr) - sy)
    const escala = dpr
    createImageBitmap(fotoDaFrente, sx, sy, sw, sh).then(
      (imagem) => {
        if (vez !== video.frentes || pintor !== p) {
          imagem.close()
          return
        }
        p.frente(video.id, { imagem, dpr: escala, x: gx - sx, y: gy - sy, x0, y0, x1, y1 })
      },
      () => {},
    )
  }

  /**
   * Põe na fatia (de `de` a `ate` na grade) a tela do vídeo `i`, sobre a parte dele que cai nela,
   * ou a devolve à reserva, se a fatia não cruza o vídeo. Quem desenha na tela é o pintor.
   */
  function porTela(bloco: Bloco, tira: Tira, i: number, de: number, ate: number) {
    const video = bloco.videos[i]
    const trecho = video ? trechoDoVideo(bloco, video, de, ate) : null
    const atual = tira.telas[i] ?? null
    const p = video && trecho ? obterPintor() : null
    if (!video || !trecho || !p) {
      if (atual) pintor?.devolver(atual)
      tira.telas[i] = null
      return
    }
    apresentar(bloco, video)
    const tela = atual ?? p.pegar()
    if (!atual) {
      tira.telas[i] = tela
      tira.caixa.append(tela.canvas)
    }
    const [cima, baixo] = trecho
    const { style } = tela.canvas
    style.left = `${video.x + bloco.x - bloco.esquerda}px`
    style.top = `${video.y + bloco.y - bloco.topo + cima - de}px`
    style.width = `${video.largura}px`
    style.height = `${baixo - cima}px`
    const largura = Math.max(1, Math.round(video.largura * video.escala))
    const altura = Math.max(1, Math.round((baixo - cima) * video.escala))
    p.mostrar(tela, video.id, largura, altura, cima, baixo)
  }

  /** As telas da fatia voltam para a reserva do pintor. */
  function devolverTelas(tira: Tira) {
    tira.telas.forEach((tela, i) => {
      if (tela) pintor?.devolver(tela)
      tira.telas[i] = null
    })
  }

  /**
   * Uma fatia do bloco, ainda sem lugar: um retângulo com a foto de fundo (que vem do grupo do
   * bloco, veja grupoDo), ou, numa linha solta, com o modelo dela dentro. As telas dos vídeos ficam
   * por cima. Nada recorta nada dentro da caixa deformada: um recorte ali obrigaria a placa de vídeo
   * a desenhar à parte, a cada quadro, tudo o que tem camada própria dentro dele (as telas), e com
   * dezenas de fatias a página travava. Pelo mesmo motivo a caixa não tem overflow nem contain:
   * paint, e as telas não têm o overflow: clip que o navegador põe em todo canvas.
   */
  function criarTira(bloco: Bloco): Tira {
    const caixa = document.createElement('div')
    // Nasce escondida (veja ESCONDIDA). Com o will-change, o navegador desenha a fatia uma vez, no
    // tamanho dela, e só a encolhe a caminho do buraco negro: sem ele, ele a redesenhava a cada
    // mudança de escala, várias vezes por fatia, e rolando rápido a página esperava por isso.
    caixa.style.cssText = `position:absolute;left:0;top:0;contain:size layout style;transform-origin:0 0;will-change:transform;translate:${ESCONDIDA}`
    if (bloco.linha) {
      const modelo = bloco.elemento.cloneNode(true) as HTMLElement
      modelo.style.position = 'absolute'
      caixa.append(modelo)
    } else {
      caixa.style.backgroundImage = 'var(--foto)'
      caixa.style.backgroundRepeat = 'no-repeat'
    }
    grupoDo(bloco).append(caixa)
    return { caixa, telas: bloco.videos.map(() => null), copias: bloco.vivos.map(() => null), fatia: -1, animacao: null, modelo: null }
  }

  /** Põe a fatia no lugar: o pedaço da foto que ela mostra e as telas dos vídeos sobre a parte que cai nela. */
  function mostrarFatia(bloco: Bloco, tira: Tira, fatia: number) {
    tira.fatia = fatia
    const [de, ate] = trechoDaFatia(bloco, fatia)
    const { style } = tira.caixa
    style.width = `${bloco.larguraDaGrade}px`
    style.height = `${ate - de}px`
    style.translate = bloco.elevado ? ESCONDIDA : ''
    if (bloco.linha) {
      const modelo = tira.caixa.firstElementChild as HTMLElement | null
      if (modelo) {
        modelo.style.left = `${bloco.x - bloco.esquerda}px`
        modelo.style.top = `${bloco.y - bloco.topo - de}px`
      }
    } else {
      // a foto cobre a grade inteira, pixel a pixel (veja fotos.ts)
      style.backgroundSize = `${bloco.larguraDaGrade}px ${bloco.alturaDaGrade}px`
      style.backgroundPosition = `0 ${-de}px`
    }
    bloco.videos.forEach((_, i) => porTela(bloco, tira, i, de, ate))
    bloco.vivos.forEach((_, i) => porCopia(bloco, tira, i, de, ate))
  }

  /**
   * Põe na fatia (de `de` a `ate` na grade) a cópia viva do elemento `i` (veja Vivo), se o meio
   * dele cai nela, ou a tira. Uma fatia só leva a cópia: o que passa dela sai junto, com a forma
   * dessa fatia (perto do buraco negro, um pouco torto, mas inteiro).
   */
  function porCopia(bloco: Bloco, tira: Tira, i: number, de: number, ate: number) {
    const vivo = bloco.vivos[i]
    if (!vivo) return
    const gx = vivo.x + bloco.x - bloco.esquerda
    const gy = vivo.y + bloco.y - bloco.topo
    const meio = gy + vivo.altura / 2
    let copia = tira.copias[i] ?? null
    if (meio < de || meio >= ate) {
      copia?.remove()
      tira.copias[i] = null
      return
    }
    if (!copia) {
      copia = vivo.elemento.cloneNode(true) as HTMLElement
      copia.removeAttribute('id')
      for (const filho of copia.querySelectorAll('[id]')) filho.removeAttribute('id')
      tira.caixa.append(copia)
      tira.copias[i] = copia
    }
    Object.assign(copia.style, {
      position: 'absolute',
      left: `${gx}px`,
      top: `${gy - de}px`,
      width: `${vivo.largura}px`,
      height: `${vivo.altura}px`,
      margin: '0',
      boxSizing: 'border-box',
    })
    sincronizar(vivo.elemento, copia)
  }

  /** Marca a fatia para ser presa à rolagem, no trajeto do seu lugar (veja animarPendentes). */
  function animar(bloco: Bloco, tira: Tira) {
    porAnimar.push([bloco, tira])
  }

  /**
   * Prende à rolagem as fatias marcadas, todas juntas, depois de todas as mudanças na página: para
   * pôr uma animação no trecho certo da rolagem, o navegador precisa do layout em dia, e cada
   * animação criada entre uma mudança e outra o obrigava a refazê-lo na hora. A fatia que passa a
   * outro lugar do mesmo bloco, com o mesmo modelo, só muda o trecho da animação que já tinha (bem
   * mais barato que criar outra).
   */
  function animarPendentes() {
    for (const [bloco, tira] of porAnimar) {
      if (tira.fatia < 0) continue
      const modelo = trajeto(bloco, tira.fatia)
      const [de, ate] = trecho(bloco, tira.fatia)
      if (tira.animacao && tira.modelo === modelo) {
        relogio.mover(tira.animacao, de, ate)
        continue
      }
      if (tira.animacao) relogio.soltar(tira.animacao)
      const efeito = new KeyframeEffect(modelo)
      efeito.target = tira.caixa
      tira.animacao = relogio.animar(efeito, de, ate)
      tira.modelo = modelo
    }
    porAnimar.length = 0
  }

  /**
   * A fatia que a rolagem não pode trazer logo sai da página, com a animação. Guardá-la escondida
   * para reaproveitar não compensava: criar uma é barato (um retângulo), e cada fatia parada na
   * página pesava em todo quadro em que o navegador repinta algo (ele passa por todas as camadas).
   */
  function descartar(bloco: Bloco, tira: Tira) {
    if (tira.animacao) relogio.soltar(tira.animacao)
    tira.animacao = null
    tira.modelo = null
    tira.fatia = -1
    devolverTelas(tira)
    tira.caixa.remove()
    const i = bloco.tiras.indexOf(tira)
    if (i >= 0) bloco.tiras.splice(i, 1)
  }

  /** Quão longe (px de rolagem) a fatia está de aparecer, com a página em `rolagem` (0: pode estar à vista). */
  function distancia(bloco: Bloco, fatia: number, rolagem: number): number {
    const [de, ate] = trecho(bloco, fatia)
    return de > rolagem ? de - rolagem : ate < rolagem ? rolagem - ate : 0
  }

  /** Quão longe (px de rolagem) alguma fatia do bloco está de aparecer (0: pode estar à vista). */
  function distanciaDoBloco(bloco: Bloco, rolagem: number): number {
    const comeco = trecho(bloco, 0)[0]
    const fim = trecho(bloco, quantasFatias(bloco) - 1)[1]
    return comeco > rolagem ? comeco - rolagem : fim < rolagem ? rolagem - fim : 0
  }

  /**
   * A fatia pode aparecer com a página rolada entre `rolagem - folga[0]·fator` (o que já foi
   * engolido, se a rolagem voltar) e `rolagem + folga[1]·fator` (o que vem pela frente)?
   */
  function alcancavel(bloco: Bloco, fatia: number, rolagem: number, folga: Folga, fator = 1): boolean {
    const [de, ate] = trecho(bloco, fatia)
    return ate >= rolagem - folga[0] * fator && de <= rolagem + folga[1] * fator
  }

  /** As fatias que a página pode levar à faixa dentro da folga, das mais próximas de aparecer às mais distantes. */
  function fatiasDaFolga(bloco: Bloco, rolagem: number, folga: Folga): [number, number][] {
    const { faixa, plena } = cena!
    const ultima = quantasFatias(bloco) - 1
    // um intervalo que certamente contém todas, conferido uma a uma em seguida
    const primeira =
      rolagem - folga[0] <= plena + 1 ? 0 : Math.max(0, Math.floor((rolagem - folga[0] + faixa.frente - bloco.topo) / passo) - 2)
    const derradeira = Math.min(ultima, Math.floor((rolagem + folga[1] + faixa.inicio - bloco.topo) / passo) + 2)
    const lista: [number, number][] = []
    for (let fatia = primeira; fatia <= derradeira; fatia++) {
      if (alcancavel(bloco, fatia, rolagem, folga)) lista.push([fatia, distancia(bloco, fatia, rolagem)])
    }
    return lista.sort((a, b) => a[1] - b[1])
  }

  /**
   * Põe as fatias do bloco nos lugares (`fatias`, com a distância de cada um): as que já mostram um
   * deles continuam nele; as outras passam aos que faltam, das mais longe para as mais perto; e só
   * então se criam fatias novas. Lugares a até `urgencia` px de aparecer ganham fatia na hora; os
   * outros, só enquanto houver tempo no quadro (até `limite`). Devolve quantas fatias foram criadas.
   */
  function distribuir(bloco: Bloco, fatias: [number, number][], rolagem: number, folga: Folga, urgencia: number, limite: number): number {
    let novas = 0
    const { tiras } = bloco
    const precisas = new Set(fatias.map(([fatia]) => fatia))
    const longe = (tira: Tira) => (tira.fatia < 0 ? Infinity : distancia(bloco, tira.fatia, rolagem))
    // da mais perto à mais longe: as últimas (pop) são as primeiras a mudar de lugar
    const livres = tiras.filter((tira) => !precisas.has(tira.fatia)).sort((a, b) => longe(a) - longe(b))
    const cobertas = new Set(tiras.map((tira) => tira.fatia))
    for (const [fatia, d] of fatias) {
      if (cobertas.has(fatia)) continue
      let tira = livres.pop()
      if (!tira) {
        if (performance.now() > (d > urgencia ? limite : limiteUrgente)) {
          incompleto = true
          continue
        }
        tira = criarTira(bloco)
        tiras.push(tira)
        novas++
      }
      mostrarFatia(bloco, tira, fatia)
      animar(bloco, tira)
    }
    // As que sobraram continuam prontas se a rolagem pode trazê-las de volta logo; as outras saem.
    for (const tira of livres) if (tira.fatia < 0 || !alcancavel(bloco, tira.fatia, rolagem, folga, MANTER)) descartar(bloco, tira)
    return novas
  }

  /**
   * Só as telas das fatias que estão na faixa, ou quase, recebem cada quadro dos vídeos (veja PERTO).
   * As outras, postas com antecedência, ainda esperam a vez (ou já foram engolidas): cada tela
   * redesenhada é um quadro a mais para a placa de vídeo compor.
   */
  function acordarTelas(bloco: Bloco, rolagem: number) {
    if (!pintor) return
    for (const tira of bloco.tiras) {
      const perto = tira.fatia >= 0 && distancia(bloco, tira.fatia, rolagem) <= PERTO
      for (const tela of tira.telas) if (tela) pintor.acordar(tela, perto)
    }
  }

  function apagarTiras(bloco: Bloco) {
    for (const tira of bloco.tiras) {
      if (tira.animacao) relogio.soltar(tira.animacao)
      tira.animacao = null
      tira.fatia = -1
      devolverTelas(tira)
    }
    bloco.tiras = []
    bloco.grupo?.remove()
    bloco.grupo = null
  }

  /**
   * As fatias de cada bloco ficam juntas, numa caixa só delas dentro da camada, que leva a foto do
   * bloco (numa variável, para as fatias): trocar a foto é mudar uma propriedade só. A cada quadro o
   * navegador olha de novo só as caixas em que algo mudou.
   */
  function grupoDo(bloco: Bloco): HTMLDivElement {
    if (!bloco.grupo) {
      bloco.grupo = document.createElement('div')
      bloco.grupo.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;contain:layout style'
      if (bloco.foto) bloco.grupo.style.setProperty('--foto', `url("${bloco.foto.url}")`)
      obterCamada().append(bloco.grupo)
    }
    return bloco.grupo
  }

  /**
   * O bloco fica por cima da cortina, no lugar, e as fatias dele se escondem: com o foco do teclado
   * dentro (quem navega pelo teclado precisa vê-lo), ou quando as fatias precisam aparecer e a foto
   * ainda não está pronta (sem ela, o conteúdo sumiria na beira da faixa).
   */
  function elevar(bloco: Bloco, sim: boolean) {
    if (bloco.linha || bloco.elevado === sim) return
    bloco.elevado = sim
    const estilo = bloco.elemento.style
    if (sim) {
      bloco.estiloAntes = [estilo.position, estilo.zIndex]
      if (getComputedStyle(bloco.elemento).position === 'static') estilo.position = 'relative'
      estilo.zIndex = POR_CIMA
    } else {
      ;[estilo.position, estilo.zIndex] = bloco.estiloAntes
    }
    for (const tira of bloco.tiras) if (tira.fatia >= 0) tira.caixa.style.translate = sim ? ESCONDIDA : ''
  }

  /** O original mudou: a foto do bloco precisa ser refeita (veja tirarFotos). */
  function envelhecer(bloco: Bloco, { soFrente = false, soMouse = false }: { soFrente?: boolean; soMouse?: boolean }) {
    if (bloco.linha) return
    if (!soFrente && !soMouse) esquecerVariantes(bloco)
    bloco.soFrente = bloco.velha ? bloco.soFrente && soFrente : soFrente
    bloco.soMouse = bloco.velha ? bloco.soMouse && soMouse : soMouse
    bloco.velha = true
    agendarFotos(false)
  }

  /**
   * Marca a vez de começar fotos: num tempo ocioso da página ou, se alguma fatia precisa de uma
   * foto que ainda não existe, logo depois do quadro. A cada quadro (`doQuadro`), só se ninguém está
   * esperando uma volta já marcada (veja tirarFotos): senão cada quadro da rolagem olharia todos os
   * blocos à toa.
   */
  function agendarFotos(urgente: boolean, doQuadro = false) {
    if (!cena || !camada) return
    if (urgente) {
      // Logo depois do quadro, e não dentro dele: a foto mede o bloco (veja tirarFoto), e no meio do
      // quadro, depois de ele mexer nas fatias, isso obrigava o navegador a refazer o layout na hora.
      // Uma tarefa marcada daqui roda assim que o navegador termina de desenhar o quadro.
      vezUrgente ||= window.setTimeout(() => {
        vezUrgente = 0
        if (vezDasFotos && temOcioso) cancelIdleCallback(vezDasFotos)
        else if (vezDasFotos) clearTimeout(vezDasFotos)
        vezDasFotos = 0
        tirarFotos()
      }, 0)
      return
    }
    if (vezDasFotos || vezUrgente || (doQuadro && esperaDasFotos)) return
    vezDasFotos = temOcioso ? requestIdleCallback(tirarFotos, { timeout: 500 }) : window.setTimeout(tirarFotos, 60)
  }

  /**
   * Qual bloco fotografar (o de menor prioridade), ou null. Primeiro os que não têm foto, dos mais
   * perto da faixa aos mais longe: todos ganham a sua, com o tempo que sobra, antes de a rolagem os
   * trazer. Depois os de foto velha que estão na faixa de aquecer (os que o mouse mudou, só quando
   * chegam perto da faixa, e depois de as transições acabarem). Devolve também quando vale olhar de
   * novo, se algum espera.
   */
  function escolher(agora: number, rolagem: number): { bloco: Bloco | null; esperar: number } {
    let melhor: Bloco | null = null
    let menor = Infinity
    let esperar = Infinity
    const perto = Math.max(folgaAtual[0], folgaAtual[1]) + window.innerHeight * 0.5
    for (const bloco of blocos) {
      if (bloco.linha || bloco.fotografando) continue
      if (agora - bloco.falhou < NOVA_TENTATIVA) {
        esperar = Math.min(esperar, NOVA_TENTATIVA - (agora - bloco.falhou))
        continue
      }
      const d = distanciaDoBloco(bloco, rolagem)
      let prioridade: number
      if (!bloco.foto) prioridade = d
      else if (!bloco.velha) continue
      else {
        // A foto velha serve até as transições do mouse acabarem e a página parar de rolar. Só a de
        // um bloco que o mouse mudou e que pode estar à vista na faixa não espera a rolagem: a tira
        // mostraria o estado de antes até a página parar.
        const aVista = bloco.soMouse && d === 0
        const espera = Math.max(ESPERA_DO_MOUSE - (agora - bloco.mexido), aVista ? 0 : ESPERA_DA_ROLAGEM - (agora - rolouEm))
        if (espera > 0) {
          esperar = Math.min(esperar, espera)
          continue
        }
        const [acima, abaixo] = aquecerAtual
        const alcance = bloco.soMouse ? perto : Math.max(acima, abaixo, perto)
        if (d > alcance) continue
        // as que já têm uma foto (velha) vão depois das que não têm nenhuma
        prioridade = d + 1e6
      }
      if (prioridade < menor) {
        menor = prioridade
        melhor = bloco
      }
    }
    return { bloco: melhor, esperar }
  }

  function tirarFotos() {
    vezDasFotos = 0
    if (!cena || !camada) return
    // As medidas e as fotos dependem das fontes: antes de elas carregarem, as fotos sairiam erradas.
    if (document.fonts && document.fonts.status !== 'loaded') {
      void document.fonts.ready.then(() => agendarFotos(false))
      return
    }
    const agora = performance.now()
    const rolagem = window.scrollY
    let esperar = Infinity
    while (fotografando < FOTOS_AO_MESMO_TEMPO) {
      const escolha = escolher(agora, rolagem)
      esperar = escolha.esperar
      if (!escolha.bloco) break
      tirarFoto(escolha.bloco)
    }
    window.clearTimeout(esperaDasFotos)
    esperaDasFotos = 0
    if (Number.isFinite(esperar)) {
      esperaDasFotos = window.setTimeout(() => {
        esperaDasFotos = 0
        agendarFotos(false)
      }, esperar + 20)
    }
  }

  /** Faz a foto do bloco (ou só a da frente dos vídeos, se só ela mudou) e a põe nas fatias. */
  function tirarFoto(bloco: Bloco) {
    const minhaGeracao = geracao
    const soFrente = bloco.foto !== null && bloco.velha && bloco.soFrente && bloco.foto.fase === bloco.fase
    // só o mouse mudou desde a última: ela é mais um estado dele, e as outras continuam valendo
    const soMouse = bloco.foto !== null && bloco.velha && bloco.soMouse
    const { mouse } = bloco
    const chave = chaveDoMouse(bloco.elemento, mouse)
    bloco.fotografando = true
    bloco.velha = false
    bloco.soFrente = false
    bloco.soMouse = false
    fotografando++
    // a estrutura pode ter mudado (o React trocou o ícone do botão): a frente é medida de novo
    bloco.frente = medirFrente(bloco.elemento, bloco.videos)
    const fase = bloco.fase
    fotografar({
      elemento: bloco.elemento,
      x: bloco.x,
      y: bloco.y,
      largura: bloco.largura,
      altura: bloco.altura,
      dpr,
      frente: bloco.frente?.elementos ?? [],
      vivos: bloco.vivos.map((vivo) => vivo.indice),
      mouse,
      foto: !soFrente,
      fotoDaFrente: bloco.frente !== null,
      urgente: () => bloco.elevado || bloco.tiras.some((tira) => tira.fatia >= 0),
    })
      .then((fotos) => {
        if (minhaGeracao !== geracao || !blocos.includes(bloco)) {
          soltarFoto(fotos.foto)
          return
        }
        aplicarFotos(bloco, fotos, soFrente, chave, soMouse)
        // o bloco mudou de lugar no meio da foto: ela serve até a próxima
        if (bloco.fase !== fase) envelhecer(bloco, {})
      })
      .catch(() => {
        bloco.falhou = performance.now()
        if (bloco.foto) bloco.velha = true
      })
      .finally(() => {
        bloco.fotografando = false
        if (minhaGeracao === geracao) {
          fotografando--
          agendarFotos(false)
        }
      })
  }

  /** A foto vai para as fatias (pelo grupo do bloco). */
  function mostrarFoto(bloco: Bloco, foto: Foto, chave: string) {
    bloco.foto = foto
    bloco.chave = chave
    bloco.grupo?.style.setProperty('--foto', `url("${foto.url}")`)
  }

  /**
   * Mostra a foto já feita para o estado atual do mouse sobre o bloco, se houver uma (veja
   * variantes). Devolve se havia.
   */
  function trocarPelaVariante(bloco: Bloco): boolean {
    const chave = chaveDoMouse(bloco.elemento, bloco.mouse)
    const foto = bloco.variantes.get(chave)
    if (!foto) return false
    if (foto !== bloco.foto) mostrarFoto(bloco, foto, chave)
    // se só o mouse tinha mudado, a foto à vista está em dia
    if (bloco.velha && bloco.soMouse) bloco.velha = false
    return true
  }

  /** As fotos dos outros estados do mouse vão embora (a à vista fica, até chegar a nova). */
  function esquecerVariantes(bloco: Bloco) {
    for (const foto of bloco.variantes.values()) if (foto !== bloco.foto) soltarFoto(foto)
    bloco.variantes.clear()
    if (bloco.foto) bloco.variantes.set(bloco.chave, bloco.foto)
  }

  /** Todas as fotos do bloco vão embora. */
  function soltarFotos(bloco: Bloco) {
    for (const foto of bloco.variantes.values()) soltarFoto(foto)
    if (bloco.foto && !bloco.variantes.has(bloco.chave)) soltarFoto(bloco.foto)
    bloco.variantes.clear()
    bloco.foto = null
    bloco.fotoDaFrente = null
  }

  /**
   * As fotos novas vão para as fatias: a do bloco no grupo, a da frente nas telas dos vídeos. A do
   * bloco fica guardada com o estado do mouse em que foi feita (`chave`); se só o mouse tinha mudado
   * (`soMouse`), as dos outros estados continuam valendo, e fica à vista a do estado de agora.
   */
  function aplicarFotos(bloco: Bloco, { foto, frente }: Fotos, soFrente: boolean, chave: string, soMouse: boolean) {
    if (!soFrente && foto) {
      const antigas = new Set(bloco.variantes.values())
      if (bloco.foto) antigas.add(bloco.foto)
      if (!soMouse) bloco.variantes.clear()
      bloco.variantes.set(chave, foto)
      const agora = chaveDoMouse(bloco.elemento, bloco.mouse)
      mostrarFoto(bloco, bloco.variantes.get(agora) ?? foto, bloco.variantes.has(agora) ? agora : chave)
      // as que passaram do limite saem, das mais antigas às mais novas (a à vista fica)
      for (const [outra, guardada] of bloco.variantes) {
        if (bloco.variantes.size <= VARIANTES) break
        if (guardada !== bloco.foto) bloco.variantes.delete(outra)
      }
      const guardadas = new Set(bloco.variantes.values())
      for (const antiga of antigas) if (!guardadas.has(antiga)) soltarFoto(antiga)
    }
    bloco.fotoDaFrente = frente
    for (const video of bloco.videos) mandarFrente(bloco, video)
    // sem foto, as fatias não apareciam (o bloco estava por cima da cortina): agora aparecem
    if (bloco.elevado && !bloco.focado) elevar(bloco, false)
  }

  function devolver(bloco: Bloco) {
    if (bloco.tiras.length || bloco.grupo) apagarTiras(bloco)
    elevar(bloco, false)
  }

  /** O bloco saiu da página: as fatias, as fotos e os vídeos dele no pintor vão embora. */
  function esquecer(bloco: Bloco) {
    devolver(bloco)
    soltarFotos(bloco)
    for (const video of bloco.videos) {
      if (video.apresentado) pintor?.esquecer(video.id)
      video.apresentado = false
      // (uma frente que ainda esteja a caminho não vale mais)
      video.frentes++
    }
  }

  /** Os títulos fixos das seções param no alto da tela, dentro da faixa: ficam por cima da cortina e da tampa. */
  function fixarPorCima(elementos: Set<HTMLElement>) {
    for (const [elemento, antes] of fixos) {
      if (elementos.has(elemento)) continue
      elemento.style.zIndex = antes
      fixos.delete(elemento)
    }
    for (const elemento of elementos) {
      if (fixos.has(elemento)) continue
      fixos.set(elemento, elemento.style.zIndex)
      elemento.style.zIndex = POR_CIMA
    }
  }

  function novoBloco(elemento: HTMLElement, medida: { x: number; y: number; largura: number; altura: number }, linha: boolean): Bloco {
    const videos = linha ? [] : medirVideos(elemento)
    const bloco: Bloco = {
      elemento,
      linha,
      ...medida,
      esquerda: 0,
      topo: 0,
      larguraDaGrade: 0,
      alturaDaGrade: 0,
      fase: '',
      videos,
      frente: linha ? null : medirFrente(elemento, videos),
      vivos: linha ? [] : medirVivos(elemento),
      tiras: [],
      foto: null,
      variantes: new Map(),
      chave: '',
      fotoDaFrente: null,
      velha: false,
      soFrente: false,
      soMouse: false,
      fotografando: false,
      falhou: Number.NEGATIVE_INFINITY,
      mexido: Number.NEGATIVE_INFINITY,
      mouse: null,
      trajetos: new Map(),
      focado: false,
      elevado: false,
      estiloAntes: ['', ''],
      grupo: null,
    }
    atualizarGrade(bloco)
    return bloco
  }

  /**
   * O bloco mudou de lugar na página (sem mudar de tamanho): as fatias continuam, com os trajetos
   * refeitos. A foto continua valendo se ele caiu na mesma fração de pixel da tela; senão ela é
   * refeita, e até lá serve a antiga.
   */
  function mover(bloco: Bloco, x: number, y: number) {
    if (bloco.x === x && bloco.y === y) return
    bloco.x = x
    bloco.y = y
    atualizarGrade(bloco)
    bloco.trajetos.clear()
    const quantas = quantasFatias(bloco)
    for (const tira of [...bloco.tiras]) {
      if (tira.fatia < 0 || tira.fatia >= quantas) {
        descartar(bloco, tira)
        continue
      }
      mostrarFatia(bloco, tira, tira.fatia)
      animar(bloco, tira)
    }
    if (bloco.foto && bloco.foto.fase !== bloco.fase) envelhecer(bloco, {})
  }

  return {
    definirCena(nova) {
      const novoDpr = window.devicePixelRatio || 1
      const igual =
        cena !== null &&
        novoDpr === dpr &&
        nova.plena === cena.plena &&
        nova.alvo.x === cena.alvo.x &&
        nova.alvo.y === cena.alvo.y &&
        nova.alvo.raio === cena.alvo.raio &&
        nova.faixa.frente === cena.faixa.frente &&
        nova.faixa.inicio === cena.faixa.inicio
      const mesmoCaminho =
        cena !== null &&
        nova.caminho.dx === cena.caminho.dx &&
        nova.caminho.ate === cena.caminho.ate &&
        nova.caminho.zoom === cena.caminho.zoom &&
        nova.caminho.base === cena.caminho.base
      cena = nova
      if (igual && mesmoCaminho) return
      if (igual) {
        // Só o caminho mudou (a página mudou de altura): as fatias continuam, com trajetos novos.
        for (const bloco of blocos) {
          bloco.trajetos.clear()
          for (const tira of bloco.tiras) if (tira.fatia >= 0) animar(bloco, tira)
        }
        animarPendentes()
        return
      }
      // tudo muda: as fatias são refeitas no próximo preparar (as que podem aparecer, na hora)
      for (const bloco of blocos) {
        devolver(bloco)
        bloco.trajetos.clear()
      }
      if (novoDpr !== dpr) {
        // as fotos são feitas nos pixels da tela: com outra escala, todas são refeitas
        dpr = novoDpr
        for (const bloco of blocos) {
          soltarFotos(bloco)
          atualizarGrade(bloco)
        }
      }
      pixelsDaFatia = Math.max(1, Math.round(FATIA * dpr))
      passo = pixelsDaFatia / dpr
      obterCamada().style.height = `${nova.faixa.inicio}px`
    },

    pendente: () => incompleto,

    medir() {
      // As medidas ignoram o efeito (o original nunca sai do lugar): as fatias e a foto continuam
      // valendo enquanto o bloco tem o mesmo tamanho.
      const antes = new Map(blocos.filter((bloco) => !bloco.linha).map((bloco) => [bloco.elemento, bloco]))
      const elementos = [...document.querySelectorAll<HTMLElement>(SELETOR)]
      const titulos = new Set<HTMLElement>()
      const reais = elementos.filter((elemento) => {
        // os títulos fixos das seções ficam parados no alto da tela: seriam engolidos o tempo todo
        if (getComputedStyle(elemento).position === 'sticky') {
          titulos.add(elemento)
          return false
        }
        // um bloco dentro de outro já é absorvido junto com ele
        return !elementos.some((outro) => outro !== elemento && outro.contains(elemento))
      })
      fixarPorCima(titulos)

      const novos = reais
        .map((elemento): Bloco => {
          const medida = medirBloco(elemento)
          const anterior = antes.get(elemento)
          if (anterior && anterior.largura === medida.largura && anterior.altura === medida.altura) {
            mover(anterior, medida.x, medida.y)
            return anterior
          }
          if (anterior) esquecer(anterior)
          return novoBloco(elemento, medida, false)
        })
        // elementos ocultos neste tamanho de tela não têm o que absorver
        .filter((bloco) => bloco.largura > 0 && bloco.altura > 0)

      // as linhas soltas, fora dos blocos (e dos títulos fixos)
      const principal = document.querySelector('main')
      const novasLinhas = new Map<string, Bloco>()
      if (principal) {
        const fora = new Set<Element>([...reais, ...titulos])
        for (const borda of medirBordas(principal, fora)) {
          let numero = numeros.get(borda.fonte)
          if (numero === undefined) numeros.set(borda.fonte, (numero = proximoNumero++))
          const chave = `${numero} ${borda.lado}`
          const caixa = borda.fonte.getBoundingClientRect()
          const medida = {
            x: caixa.left + window.scrollX,
            y: (borda.lado === 'top' ? caixa.top : caixa.bottom - borda.espessura) + window.scrollY,
            largura: caixa.width,
            altura: borda.espessura,
          }
          if (medida.largura <= 0) continue
          const anterior = linhas.get(chave)
          if (anterior && anterior.largura === medida.largura && anterior.altura === medida.altura) {
            mover(anterior, medida.x, medida.y)
            novasLinhas.set(chave, anterior)
            continue
          }
          if (anterior) devolver(anterior)
          novasLinhas.set(chave, novoBloco(modeloDaBorda(borda, medida.largura), medida, true))
        }
      }
      for (const [chave, linha] of linhas) if (!novasLinhas.has(chave)) devolver(linha)
      linhas = novasLinhas

      // o que deixou de ser bloco (um título que passou a ficar fixo, por exemplo) volta ao normal
      const atuais = new Set(novos)
      for (const bloco of antes.values()) if (!atuais.has(bloco)) esquecer(bloco)
      blocos = [...novos, ...linhas.values()]
      // os blocos que mudaram de lugar ganham trajetos novos
      animarPendentes()
      // os blocos novos ganham foto (os mais perto da faixa primeiro)
      agendarFotos(false)
    },

    preparar(rolagem, { folga, urgencia, orcamento, aquecer: [acima, abaixo] }) {
      incompleto = false
      if (!cena) return 0
      const agora = performance.now()
      const limite = agora + orcamento
      limiteUrgente = agora + Math.max(orcamento, ORCAMENTO_URGENTE)
      if (rolagem !== rolagemAtual) rolouEm = agora
      rolagemAtual = rolagem
      folgaAtual = folga
      aquecerAtual = [acima, abaixo]
      obterCamada()
      // O foco de um clique (num botão, num link) não conta, só o do teclado: senão o bloco clicado
      // nunca seria absorvido.
      const focado = document.activeElement
      const doTeclado = focado instanceof Element && focado !== document.body && focado.matches(':focus-visible') ? focado : null
      let novas = 0
      let semFoto = false
      /** Algum bloco espera uma foto (nova ou refeita). */
      let falta = false
      for (const bloco of blocos) {
        const quantas = quantasFatias(bloco)
        // o trecho da rolagem em que alguma fatia do bloco pode estar na faixa
        const comeco = trecho(bloco, 0)[0]
        const fim = trecho(bloco, quantas - 1)[1]
        const fatias = fim >= rolagem - folga[0] && comeco <= rolagem + folga[1] ? fatiasDaFolga(bloco, rolagem, folga) : []
        if (!bloco.linha) {
          bloco.focado = doTeclado !== null && bloco.elemento.contains(doTeclado)
          const precisa = fatias.length > 0 && !bloco.foto
          if (precisa) semFoto = true
          if (!bloco.fotografando && (!bloco.foto || bloco.velha)) falta = true
          elevar(bloco, bloco.focado || precisa)
        }
        if (fatias.length) novas += distribuir(bloco, fatias, rolagem, folga, urgencia, limite)
        else {
          // as fatias que a rolagem não pode trazer logo saem
          for (const tira of [...bloco.tiras]) if (tira.fatia < 0 || !alcancavel(bloco, tira.fatia, rolagem, folga, MANTER)) descartar(bloco, tira)
          // sem fatias, o grupo do bloco sai também (a foto fica, para quando ele voltar)
          if (!bloco.tiras.length && bloco.grupo) apagarTiras(bloco)
        }
        if (bloco.videos.length) acordarTelas(bloco, rolagem)
      }
      animarPendentes()
      if (falta) agendarFotos(semFoto, true)
      return novas
    },

    limpar() {
      geracao++
      fotografando = 0
      if (vezDasFotos && temOcioso) cancelIdleCallback(vezDasFotos)
      else if (vezDasFotos) window.clearTimeout(vezDasFotos)
      vezDasFotos = 0
      window.clearTimeout(vezUrgente)
      vezUrgente = 0
      window.clearTimeout(esperaDasFotos)
      esperaDasFotos = 0
      cancelAnimationFrame(esperaDoMouse)
      esperaDoMouse = 0
      for (const bloco of blocos) {
        esquecer(bloco)
        bloco.fotografando = false
        bloco.velha = false
      }
      fixarPorCima(new Set())
      vigiaConteudo.disconnect()
      vigiaTema.disconnect()
      document.removeEventListener('pointerover', aoMexerMouse)
      document.removeEventListener('pointerout', aoMexerMouse)
      camada?.remove()
      camada = null
      pintor?.destruir()
      pintor = null
      porAnimar.length = 0
      incompleto = false
    },
  }
}
