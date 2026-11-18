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
// desenhado por cópias do bloco, uma para cada fatia fina dele, cada uma recortada na sua fatia e
// com o seu trapézio. As bordas de fatias vizinhas coincidem, e a tira sai contínua. As cópias
// ficam numa camada fixa no alto da tela, sem foco, clique ou leitor de tela, por cima de uma
// cortina (veja index.ts) que cobre a faixa com o fundo e o buraco negro: o original não sai do
// lugar nem muda, só passa por trás dela.
//
// Quem move as cópias é o navegador, e não o JavaScript: cada uma tem uma animação presa à rolagem
// (veja rolagem.ts), com um quadro-chave para cada pixel da tela que a página rola enquanto a fatia
// atravessa a faixa. A rolagem corre fora do JavaScript, que chega a ficar um quadro ou mais para
// trás dela; as animações correm junto com ela, na mesma etapa, e a tira nunca se descola do
// original na beira da cortina, por mais rápida que seja a rolagem. Ao JavaScript resta preparar
// as cópias com antecedência, enquanto a página se aproxima delas (veja preparar), e fazê-las
// acompanhar o original em tudo o que muda sem rolagem: o quadro dos vídeos, o mouse em cima, as
// animações e o que o React redesenhar dentro do bloco. Assim nada se parte entre o original e a
// tira.
//
// Os blocos são os que já têm animação de entrada ([data-reveal] e .enter). As linhas soltas da
// página (a borda de cima das seções e das listas) entram como blocos de uma fatia só.

import { aparecerAoRolar, type Relogio } from './rolagem.ts'

/** O buraco negro na tela (px CSS). */
export interface Alvo {
  x: number
  y: number
  /** Raio da sombra. */
  raio: number
}

/**
 * A faixa da tela em que o conteúdo é absorvido: ele começa a ser puxado quando sobe até `inicio`
 * e chega ao buraco negro em `frente`. Acima de `frente` só fica o buraco negro. As duas ficam em
 * pixels inteiros da tela.
 */
export interface Faixa {
  frente: number
  inicio: number
}

/** O que a absorção precisa saber da tela. Nada disso muda com a rolagem, só com o tamanho da janela. */
export interface Cena {
  /** O buraco negro com a página no topo. */
  alvo: Alvo
  /**
   * O caminho dele ao longo da página, até a rolagem `ate`: pelo alto da tela, em linha reta e no
   * mesmo ritmo, `dx` px para o lado, crescendo até `zoom` vezes o tamanho, com o ponto mais baixo,
   * `base` raios da sombra abaixo do centro, sempre na mesma altura (veja alvoEm).
   */
  caminho: { dx: number; ate: number; zoom: number; base: number }
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
  /** As fatias que aparecem com a página rolada dentro da folga ganham cópia, presa à rolagem. */
  folga: Folga
  /** As que podem aparecer até `urgencia` px daqui, na hora (até ORCAMENTO_URGENTE ms). */
  urgencia: number
  /** As outras, com o tempo que sobrar: até `orcamento` ms por quadro. */
  orcamento: number
  /**
   * Os blocos que aparecem com a página dentro desta faixa ganham com antecedência, escondidas,
   * todas as cópias que vão usar (os outros, longe, as perdem).
   */
  aquecer: Folga
  /** A maior folga que preparar pode receber: as cópias de cada bloco cobrem esse trecho de uma vez. */
  folgaMaxima: Folga
}

export interface Absorcao {
  /** A tela mudou (tamanho da janela, do cabeçalho, o zoom): refaz as trajetórias. */
  definirCena(cena: Cena): void
  /** Mede os blocos de novo (depois de mudanças no layout). */
  medir(): void
  /**
   * Prepara as cópias das fatias que a rolagem pode levar à faixa (veja Preparo), com a página
   * rolada até `rolagem`. Devolve quantas cópias novas foram criadas para fatias.
   */
  preparar(rolagem: number, preparo: Preparo): number
  /** Ficou trabalho para o próximo quadro: cópias por preparar, ou algo mudou dentro de um bloco. */
  pendente(): boolean
  /** A cada quadro, depois de preparar: leva às cópias o que mudou no original sem rolagem. */
  acompanhar(): void
  /** Devolve todos os blocos ao normal e apaga as cópias. */
  limpar(): void
}

/** Um recorte que o original aplica ao vídeo (um overflow com cantos arredondados), relativo a ele (px CSS). */
interface Recorte {
  x: number
  y: number
  largura: number
  altura: number
  /** [horizontal, vertical] de cada canto: em cima à esquerda, em cima à direita, embaixo à direita, embaixo à esquerda. */
  raios: [number, number][]
}

interface Video {
  elemento: HTMLVideoElement
  /** Posição e tamanho dentro do bloco (px CSS). */
  x: number
  y: number
  largura: number
  altura: number
  /** O que corta o vídeo no original (os cantos arredondados do cartão): a fonte já sai recortada assim. */
  recortes: Recorte[]
  /** O quadro atual, recortado como na página, de onde cada tela tira a sua parte. */
  fonte: HTMLCanvasElement | null
  /** Pixels da fonte (e das telas das cópias) por px CSS. */
  escala: number
  /** A fonte tem um quadro (sem ele, as cópias mostram o pôster, que fica atrás do vídeo). */
  pintada: boolean
  /** O tempo do último quadro copiado (onde não há requestVideoFrameCallback). */
  tempo: number
  vigia: number
}

/**
 * O que a cópia mostra: o bloco (com os vídeos nas telas), só o que fica na frente dos vídeos (veja
 * Frente) ou, na referência, o bloco sem os estados do mouse.
 */
type Modo = 'copia' | 'frente' | 'referencia'

/** Uma cópia do bloco, recortada numa fatia dele. */
interface Tira {
  caixa: HTMLDivElement
  clone: HTMLElement
  /** Os elementos da cópia, na mesma ordem que os do original (veja elementosDe). */
  elementos: Element[]
  /** Para cada vídeo do bloco, a tela onde a cópia mostra a parte dele que cai na sua fatia. */
  telas: (HTMLCanvasElement | undefined)[]
  modo: Modo
  /** A fatia que ela mostra, ou -1 (guardada, escondida). */
  fatia: number
  /** A animação que a leva pela faixa, presa à rolagem. */
  animacao: Animation | null
  /** O modelo dos quadros-chave dessa animação (veja trajeto). */
  modelo: KeyframeEffect | null
  /** As telas mudaram de lugar e precisam ser desenhadas de novo. */
  repintar: boolean
  /** As animações CSS precisam ser acertadas pelas do original (cópia nova). */
  sincronizar: boolean
  /** O original mudou depois que o clone foi feito (veja refazer). */
  velha: boolean
  /** Guardada fora do trabalho do navegador (veja travar). */
  travada: boolean
}

/**
 * O que o original desenha na frente dos vídeos (o botão de pausa). As telas dos vídeos ficam por
 * cima do clone de cada cópia, então nele isso fica escondido, e cópias à parte (as frentes) o
 * mostram por cima das telas.
 */
interface Frente {
  /** Os elementos, pela posição (veja elementosDe). */
  elementos: number[]
  /** Os mesmos elementos, no original. */
  nos: Element[]
  /** O trecho do bloco que eles ocupam (px CSS a partir do alto dele). */
  de: number
  ate: number
}


interface Bloco {
  /** O elemento da página, ou, numa linha solta, o modelo dela (fora da página). */
  elemento: HTMLElement
  /** Uma linha solta (a borda de uma seção ou lista), sem estados, vídeos nem React dentro. */
  linha: boolean
  // posição e tamanho na página, sem transformações
  x: number
  y: number
  largura: number
  altura: number
  videos: Video[]
  frente: Frente | null
  tiras: Tira[]
  /** As cópias que mostram a frente dos vídeos, nas fatias que a têm. */
  frentes: Tira[]
  /** O que as cópias precisam saber do original. */
  molde: Molde
  /** Os estados do original postos nas cópias agora (veja espelhar): chave (veja sobrescrever) → valor. */
  espelho: Map<string, string>
  /** Uma cópia escondida e sem esses estados: mostra como o bloco fica sem eles. */
  referencia: Tira | null
  /** O React mudou algo dentro do bloco: as cópias precisam ser refeitas. */
  sujo: boolean
  /** Onde o React mudou algo (os nós que a mudança atingiu), desde o último refazer. */
  mudancas: Node[]
  /**
   * Os trajetos já calculados (veja trajeto): efeitos com os quadros-chave, sem elemento, de que
   * cada cópia usa uma cópia.
   */
  trajetos: Map<string, KeyframeEffect>
  /** Com o foco do teclado dentro: fica por cima da cortina, no lugar, e as cópias se escondem. */
  elevado: boolean
  /** O position e o z-index do estilo do original antes de ele subir. */
  estiloAntes: [string, string]
  /** A caixa das cópias do bloco, dentro da camada (veja grupoDo). */
  grupo: HTMLDivElement | null
}

interface Molde {
  /** Os estilos que o original herda dos ancestrais (as cópias ficam fora deles). */
  herdados: [string, string][]
  /** Os elementos com backdrop-filter, pela posição (veja elementosDe). */
  desfoques: number[]
  /** Os elementos com ::before ou ::after desenhado, pelo caminho (medidos só quando espelhar precisa). */
  pseudos: [string, 'before' | 'after'][] | null
  /** Há animações CSS sem fim dentro (o ponto que pulsa no status). */
  animado: boolean
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

/**
 * Onde o buraco negro está, e de que tamanho, com a página rolada até `s`. Ao longo dela ele anda
 * pelo alto da tela e cresce, cada vez mais perto, sempre no mesmo ritmo, com o ponto mais baixo
 * dele parado na mesma altura: o resto dele cresce para cima e para os lados.
 */
export function alvoEm({ alvo, caminho }: Cena, s: number): Alvo {
  const t = Math.min(1, Math.max(0, s / Math.max(1, caminho.ate)))
  const raio = alvo.raio * caminho.zoom ** t
  const fundo = alvo.y + caminho.base * alvo.raio
  return { x: alvo.x + caminho.dx * t, y: fundo - caminho.base * raio, raio }
}

/** O nó é um bloco de conteúdo, ou tem blocos dentro? (Para saber se uma mudança na página pede novas medidas.) */
export function temBlocos(no: Node): boolean {
  return no instanceof Element && (no.matches('[data-reveal], .enter') || no.querySelector('[data-reveal], .enter') !== null)
}

/**
 * Altura das fatias (px CSS), arredondada a pixels inteiros da tela (13 px da tela, 10,4 px CSS,
 * numa tela com 125% de escala). Cada uma é um trapézio: finas, a tira fica lisa mesmo onde ela se
 * curva mais (com 12 px já aparecem quinas na borda); cada uma a mais é uma cópia e uma camada.
 */
const FATIA = 10
/**
 * Como a linha anda até o buraco negro: a fração do caminho é o progresso elevado a isto. Começa
 * devagar (na borda da faixa o conteúdo continua junto do que ficou no lugar) e acelera, como
 * quem cai.
 */
const ACELERACAO = 2
/** Largura que uma linha ainda tem ao chegar ao centro do buraco negro (px). */
const FIO = 1
/**
 * O conteúdo some ao entrar na sombra do buraco negro: a camada das cópias é transparente dentro
 * dela e opaca a partir de HORIZONTE raios do centro (um fio de transição, sobre o anel de luz).
 * Pouco mais que o raio: o que ainda está no lugar, logo abaixo da faixa, nunca chega tão perto.
 */
const HORIZONTE = 1.06
/** A maior razão aceita entre as larguras das bordas de uma fatia (só chega perto disso dentro da sombra). */
const PERSPECTIVA_MAXIMA = 12
/** Em quantos pontos da faixa a máscara do esmaecimento é medida (entre eles, ela vai em linha reta). */
const PARADAS = 12
/**
 * Quanto tempo (ms) um quadro pode gastar, no máximo, criando as cópias que podem aparecer já nos
 * próximos quadros (as outras têm o orçamento que preparar recebe). Cada cópia custa ainda, depois,
 * outro tanto em estilo, layout e pintura. Um quadro longo demais não adianta: enquanto ele roda, a
 * rolagem anda sem o JavaScript e passa das cópias que ele ainda está preparando.
 */
const ORCAMENTO_URGENTE = 8
/**
 * Uma cópia que deixou de ser precisa continua pronta enquanto a sua fatia está a até MANTER folgas
 * de aparecer: se a rolagem voltar logo, ela já está lá (e a folga pode oscilar sem que as cópias
 * mudem de fatia o tempo todo).
 */
const MANTER = 1.25
/**
 * Quantas cópias sem fatia um bloco que a rolagem está deixando para trás guarda escondidas, para
 * reaproveitar. Os que ela está para trazer guardam todas as que vão usar (veja completarReserva e
 * enxugarReserva).
 */
const RESERVA = 4
/**
 * Onde fica uma cópia guardada: muito acima da camada, fora do recorte dela (nada é desenhado). Com
 * visibility: hidden, que é herdada, guardar e mostrar uma cópia recalculava o estilo do clone
 * inteiro; o translate só mexe na caixa.
 */
const ESCONDIDA = '0 -100000px'

/**
 * O esmaecimento ao longo da distorção, como máscara da camada das cópias (de cima para baixo, em
 * px da tela): cada linha do conteúdo fica tão transparente quanto já se estreitou a caminho do
 * buraco negro (veja linhaEm), inteira na borda de baixo da faixa e sumindo perto do centro dele.
 * Basta a altura: a de cada linha na tela diz o quanto ela já foi puxada, qualquer que seja o
 * bloco. Muda só com a faixa (e com a força, no começo da página), não com a rolagem. Abaixo da
 * faixa, onde as cópias esperam (veja obterCamada), nada aparece.
 */
function esmaecimento({ frente, inicio }: Faixa, queda: number, forca: number): string {
  const banda = Math.max(1, inicio - frente)
  const paradas: string[] = []
  for (let i = PARADAS; i >= 0; i--) {
    const t = i / PARADAS
    const q = forca * t
    const y = inicio - t * banda + q * q * queda
    paradas.push(`rgba(0,0,0,${(1 - q ** ACELERACAO).toFixed(3)}) ${y.toFixed(1)}px`)
  }
  paradas.push(`transparent ${inicio}px`)
  return `linear-gradient(${paradas.join(',')})`
}
/**
 * O que o bloco herda dos ancestrais e muda o desenho do texto: as cópias ficam fora da página e
 * recebem isso de volta. (A cor fica de fora: vem do body, como no original, e acompanha o tema.)
 */
const HERDADOS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant-ligatures',
  'font-variant-caps',
  'font-variant-numeric',
  'font-variant-east-asian',
  'font-feature-settings',
  'font-variation-settings',
  'font-kerning',
  'font-optical-sizing',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-transform',
  'text-indent',
  'text-shadow',
  'text-rendering',
  'text-wrap-mode',
  'text-wrap-style',
  'white-space-collapse',
  'word-break',
  'overflow-wrap',
  'hyphens',
  'line-break',
  'tab-size',
  'list-style-type',
  'list-style-position',
  'direction',
  'writing-mode',
  'visibility',
  '-webkit-font-smoothing',
  'text-underline-offset',
  'text-decoration-skip-ink',
]
/** O que o mouse em cima (hover, clique) muda no original e as cópias precisam repetir. */
const ESTADO = ['color', 'background-color', 'border-color', 'opacity', 'translate', 'transform', 'text-decoration-color']
/** O mesmo, em ::before e ::after (o fundo das linhas de projeto ao passar o mouse). */
const ESTADO_PSEUDO = ['opacity', 'background-color']
/** Atributos que o React muda e mudam o desenho do bloco (o resto, como aria-label, não aparece). */
const ATRIBUTOS_VISIVEIS = ['class', 'src', 'srcset', 'hidden', 'd', 'aria-pressed', 'aria-expanded']
/**
 * Pseudoelementos não têm estilo inline: os estados deles chegam às cópias por variáveis, e estas
 * regras os aplicam (veja sobrescrever).
 */
const REGRAS_PSEUDO = (['before', 'after'] as const)
  .flatMap((pseudo) =>
    ESTADO_PSEUDO.map((propriedade) => `[data-copias-buraco-negro] [data-${pseudo}-${propriedade}]::${pseudo}{${propriedade}:var(--${pseudo}-${propriedade})!important}`),
  )
  .join('')
/**
 * Quanto a camada das cópias passa da faixa, para baixo (px): a altura de três fatias, onde as
 * cópias presas à rolagem esperam a sua vez, escondidas pela máscara (veja obterCamada).
 */
const ESPERA = 3 * FATIA
/** O molde de uma linha solta: nada a herdar nem a acompanhar. */
const MOLDE_VAZIO: Molde = { herdados: [], desfoques: [], pseudos: [], animado: false }
/**
 * Margem (px de rolagem) além da urgência em que uma cópia já recebe cada quadro dos vídeos: ela
 * pode aparecer antes de o JavaScript rodar de novo.
 */
const PERTO = 48

const temQuadros = typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** O bloco e tudo dentro dele, na ordem do documento: a mesma no original e nas cópias. */
function elementosDe(raiz: Element): Element[] {
  return [raiz, ...raiz.querySelectorAll('*')]
}

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
  let de = Infinity
  let ate = -Infinity
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
        de = Math.min(de, q.top - caixa.top)
        ate = Math.max(ate, q.bottom - caixa.top)
      }
    }
  }
  return indices.size ? { elementos: [...indices], nos, de, ate } : null
}

function medirVideos(elemento: HTMLElement): Video[] {
  const caixa = elemento.getBoundingClientRect()
  return [...elemento.querySelectorAll('video')].map((video) => {
    const r = video.getBoundingClientRect()
    return {
      elemento: video,
      x: r.left - caixa.left,
      y: r.top - caixa.top,
      largura: r.width,
      altura: r.height,
      recortes: medirRecortes(video, elemento),
      fonte: null,
      escala: Math.min(window.devicePixelRatio || 1, 2),
      pintada: false,
      tempo: -1,
      vigia: 0,
    }
  })
}

/** O que as cópias do bloco precisam saber dele (medido junto com o resto, longe da rolagem). */
function medirMolde(elemento: HTMLElement): Molde {
  const estilo = getComputedStyle(elemento)
  const desfoques: number[] = []
  elementosDe(elemento).forEach((filho, i) => {
    const valor = getComputedStyle(filho).backdropFilter
    if (valor && valor !== 'none') desfoques.push(i)
  })
  return {
    herdados: HERDADOS.map((propriedade): [string, string] => [propriedade, estilo.getPropertyValue(propriedade)]).filter(
      ([, valor]) => valor !== '',
    ),
    desfoques,
    pseudos: null,
    animado: elemento.getAnimations({ subtree: true }).some((animacao) => animacao.effect?.getComputedTiming().iterations === Infinity),
  }
}

/** Os elementos do bloco que desenham ::before ou ::after, pelo caminho (veja comCaminhos). */
function medirPseudos(elemento: HTMLElement): [string, 'before' | 'after'][] {
  const pseudos: [string, 'before' | 'after'][] = []
  for (const [filho, caminho] of comCaminhos(elemento)) {
    for (const pseudo of ['before', 'after'] as const) {
      const conteudo = getComputedStyle(filho, `::${pseudo}`).content
      if (conteudo && conteudo !== 'none' && conteudo !== 'normal') pseudos.push([caminho, pseudo])
    }
  }
  return pseudos
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

/** Copia para a fonte o quadro atual do vídeo, recortado como o object-fit: cover da página. */
function pintarFonte(video: Video): boolean {
  const { elemento } = video
  video.pintada = false
  if (elemento.readyState < 2 || !elemento.videoWidth || !elemento.videoHeight) return false
  video.fonte ??= document.createElement('canvas')
  // Tudo fica na placa de vídeo: com o quadro copiado para a memória (willReadFrequently, ou o
  // vídeo desenhado direto nas telas pequenas das cópias), cada cópia esperaria a placa terminar o
  // que está fazendo, às vezes por centenas de ms.
  const contexto = video.fonte.getContext('2d')
  if (!contexto) return false
  const w = Math.max(1, Math.round(video.largura * video.escala))
  const h = Math.max(1, Math.round(video.altura * video.escala))
  if (video.fonte.width !== w || video.fonte.height !== h) {
    video.fonte.width = w
    video.fonte.height = h
  }
  const k = Math.max(w / elemento.videoWidth, h / elemento.videoHeight)
  const sw = w / k
  const sh = h / k
  // os cantos que o original corta ficam transparentes (atrás deles, nas cópias, está o clone)
  const { recortes, escala } = video
  if (recortes.length) {
    contexto.clearRect(0, 0, w, h)
    contexto.save()
    for (const r of recortes) {
      contexto.beginPath()
      contexto.roundRect(r.x * escala, r.y * escala, r.largura * escala, r.altura * escala, r.raios.map(([rx, ry]) => ({ x: rx * escala, y: ry * escala })))
      contexto.clip()
    }
  }
  contexto.drawImage(elemento, (elemento.videoWidth - sw) / 2, (elemento.videoHeight - sh) / 2, sw, sh, 0, 0, w, h)
  if (recortes.length) contexto.restore()
  video.pintada = true
  return true
}

/** As linhas do vídeo (relativas a ele) que caem entre as linhas `de` e `ate` do bloco, ou null. */
function trechoDoVideo(video: Video, de: number, ate: number): [number, number] | null {
  const cima = Math.max(de, video.y) - video.y
  const baixo = Math.min(ate, video.y + video.altura) - video.y
  return baixo > cima ? [cima, baixo] : null
}

/**
 * Põe a tela de uma cópia sobre a parte do vídeo que cai na fatia (ou a esconde), na posição dela
 * dentro da fatia (de `de` a `ate` no bloco). Só estilo: o desenho fica para depois (desenharTela),
 * porque cada desenho depois de uma mudança de estilo obrigaria o navegador a recalcular os estilos
 * ali mesmo.
 */
function posicionarTela(video: Video, tela: HTMLCanvasElement | undefined, de: number, ate: number) {
  if (!tela) return
  const trecho = trechoDoVideo(video, de, ate)
  if (!trecho) {
    tela.style.display = 'none'
    return
  }
  const [cima, baixo] = trecho
  const w = Math.max(1, Math.round(video.largura * video.escala))
  const h = Math.max(1, Math.round((baixo - cima) * video.escala))
  if (tela.width !== w || tela.height !== h) {
    tela.width = w
    tela.height = h
  }
  tela.style.left = `${video.x}px`
  tela.style.top = `${video.y + cima - de}px`
  tela.style.width = `${video.largura}px`
  tela.style.height = `${baixo - cima}px`
  tela.style.display = ''
}

/** Copia para a tela de uma cópia a parte do quadro atual que cai na fatia (ou a deixa vazia, com o pôster à vista). */
function desenharTela(video: Video, tela: HTMLCanvasElement | undefined, de: number, ate: number) {
  const trecho = trechoDoVideo(video, de, ate)
  const contexto = trecho && tela?.getContext('2d')
  if (!trecho || !tela || !contexto) return
  if (!video.pintada || !video.fonte) {
    contexto.clearRect(0, 0, tela.width, tela.height)
    return
  }
  const sy = Math.min(video.fonte.height - 1, Math.round(trecho[0] * video.escala))
  const sh = Math.max(1, Math.min(video.fonte.height - sy, tela.height))
  // com cantos recortados, o quadro anterior não pode sobrar onde a fonte é transparente
  if (video.recortes.length) contexto.clearRect(0, 0, tela.width, tela.height)
  contexto.drawImage(video.fonte, 0, sy, tela.width, sh, 0, 0, tela.width, sh)
}

function soltarVideo(video: Video) {
  if (video.vigia) video.elemento.cancelVideoFrameCallback(video.vigia)
  video.vigia = 0
  video.fonte = null
  video.pintada = false
}

/**
 * Os elementos do bloco com o caminho até cada um (as posições entre os irmãos, de pai em filho:
 * "" é o bloco, "0.2" o terceiro filho do primeiro filho), na ordem do documento, a de elementosDe.
 * O caminho de um elemento não muda quando o React troca o que há dentro de outro (o ícone do botão
 * de pausa, por exemplo): os estados do mouse chegam ao elemento certo mesmo nas cópias feitas antes
 * da troca.
 */
function comCaminhos(raiz: Element): [Element, string][] {
  const lista: [Element, string][] = [[raiz, '']]
  const visitar = (pai: Element, prefixo: string) => {
    let i = 0
    for (const filho of pai.children) {
      const caminho = prefixo ? `${prefixo}.${i}` : `${i}`
      lista.push([filho, caminho])
      visitar(filho, caminho)
      i++
    }
  }
  visitar(raiz, '')
  return lista
}

/** O elemento no caminho (veja comCaminhos) a partir de `raiz`. */
function noCaminho(raiz: Element, caminho: string): Element | undefined {
  let no: Element | undefined = raiz
  if (caminho) for (const parte of caminho.split('.')) no = no?.children[Number(parte)]
  return no
}

/**
 * Põe (ou tira, com `valor` null) um estado do original num elemento da cópia (`raiz` é o clone).
 * A chave é "caminho|propriedade" ou, num pseudoelemento, "caminho|before|propriedade" (via
 * variável e atributo, que as REGRAS_PSEUDO aplicam).
 */
function sobrescrever(raiz: Element, chave: string, valor: string | null) {
  const [caminho = '', a, b] = chave.split('|')
  const elemento = noCaminho(raiz, caminho) as (Element & ElementCSSInlineStyle) | undefined
  if (!elemento || a === undefined) return
  if (b === undefined) {
    if (valor === null) elemento.style.removeProperty(a)
    else elemento.style.setProperty(a, valor)
    return
  }
  const nome = `${a}-${b}`
  if (valor === null) {
    elemento.removeAttribute(`data-${nome}`)
    elemento.style.removeProperty(`--${nome}`)
  } else {
    elemento.setAttribute(`data-${nome}`, '')
    elemento.style.setProperty(`--${nome}`, valor)
  }
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
  /** A animação que mostra a camada a partir do primeiro pixel de rolagem (veja aparecerAoRolar). */
  let entrada: Animation | null = null
  /** A força e o lugar e o tamanho do buraco negro com que a máscara da camada foi feita. */
  let forcaDaMascara = Number.NaN
  let furoDaMascara = ''
  /** Algo mudou dentro de um bloco (o React redesenhou): as cópias dele precisam ser refeitas. */
  let sujo = false
  /** Faltou tempo, no último quadro, para preparar todas as cópias da folga. */
  let incompleto = false
  /** As cópias que mudaram de fatia e esperam a animação nova (veja animarPendentes). */
  const porAnimar: [Bloco, Tira][] = []
  /** As cópias criadas para a reserva, que serão travadas (veja travar) depois do primeiro layout. */
  let porTravar: Tira[] = []
  /** Até quando o quadro pode criar as cópias urgentes (veja ORCAMENTO_URGENTE). */
  let limiteUrgente = 0
  /** A rolagem e a urgência do último preparar: os quadros dos vídeos vão primeiro às cópias que estão perto de aparecer. */
  let rolagemAtual = 0
  let urgenciaAtual = 0
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

  const quantasFatias = (bloco: Bloco) => Math.max(1, Math.ceil(bloco.altura / passo - 1e-6))
  /** O trecho do bloco (px CSS a partir do alto dele) que a fatia mostra. */
  const trechoDaFatia = (bloco: Bloco, fatia: number): [number, number] => [
    (fatia * pixelsDaFatia) / dpr,
    Math.min(((fatia + 1) * pixelsDaFatia) / dpr, bloco.altura),
  ]
  /** Um tamanho (px CSS) arredondado para cima a pixels inteiros da tela. */
  const emPixels = (v: number) => Math.ceil(v * dpr - 1e-6) / dpr
  // as bordas entre fatias ficam em pixels inteiros da tela: sem a suavização das bordas, não aparecem as emendas
  const alinhar = (v: number) => Math.round(v * dpr) / dpr

  // O React redesenhou algo dentro de um bloco com cópias (o ícone de um vídeo que pausou, o relógio
  // do contato): as cópias dele são refeitas. Os estilos que este efeito põe no original (atributo
  // style) e a entrada dos blocos (data-revealed) não contam.
  const vigiaConteudo = new MutationObserver((registros) => {
    for (const { target } of registros) {
      const bloco = blocos.find((outro) => !outro.linha && outro.tiras.length && outro.elemento.contains(target))
      if (!bloco) continue
      bloco.sujo = sujo = true
      bloco.mudancas.push(target)
    }
  })

  /**
   * A camada das cópias: fixa no alto da tela, acima da cortina e abaixo do cabeçalho. Fixa como a
   * cortina: as cópias andam pela rolagem com as animações, e não com a página. Ela mostra só a
   * faixa (o que passa dela fica por conta do original), mas vai um pouco além, até ESPERA abaixo
   * dela, com essa parte apagada pela máscara (veja esmaecimento): é ali que as cópias presas à
   * rolagem esperam a sua vez, logo abaixo da beira. Recortadas fora da camada, o navegador não as
   * desenharia antes de entrarem na faixa, e nos primeiros quadros elas apareciam vazias.
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
      if (cena) camada.style.height = `${cena.faixa.inicio + ESPERA}px`
      const regras = document.createElement('style')
      regras.textContent = REGRAS_PSEUDO
      camada.append(regras)
      document.body.append(camada)
      forcaDaMascara = Number.NaN
      const principal = document.querySelector('main')
      if (principal) {
        vigiaConteudo.observe(principal, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ATRIBUTOS_VISIVEIS,
        })
      }
    }
    return camada
  }

  /**
   * A máscara da camada: a sombra apaga o que entra nela, e antes disso o conteúdo vai esmaecendo
   * pelo caminho. Depende da cena, da força, que muda só no começo da página (em degraus, para a
   * máscara não mudar a cada quadro), e de onde o buraco negro está e de que tamanho (o furo anda e
   * cresce com ele, em pixels inteiros da tela).
   */
  function ajustarMascara(rolagem: number) {
    if (!camada || !cena) return
    const forca = Math.round(cena.forca(rolagem) * 20) / 20
    const alvo = alvoEm(cena, rolagem)
    const x = alinhar(alvo.x)
    const y = alinhar(alvo.y)
    const raio = alinhar(alvo.raio)
    const furo = `${x} ${y} ${raio}`
    if (forca === forcaDaMascara && furo === furoDaMascara) return
    forcaDaMascara = forca
    furoDaMascara = furo
    const { faixa } = cena
    const sombra = `radial-gradient(circle at ${x}px ${y}px, transparent ${raio}px, #000 ${raio * HORIZONTE + 1}px)`
    const mascara = `${sombra}, ${esmaecimento(faixa, alvo.y - faixa.frente, forca)}`
    camada.style.maskImage = mascara
    camada.style.webkitMaskImage = mascara
    // a máscara é o que as duas deixam passar
    camada.style.setProperty('-webkit-mask-composite', 'source-in')
    camada.style.maskComposite = 'intersect'
  }

  /**
   * Onde o bloco mira: o buraco negro anda com a rolagem (veja alvoEm), e o bloco vai até onde ele
   * está quando o meio do bloco passa pelo meio da faixa. Todas as fatias do bloco miram o mesmo
   * ponto: as bordas que elas dividem coincidem, e as que cruzam a faixa com a força inteira dividem
   * os mesmos quadros-chave. No começo e no fim da passagem de um bloco alto o buraco negro já está
   * um pouco ao lado desse ponto, mas a tira chega a ele por dentro da sombra, onde a máscara a apaga.
   */
  function alvoDoBloco(bloco: Bloco): Alvo {
    const { faixa } = cena!
    return alvoEm(cena!, bloco.y + bloco.altura / 2 - (faixa.frente + faixa.inicio) / 2)
  }

  /** Para onde vai a linha do bloco que estaria na altura `y` da tela, com a força `forca`, rumo a `alvo`. */
  function linhaEm(bloco: Bloco, y: number, forca: number, alvo: Alvo): Linha {
    const { faixa } = cena!
    const banda = Math.max(1, faixa.inicio - faixa.frente)
    // A linha que chega ao fim da faixa desce até a altura do buraco negro. As de baixo descem
    // menos, na proporção do progresso, e nenhuma passa da que vem antes dela.
    const queda = alvo.y - faixa.frente
    const q = forca * clamp01((faixa.inicio - y) / banda)
    const k = q ** ACELERACAO
    const centro = bloco.x + bloco.largura / 2
    const meio = centro + k * (alvo.x - centro)
    const meia = Math.max(FIO, bloco.largura * (1 - k)) / 2
    return { esquerda: meio - meia, direita: meio + meia, y: alinhar(y + q * q * queda), q }
  }

  /**
   * Por onde a fatia passa, em pixels inteiros da tela de rolagem: da rolagem n0 / dpr, a última
   * em que ela ainda está inteira abaixo da faixa (e a cópia, escondida pela beira da camada), à
   * n1 / dpr, em que ela foi engolida de vez (no começo da página, não antes de a força chegar a
   * 1). Contas em inteiros: cada fatia sai exatamente pixelsDaFatia pixels depois da de cima.
   */
  function grade(bloco: Bloco, fatia: number): [number, number] {
    const { faixa, plena } = cena!
    const [, ate] = trechoDaFatia(bloco, fatia)
    const n0 = Math.max(0, Math.floor((bloco.y - faixa.inicio) * dpr + 1e-6) + fatia * pixelsDaFatia)
    const fim = Math.ceil((bloco.y - faixa.frente) * dpr - 1e-6) + Math.ceil(ate * dpr - 1e-6)
    return [n0, Math.max(n0 + 1, fim, Math.ceil(plena * dpr - 1e-6))]
  }

  /**
   * O trecho da rolagem em que vale a animação da fatia. Cada quadro-chave vale de meio pixel da
   * tela antes a meio pixel depois da sua rolagem: com a página parada entre dois pixels (o
   * navegador desenha a página no pixel mais próximo), a cópia fica no mesmo pixel que o original.
   */
  function trecho(bloco: Bloco, fatia: number): [number, number] {
    const [n0, n1] = grade(bloco, fatia)
    return [(n0 - 0.5) / dpr, (n1 - 0.5) / dpr]
  }

  /**
   * Os quadros-chave da fatia: a transformação dela em cada pixel da tela de rolagem da sua
   * passagem pela faixa, sem nada entre um e outro (cada um vale até o próximo). Calculados uma
   * vez, quando a cópia é preparada; dali em diante, a rolagem só escolhe qual vale.
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
    for (let i = 0; i <= passos; i++) {
      const rolagem = (n0 + i) / dpr
      const forca = comum ? 1 : cena!.forca(rolagem)
      const y = bloco.y + de - rolagem
      const cima = linhaEm(bloco, y, forca, alvo)
      const baixo = linhaEm(bloco, y + altura, forca, alvo)
      // as duas bordas na mesma linha não formam um trapézio (e a matriz não teria inversa)
      if (baixo.y - cima.y < 0.01) baixo.y = cima.y + 0.01
      quadros.push({ offset: i / passos, easing: 'step-end', transform: trapezio(bloco.largura, altura, cima, baixo) })
    }
    const modelo = new KeyframeEffect(null, quadros, { fill: 'both' })
    bloco.trajetos.set(chave, modelo)
    return modelo
  }

  /** O clone do bloco para uma cópia: fora a referência, já com os estados que o original tem agora. */
  function montarClone(bloco: Bloco, modo: Modo) {
    const clone = bloco.elemento.cloneNode(true) as HTMLElement
    const todos = elementosDe(clone)
    // sem ids repetidos, sem as animações de entrada e sem os estilos que este efeito põe no original
    for (const elemento of todos) {
      elemento.removeAttribute('id')
      elemento.removeAttribute('data-reveal')
      elemento.removeAttribute('data-revealed')
      elemento.classList.remove('enter')
    }
    // (o estilo do modelo de uma linha solta é o que a desenha)
    if (!bloco.linha) clone.removeAttribute('style')
    const { herdados, desfoques } = bloco.molde
    for (const [propriedade, valor] of herdados) clone.style.setProperty(propriedade, valor)
    Object.assign(clone.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${bloco.largura}px`,
      height: `${bloco.altura}px`,
      margin: '0',
      transform: 'none',
      transition: 'none',
      animation: 'none',
    })
    // Cada desfoque do fundo seria uma passada a mais na placa de vídeo em cada cópia, a cada quadro
    // (o botão de pausa dos vídeos tem um): com dezenas de cópias, o site trava. Na tira nem se nota.
    for (const i of desfoques) {
      const elemento = todos[i] as (Element & ElementCSSInlineStyle) | undefined
      elemento?.style.setProperty('backdrop-filter', 'none')
      elemento?.style.setProperty('-webkit-backdrop-filter', 'none')
    }
    for (const imagem of clone.querySelectorAll('img')) {
      imagem.loading = 'eager'
      imagem.decoding = 'sync'
    }
    // Vídeos: uma cópia de <video> não tocaria junto com o original. Ele vira um espaço vazio do mesmo
    // tamanho (o pôster continua atrás), e o quadro atual vai para as telas da cópia (veja criarTira).
    // O <source> passa para o espaço: a ordem dos elementos continua a do original. (Repassar os
    // quadros a um <video> em cada cópia, com captureStream, sai bem mais caro: a página caía para
    // uns 20 quadros por segundo.)
    const copias = [...clone.querySelectorAll('video')]
    bloco.videos.forEach((video, i) => {
      const copia = copias[i]
      if (!copia) return
      const espaco = document.createElement('div')
      espaco.className = copia.className
      espaco.style.cssText = `position:relative;width:${video.largura}px;height:${video.altura}px`
      espaco.append(...copia.childNodes)
      copia.replaceWith(espaco)
    })
    const elementos = elementosDe(clone)
    // o que fica na frente dos vídeos aparece só nas frentes, por cima das telas
    const esconder = (i: number, valor: string) => (elementos[i] as (Element & ElementCSSInlineStyle) | undefined)?.style.setProperty('visibility', valor)
    if (modo === 'frente') clone.style.visibility = 'hidden'
    for (const i of bloco.frente?.elementos ?? []) {
      if (modo === 'frente') esconder(i, 'visible')
      else if (modo === 'copia') esconder(i, 'hidden')
    }
    if (modo !== 'referencia') for (const [chave, valor] of bloco.espelho) sobrescrever(clone, chave, valor)
    return { clone, elementos }
  }

  /**
   * Uma cópia do bloco, ainda sem fatia. O clone fica recortado na fatia por dentro (a janela), e as
   * telas dos vídeos ficam fora do recorte, por cima dele: um recorte dentro da caixa deformada
   * obrigaria a placa de vídeo a desenhar à parte, a cada quadro, tudo o que tem camada própria dentro
   * dele (as telas), e com dezenas de cópias a página travava. Pelo mesmo motivo a caixa não tem
   * overflow nem contain: paint, e as telas não têm o overflow: clip que o navegador põe em todo
   * canvas. A tela de cada vídeo cobre só a parte dele que cai na fatia.
   */
  function criarTira(bloco: Bloco, modo: Modo = 'copia'): Tira {
    const caixa = document.createElement('div')
    // nasce guardada (veja ESCONDIDA)
    caixa.style.cssText = `position:absolute;left:0;top:0;contain:size layout style;transform-origin:0 0;translate:${ESCONDIDA}`
    // em pixels inteiros da tela, como a altura (veja mostrarFatia)
    caixa.style.width = `${emPixels(bloco.largura)}px`
    // as frentes ficam por cima das telas de todas as cópias
    if (modo === 'frente') caixa.style.zIndex = '1'
    const janela = document.createElement('div')
    janela.style.cssText = 'position:absolute;inset:0;overflow:hidden'
    const { clone, elementos } = montarClone(bloco, modo)
    janela.append(clone)
    caixa.append(janela)
    const telas = bloco.videos.map((): HTMLCanvasElement | undefined => {
      if (modo !== 'copia') return undefined
      const tela = document.createElement('canvas')
      tela.style.cssText = 'position:absolute;overflow:visible;display:none'
      caixa.append(tela)
      return tela
    })
    grupoDo(bloco).append(caixa)
    return {
      caixa,
      clone,
      elementos,
      telas,
      modo,
      fatia: -1,
      animacao: null,
      modelo: null,
      repintar: false,
      sincronizar: bloco.molde.animado,
      velha: false,
      travada: false,
    }
  }

  /**
   * O React mudou algo dentro do bloco (o ícone de um vídeo que pausou, o relógio do contato): as
   * cópias ficam velhas e cada uma ganha um clone novo, no mesmo lugar (veja renovar). As que podem
   * aparecer logo, na hora; as outras, aos poucos, dentro do orçamento de cada quadro: um cartão tem
   * dezenas de cópias, e refazer todas de uma vez travava a rolagem a cada vídeo que pausava.
   */
  function refazer(bloco: Bloco) {
    // O que mais muda é o ícone do botão de pausa, que fica na frente do vídeo. As cópias comuns o
    // escondem (veja Frente), e o caminho dos outros elementos não muda (veja comCaminhos): para
    // elas, nada mudou. Só as frentes precisam do clone novo.
    const frente = bloco.frente
    const soNaFrente =
      frente !== null && bloco.mudancas.length > 0 && bloco.mudancas.every((alvo) => frente.nos.some((no) => no.contains(alvo)))
    bloco.mudancas = []
    soltarReferencia(bloco)
    // a estrutura pode ter mudado: os estados do mouse e o que fica na frente dos vídeos são medidos de novo
    bloco.espelho.clear()
    bloco.molde = medirMolde(bloco.elemento)
    bloco.frente = medirFrente(bloco.elemento, bloco.videos)
    for (const tira of soNaFrente ? bloco.frentes : [...bloco.tiras, ...bloco.frentes]) tira.velha = true
  }

  /**
   * Um clone novo para a cópia velha, no mesmo lugar. As telas dos vídeos, fora do clone, continuam
   * com o quadro, e a animação, na caixa, continua valendo.
   */
  function renovar(bloco: Bloco, tira: Tira) {
    const novo = montarClone(bloco, tira.modo)
    novo.clone.style.top = tira.clone.style.top
    tira.clone.replaceWith(novo.clone)
    Object.assign(tira, novo, { sincronizar: bloco.molde.animado, velha: false })
  }

  /**
   * Renova as cópias velhas do bloco: as que estão a até `urgencia` px de aparecer primeiro (com o
   * tempo das urgentes), as outras enquanto houver tempo no quadro. Devolve se ainda ficou alguma.
   */
  function renovarVelhas(bloco: Bloco, rolagem: number, urgencia: number, limite: number): boolean {
    let ficou = false
    for (const tira of [...bloco.tiras, ...bloco.frentes]) {
      if (!tira.velha) continue
      const perto = tira.fatia >= 0 && distancia(bloco, tira.fatia, rolagem) <= urgencia
      if (performance.now() < (perto ? limiteUrgente : limite)) renovar(bloco, tira)
      else ficou = true
    }
    return ficou
  }

  /** Põe a cópia na fatia: o clone na posição dela e as telas dos vídeos sobre a parte que cai nela. */
  function mostrarFatia(bloco: Bloco, tira: Tira, fatia: number) {
    tira.fatia = fatia
    const [de, ate] = trechoDaFatia(bloco, fatia)
    // A caixa tem pixels inteiros da tela (a última fatia do bloco, mais baixa, sobra um pouco: o
    // trapézio é o da altura dela, veja trajeto). Com uma fração de pixel, a camada da cópia
    // passaria meio pixel da borda de baixo, uma linha apagada sobre o que vem embaixo dela.
    tira.caixa.style.height = `${emPixels(ate - de)}px`
    tira.caixa.style.translate = bloco.elevado ? ESCONDIDA : ''
    destravar(tira)
    tira.clone.style.top = `${-de}px`
    bloco.videos.forEach((video, i) => {
      const tela = tira.telas[i]
      if (!tela) return
      if (trechoDoVideo(video, de, ate)) vigiar(bloco, video, i)
      posicionarTela(video, tela, de, ate)
    })
    tira.repintar = tira.telas.some(Boolean)
  }

  /** Marca a cópia para ser presa à rolagem, no trajeto da sua fatia (veja animarPendentes). */
  function animar(bloco: Bloco, tira: Tira) {
    porAnimar.push([bloco, tira])
  }

  /**
   * Prende à rolagem as cópias marcadas, todas juntas, depois de todas as mudanças na página: para
   * pôr uma animação no trecho certo da rolagem, o navegador precisa do layout em dia, e cada
   * animação criada entre uma mudança e outra o obrigava a refazê-lo na hora. A cópia que passa a
   * outra fatia do mesmo bloco, com o mesmo modelo, só muda o trecho da animação que já tinha (bem
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

  /** A cópia volta à reserva do bloco, escondida e solta da rolagem. */
  function guardar(tira: Tira) {
    tira.fatia = -1
    tira.caixa.style.translate = ESCONDIDA
    if (tira.animacao) relogio.soltar(tira.animacao)
    tira.animacao = null
    tira.modelo = null
    travar(tira)
  }

  /**
   * A cópia guardada sai do trabalho do navegador: com content-visibility: hidden, nada dentro dela
   * é recalculado nem pintado a cada quadro, mas o layout que ela já tem fica guardado. Sem isso, as
   * centenas de cópias à espera pesavam em todo quadro da rolagem, mesmo escondidas.
   */
  function travar(tira: Tira) {
    if (tira.travada) return
    tira.travada = true
    tira.caixa.style.contentVisibility = 'hidden'
  }

  function destravar(tira: Tira) {
    if (!tira.travada) return
    tira.travada = false
    tira.caixa.style.contentVisibility = ''
  }

  /** Quão longe (px de rolagem) a fatia está de aparecer, com a página em `rolagem` (0: pode estar à vista). */
  function distancia(bloco: Bloco, fatia: number, rolagem: number): number {
    const [de, ate] = trecho(bloco, fatia)
    return de > rolagem ? de - rolagem : ate < rolagem ? rolagem - ate : 0
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
      rolagem - folga[0] <= plena + 1 ? 0 : Math.max(0, Math.floor((rolagem - folga[0] + faixa.frente - bloco.y) / passo) - 2)
    const derradeira = Math.min(ultima, Math.floor((rolagem + folga[1] + faixa.inicio - bloco.y) / passo) + 2)
    const lista: [number, number][] = []
    for (let fatia = primeira; fatia <= derradeira; fatia++) {
      if (alcancavel(bloco, fatia, rolagem, folga)) lista.push([fatia, distancia(bloco, fatia, rolagem)])
    }
    return lista.sort((a, b) => a[1] - b[1])
  }

  /**
   * Põe as cópias (`tiras`, do bloco) nas fatias (`fatias`, com a distância de cada uma): as que já
   * mostram uma delas continuam nela; as outras passam às que faltam, das mais longe para as mais
   * perto; e só então se criam cópias novas. Fatias a até `urgencia` px de aparecer ganham cópia na
   * hora; as outras, só enquanto houver tempo no quadro (até `limite`). Devolve quantas cópias
   * foram criadas.
   */
  function distribuir(
    bloco: Bloco,
    tiras: Tira[],
    fatias: [number, number][],
    rolagem: number,
    folga: Folga,
    urgencia: number,
    modo: Modo,
    limite: number,
  ): number {
    let novas = 0
    const precisas = new Set(fatias.map(([fatia]) => fatia))
    const longe = (tira: Tira) => (tira.fatia < 0 ? Infinity : distancia(bloco, tira.fatia, rolagem))
    // da mais perto à mais longe: as últimas (pop) são as primeiras a mudar de fatia
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
        tira = criarTira(bloco, modo)
        tiras.push(tira)
        novas++
      }
      if (tira.velha) renovar(bloco, tira)
      mostrarFatia(bloco, tira, fatia)
      animar(bloco, tira)
    }
    // As que sobraram continuam prontas se a rolagem pode trazê-las de volta logo; as outras voltam
    // à reserva (veja completarReserva).
    for (const tira of livres) if (tira.fatia >= 0 && !alcancavel(bloco, tira.fatia, rolagem, folga, MANTER)) guardar(tira)
    return novas
  }

  /** Quantas cópias um bloco de `fatias` fatias usa ao mesmo tempo, no máximo, com a folga `folga`. */
  function copiasDoBloco(fatias: number, folga: Folga): number {
    const { faixa } = cena!
    return Math.min(fatias, Math.ceil((MANTER * (folga[0] + folga[1]) + faixa.inicio - faixa.frente) / passo) + 2)
  }

  /**
   * Completa o bloco até `alvo` cópias, criando as que faltam escondidas e sem animação (uma cópia
   * guardada não pesa na placa de vídeo nem na rolagem), enquanto houver tempo no quadro. Devolve
   * se ficou faltando alguma.
   */
  function completarReserva(bloco: Bloco, tiras: Tira[], alvo: number, modo: Modo, limite: number): boolean {
    while (tiras.length < alvo) {
      if (performance.now() > limite) return true
      const tira = criarTira(bloco, modo)
      tiras.push(tira)
      // travada só no próximo preparar, depois do primeiro layout (que fica guardado)
      porTravar.push(tira)
    }
    return false
  }

  /**
   * Apaga as cópias guardadas além de `guardadas` (as que mostram uma fatia ficam). Só para os
   * blocos que a rolagem deixou para trás: os que ela está para trazer só ganham cópias, senão
   * cada mudança de velocidade apagava e refazia dezenas delas.
   */
  function enxugarReserva(tiras: Tira[], guardadas: number) {
    let sobra = tiras.filter((tira) => tira.fatia < 0).length - guardadas
    for (let i = tiras.length - 1; i >= 0 && sobra > 0; i--) {
      const tira = tiras[i]
      if (tira && tira.fatia < 0) {
        descartar(tiras, tira)
        sobra--
      }
    }
  }

  /** Apaga a cópia de vez. */
  function descartar(tiras: Tira[], tira: Tira) {
    if (tira.animacao) relogio.soltar(tira.animacao)
    tira.animacao = null
    // (sem fatia, ela não ganha a animação que esperava, se esperava uma)
    tira.fatia = -1
    tira.caixa.remove()
    tiras.splice(tiras.indexOf(tira), 1)
  }

  /** As cópias que mostram o vídeo agora. */
  function tirasDoVideo(bloco: Bloco, video: Video): Tira[] {
    return bloco.tiras.filter((tira) => tira.fatia >= 0 && trechoDoVideo(video, ...trechoDaFatia(bloco, tira.fatia)))
  }

  /**
   * A cópia pode aparecer nos próximos quadros. As outras, preparadas com antecedência, ainda estão
   * escondidas abaixo da faixa (ou já foram engolidas): não precisam de cada quadro dos vídeos.
   */
  const pertoDeAparecer = (bloco: Bloco, tira: Tira) => distancia(bloco, tira.fatia, rolagemAtual) <= urgenciaAtual + PERTO

  /**
   * Copia o quadro da fonte para as cópias que mostram o vídeo e estão perto de aparecer: todas as
   * que aparecem ficam sempre no mesmo quadro. As outras recebem o quadro quando chegarem perto.
   */
  function pintarTodas(bloco: Bloco, video: Video, i: number) {
    for (const tira of tirasDoVideo(bloco, video)) {
      if (pertoDeAparecer(bloco, tira)) desenharTela(video, tira.telas[i], ...trechoDaFatia(bloco, tira.fatia))
      else tira.repintar = true
    }
  }

  /**
   * A cada quadro novo do vídeo (onde o navegador avisa), as cópias recebem esse mesmo quadro no
   * mesmo momento em que o original o mostra: não há uma linha em que a imagem pule de um quadro
   * para outro.
   */
  function vigiar(bloco: Bloco, video: Video, i: number) {
    if (!temQuadros || video.vigia) return
    const aoQuadro = () => {
      video.vigia = video.elemento.requestVideoFrameCallback(aoQuadro)
      if (!tirasDoVideo(bloco, video).length) return
      const tinha = video.pintada
      if (pintarFonte(video) || tinha) pintarTodas(bloco, video, i)
    }
    video.vigia = video.elemento.requestVideoFrameCallback(aoQuadro)
  }

  function soltarReferencia(bloco: Bloco) {
    bloco.referencia?.caixa.remove()
    bloco.referencia = null
  }

  function apagarTiras(bloco: Bloco) {
    for (const tira of [...bloco.tiras, ...bloco.frentes]) {
      if (tira.animacao) relogio.soltar(tira.animacao)
      tira.animacao = null
      tira.fatia = -1
    }
    bloco.tiras = []
    bloco.frentes = []
    soltarReferencia(bloco)
    bloco.grupo?.remove()
    bloco.grupo = null
    bloco.espelho.clear()
    for (const video of bloco.videos) soltarVideo(video)
  }

  /**
   * As cópias de cada bloco ficam juntas, numa caixa só delas dentro da camada. A cada quadro o
   * navegador olha de novo só as caixas em que algo mudou: com centenas de cópias soltas na camada,
   * cada mudança numa delas o fazia percorrer todas, a cada quadro, no estilo, no layout e na pintura.
   */
  function grupoDo(bloco: Bloco): HTMLDivElement {
    if (!bloco.grupo) {
      bloco.grupo = document.createElement('div')
      bloco.grupo.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;contain:layout style'
      obterCamada().append(bloco.grupo)
    }
    return bloco.grupo
  }

  /**
   * O bloco com o foco do teclado fica por cima da cortina, no lugar (quem navega pelo teclado
   * precisa vê-lo), e as cópias dele se escondem, até o foco sair.
   */
  function elevar(bloco: Bloco, sim: boolean) {
    if (bloco.linha || bloco.elevado === sim) return
    bloco.elevado = sim
    const estilo = bloco.elemento.style
    if (sim) {
      bloco.estiloAntes = [estilo.position, estilo.zIndex]
      if (getComputedStyle(bloco.elemento).position === 'static') estilo.position = 'relative'
      estilo.zIndex = '2'
    } else {
      ;[estilo.position, estilo.zIndex] = bloco.estiloAntes
    }
    for (const tira of [...bloco.tiras, ...bloco.frentes]) {
      if (tira.fatia >= 0) tira.caixa.style.translate = sim ? ESCONDIDA : ''
    }
  }

  /**
   * O mouse em cima (hover, e o clique) muda o original, mas não as cópias: ninguém está com o
   * mouse em cima delas. Enquanto o bloco está assim (e até ele voltar, com as transições), as
   * propriedades de ESTADO em que o original difere de uma cópia sem estados (a referência) são
   * postas em todas as cópias, a cada quadro: elas acompanham até as transições do original.
   */
  function espelhar(bloco: Bloco) {
    if (!bloco.espelho.size && !bloco.elemento.matches(':hover')) {
      soltarReferencia(bloco)
      return
    }
    bloco.referencia ??= criarTira(bloco, 'referencia')
    bloco.molde.pseudos ??= medirPseudos(bloco.elemento)
    // a referência acabou de ser clonada: a mesma estrutura do original, elemento a elemento
    const referencia = bloco.referencia.elementos
    const raizDaReferencia = bloco.referencia.clone
    const originais = comCaminhos(bloco.elemento)
    const mudancas: [string, string | null][] = []
    const comparar = (chave: string, valor: string, sem: string) => {
      const atual = bloco.espelho.get(chave)
      if (valor === sem) {
        if (atual === undefined) return
        bloco.espelho.delete(chave)
        mudancas.push([chave, null])
      } else if (valor !== atual) {
        bloco.espelho.set(chave, valor)
        mudancas.push([chave, valor])
      }
    }
    originais.forEach(([original, caminho], i) => {
      const copia = referencia[i]
      if (!copia) return
      const eo = getComputedStyle(original)
      const ec = getComputedStyle(copia)
      for (const propriedade of ESTADO) {
        // a posição do bloco é da conta das tiras (o original pode estar no meio da entrada)
        if (i === 0 && (propriedade === 'translate' || propriedade === 'transform')) continue
        comparar(`${caminho}|${propriedade}`, eo.getPropertyValue(propriedade), ec.getPropertyValue(propriedade))
      }
    })
    for (const [caminho, pseudo] of bloco.molde.pseudos) {
      const original = noCaminho(bloco.elemento, caminho)
      const copia = noCaminho(raizDaReferencia, caminho)
      if (!original || !copia) continue
      const eo = getComputedStyle(original, `::${pseudo}`)
      const ec = getComputedStyle(copia, `::${pseudo}`)
      for (const propriedade of ESTADO_PSEUDO) {
        comparar(`${caminho}|${pseudo}|${propriedade}`, eo.getPropertyValue(propriedade), ec.getPropertyValue(propriedade))
      }
    }
    // (as velhas recebem os estados ao ganhar o clone novo: a estrutura delas pode ser outra)
    for (const tira of [...bloco.tiras, ...bloco.frentes]) {
      if (!tira.velha) for (const [chave, valor] of mudancas) sobrescrever(tira.clone, chave, valor)
    }
  }

  /** As animações CSS das cópias novas (que começam do zero) passam a andar junto com as do original. */
  function sincronizarAnimacoes(bloco: Bloco, tiras: Tira[]) {
    const chaveDe = (animacao: Animation, posicoes: Map<Element, number>) => {
      const efeito = animacao.effect
      if (!(animacao instanceof CSSAnimation) || !(efeito instanceof KeyframeEffect) || !efeito.target) return null
      const posicao = posicoes.get(efeito.target)
      return posicao === undefined ? null : `${posicao}|${efeito.pseudoElement ?? ''}|${animacao.animationName}`
    }
    const originais = new Map(elementosDe(bloco.elemento).map((elemento, i): [Element, number] => [elemento, i]))
    const tempos = new Map<string, number>()
    for (const animacao of bloco.elemento.getAnimations({ subtree: true })) {
      const chave = chaveDe(animacao, originais)
      if (chave && animacao.currentTime !== null) tempos.set(chave, Number(animacao.currentTime))
    }
    for (const tira of tiras) {
      const posicoes = new Map(tira.elementos.map((elemento, i): [Element, number] => [elemento, i]))
      for (const animacao of tira.clone.getAnimations({ subtree: true })) {
        const chave = chaveDe(animacao, posicoes)
        const tempo = chave === null ? undefined : tempos.get(chave)
        if (tempo !== undefined) animacao.currentTime = tempo
      }
      tira.sincronizar = false
    }
  }

  function devolver(bloco: Bloco) {
    if (bloco.tiras.length || bloco.frentes.length || bloco.referencia || bloco.grupo) apagarTiras(bloco)
    elevar(bloco, false)
  }

  /** Os títulos fixos das seções param no alto da tela, dentro da faixa: ficam por cima da cortina. */
  function fixarPorCima(elementos: Set<HTMLElement>) {
    for (const [elemento, antes] of fixos) {
      if (elementos.has(elemento)) continue
      elemento.style.zIndex = antes
      fixos.delete(elemento)
    }
    for (const elemento of elementos) {
      if (fixos.has(elemento)) continue
      fixos.set(elemento, elemento.style.zIndex)
      elemento.style.zIndex = '2'
    }
  }

  function novoBloco(elemento: HTMLElement, medida: { x: number; y: number; largura: number; altura: number }, linha: boolean): Bloco {
    const videos = linha ? [] : medirVideos(elemento)
    return {
      elemento,
      linha,
      ...medida,
      videos,
      frente: linha ? null : medirFrente(elemento, videos),
      tiras: [],
      frentes: [],
      molde: linha ? MOLDE_VAZIO : medirMolde(elemento),
      espelho: new Map(),
      referencia: null,
      sujo: false,
      mudancas: [],
      trajetos: new Map(),
      elevado: false,
      estiloAntes: ['', ''],
      grupo: null,
    }
  }

  /** O bloco mudou de lugar na página (sem mudar de tamanho): as cópias continuam, com os trajetos refeitos. */
  function mover(bloco: Bloco, x: number, y: number) {
    if (bloco.x === x && bloco.y === y) return
    bloco.x = x
    bloco.y = y
    bloco.trajetos.clear()
    for (const tira of [...bloco.tiras, ...bloco.frentes]) if (tira.fatia >= 0) animar(bloco, tira)
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
      furoDaMascara = ''
      if (igual) {
        // Só o caminho mudou (a página mudou de altura): as cópias continuam, com trajetos novos.
        for (const bloco of blocos) {
          bloco.trajetos.clear()
          for (const tira of [...bloco.tiras, ...bloco.frentes]) if (tira.fatia >= 0) animar(bloco, tira)
        }
        animarPendentes()
        return
      }
      // tudo muda: as cópias são refeitas no próximo preparar (as que podem aparecer, na hora)
      for (const bloco of blocos) {
        devolver(bloco)
        bloco.trajetos.clear()
      }
      dpr = novoDpr
      pixelsDaFatia = Math.max(1, Math.round(FATIA * dpr))
      passo = pixelsDaFatia / dpr
      obterCamada().style.height = `${nova.faixa.inicio + ESPERA}px`
      if (entrada) relogio.soltar(entrada)
      entrada = null
      forcaDaMascara = Number.NaN
    },

    pendente: () => sujo || incompleto,

    medir() {
      // As medidas ignoram o efeito (o original nunca sai do lugar): as cópias continuam valendo
      // enquanto o bloco tem o mesmo tamanho.
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
            anterior.molde = medirMolde(elemento)
            const frente = medirFrente(elemento, anterior.videos)
            // o que fica na frente dos vídeos mudou: as cópias são refeitas
            if (String(frente?.elementos) !== String(anterior.frente?.elementos)) anterior.sujo = sujo = true
            anterior.frente = frente
            return anterior
          }
          if (anterior) devolver(anterior)
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
      for (const bloco of antes.values()) if (!atuais.has(bloco)) devolver(bloco)
      blocos = [...novos, ...linhas.values()]
      // os blocos que mudaram de lugar ganham trajetos novos
      animarPendentes()
    },

    preparar(rolagem, { folga, urgencia, orcamento, aquecer: [acima, abaixo], folgaMaxima }) {
      incompleto = false
      if (!cena) return 0
      const agora = performance.now()
      const limite = agora + orcamento
      limiteUrgente = agora + Math.max(orcamento, ORCAMENTO_URGENTE)
      rolagemAtual = rolagem
      urgenciaAtual = urgencia
      entrada ??= aparecerAoRolar(relogio, obterCamada())
      ajustarMascara(rolagem)
      // as cópias da reserva criadas no quadro anterior já têm layout: saem do trabalho do navegador
      for (const tira of porTravar) if (tira.fatia < 0 && tira.caixa.isConnected) travar(tira)
      porTravar = []
      if (sujo) {
        sujo = false
        for (const bloco of blocos) {
          if (!bloco.sujo) continue
          // o conteúdo mudou: as cópias ficam velhas e ganham clones novos (veja refazer)
          if (bloco.tiras.length || bloco.frentes.length) refazer(bloco)
          bloco.sujo = false
        }
      }
      // O foco de um clique (num botão, num link) não conta, só o do teclado: senão o bloco clicado
      // nunca seria absorvido.
      const focado = document.activeElement
      const doTeclado = focado instanceof Element && focado !== document.body && focado.matches(':focus-visible') ? focado : null
      let novas = 0
      /** Os blocos que a rolagem está para trazer à faixa, com a distância de cada um. */
      const quentes: [Bloco, number][] = []
      for (const bloco of blocos) {
        if (!bloco.linha) elevar(bloco, doTeclado !== null && bloco.elemento.contains(doTeclado))
        const quantas = quantasFatias(bloco)
        // o trecho da rolagem em que alguma fatia do bloco pode estar na faixa
        const comeco = trecho(bloco, 0)[0]
        const fim = trecho(bloco, quantas - 1)[1]
        const longe = comeco > rolagem ? comeco - rolagem : fim < rolagem ? rolagem - fim : 0
        const quente = fim >= rolagem - acima && comeco <= rolagem + abaixo
        const fatias = fim >= rolagem - folga[0] && comeco <= rolagem + folga[1] ? fatiasDaFolga(bloco, rolagem, folga) : []
        if (fatias.length) {
          novas += distribuir(bloco, bloco.tiras, fatias, rolagem, folga, urgencia, 'copia', limite)
          // as fatias com algo na frente dos vídeos ganham também uma frente
          const { frente: naFrente } = bloco
          novas += distribuir(
            bloco,
            bloco.frentes,
            naFrente
              ? fatias.filter(([fatia]) => {
                  const [de, ate] = trechoDaFatia(bloco, fatia)
                  return de < naFrente.ate && ate > naFrente.de
                })
              : [],
            rolagem,
            folga,
            urgencia,
            'frente',
            limite,
          )
          if (renovarVelhas(bloco, rolagem, urgencia, limite)) incompleto = true
        } else {
          // as cópias que a rolagem não pode trazer logo voltam à reserva
          for (const tira of [...bloco.tiras, ...bloco.frentes]) {
            if (tira.fatia >= 0 && !alcancavel(bloco, tira.fatia, rolagem, folga, MANTER)) guardar(tira)
          }
        }
        if (quente) {
          quentes.push([bloco, longe])
          continue
        }
        // Fora da faixa de aquecer, as cópias guardadas sobram: cada uma é um clone do bloco inteiro.
        // Só um pouco mais longe (um quarto da faixa) elas são apagadas, para um bloco na beira não
        // ganhar e perder cópias a cada passo da rolagem.
        const ativo = bloco.tiras.some((tira) => tira.fatia >= 0) || bloco.frentes.some((tira) => tira.fatia >= 0)
        const margem = (acima + abaixo) / 4
        const esquecido = fim < rolagem - acima - margem || comeco > rolagem + abaixo + margem
        if (ativo) {
          enxugarReserva(bloco.tiras, RESERVA)
          enxugarReserva(bloco.frentes, RESERVA)
        } else if (esquecido && (bloco.tiras.length || bloco.frentes.length || bloco.referencia)) {
          devolver(bloco)
        }
      }
      // Com o tempo que sobrou no quadro, os blocos que estão para chegar ganham, escondidas, todas
      // as cópias que vão usar, dos mais perto aos mais longe: quando a rolagem os trouxer, as cópias
      // só mudam de fatia, e nenhum quadro precisa fazer dezenas de uma vez.
      quentes.sort((a, b) => a[1] - b[1])
      for (const [bloco] of quentes) {
        const quantas = quantasFatias(bloco)
        if (completarReserva(bloco, bloco.tiras, copiasDoBloco(quantas, folgaMaxima), 'copia', limite)) incompleto = true
        const { frente: naFrente } = bloco
        const naFrenteQuantas = naFrente ? Math.ceil((naFrente.ate - naFrente.de) / passo) + 1 : 0
        if (completarReserva(bloco, bloco.frentes, Math.min(naFrenteQuantas, copiasDoBloco(quantas, folgaMaxima)), 'frente', limite)) {
          incompleto = true
        }
      }
      animarPendentes()
      return novas
    },

    acompanhar() {
      for (const bloco of blocos) {
        // só os blocos com alguma cópia que pode aparecer (os outros têm as cópias guardadas, prontas)
        const ativo = bloco.tiras.some((tira) => tira.fatia >= 0) || bloco.frentes.some((tira) => tira.fatia >= 0)
        if (bloco.linha || (!ativo && !bloco.espelho.size)) continue
        espelhar(bloco)
        if (!ativo) continue
        if (bloco.molde.animado) {
          const novas = [...bloco.tiras, ...bloco.frentes].filter((tira) => tira.sincronizar && tira.fatia >= 0)
          if (novas.length) sincronizarAnimacoes(bloco, novas)
        }
        // Vídeos: as telas já foram postas no lugar (posicionarTela) junto com o resto do estilo;
        // aqui só o desenho. Sem requestVideoFrameCallback, o quadro novo é descoberto aqui; e até o
        // vídeo ter o primeiro quadro (ele só carrega quando aparece na tela), tenta a cada vez.
        bloco.videos.forEach((video, i) => {
          const tinha = video.pintada
          const tempo = video.elemento.currentTime
          if (!tinha || (!temQuadros && tempo !== video.tempo)) {
            video.tempo = tempo
            if (pintarFonte(video) || tinha) {
              pintarTodas(bloco, video, i)
              return
            }
          }
          for (const tira of bloco.tiras) {
            if (tira.repintar && tira.fatia >= 0 && pertoDeAparecer(bloco, tira)) {
              desenharTela(video, tira.telas[i], ...trechoDaFatia(bloco, tira.fatia))
            }
          }
        })
        // as que ainda estão longe recebem o quadro quando chegarem perto
        for (const tira of bloco.tiras) if (tira.fatia < 0 || pertoDeAparecer(bloco, tira)) tira.repintar = false
      }
    },

    limpar() {
      for (const bloco of blocos) devolver(bloco)
      fixarPorCima(new Set())
      vigiaConteudo.disconnect()
      if (entrada) relogio.soltar(entrada)
      entrada = null
      camada?.remove()
      camada = null
      porAnimar.length = 0
      porTravar = []
      sujo = false
      incompleto = false
    },
  }
}
