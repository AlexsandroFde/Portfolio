// Absorção: o conteúdo que sobe até perto do buraco negro é puxado até ele e engolido, e é cuspido
// de volta quando a página sobe. Quanto ele já foi absorvido depende só de onde ele está na tela:
// rolando devagar ou rápido, com a roda ou não, o efeito é o mesmo, e com a página parada o que
// estava no meio do caminho continua ali.
//
// O efeito acontece numa faixa estreita no alto da tela (veja Faixa). Cada linha horizontal do
// conteúdo que entra nela é puxada no seu ritmo, devagar no começo e cada vez mais rápido: quanto
// mais alto ela está, mais perto do buraco negro já chegou, mais estreita e mais apagada ficou (ela
// esmaece na medida em que se estreita). As linhas de cima vão na frente e as de baixo ainda estão
// presas à página: o conteúdo se alonga numa tira contínua que sai da página e entra no buraco
// negro, a "espaguetificação" de quem cai num, sumindo aos poucos até cruzar a borda da sombra (o
// horizonte). Um bloco alto (um cartão de projeto) não espera chegar inteiro: só o trecho dele que
// já está na faixa é puxado, e o resto continua no lugar até a sua vez.
//
// Uma transformação CSS deforma o elemento inteiro de um jeito só, então o trecho na faixa é
// desenhado por cópias do bloco, uma para cada fatia fina dele, cada uma recortada na sua fatia e
// com o seu trapézio. As bordas de fatias vizinhas coincidem, e a tira sai contínua. O bloco
// original não sai do lugar: uma máscara esconde nele o trecho que as cópias desenham. As cópias
// ficam numa camada fora do app, sem foco, clique ou leitor de tela, que anda junto com a página
// (veja obterCamada), e acompanham o original em tudo o que muda sem rolagem: o quadro dos vídeos,
// o mouse em cima, as animações e o que o React redesenhar dentro do bloco. Assim nada se parte
// entre o original e a tira.
//
// Tudo muda de forma contínua com a rolagem (nada salta nem acende de uma vez), para a absorção
// correr fluida mesmo com a roda do mouse, que rola aos trancos.
//
// Os blocos são os que já têm animação de entrada ([data-reveal] e .enter).

/** O buraco negro neste quadro, na tela (px CSS). */
export interface Alvo {
  x: number
  y: number
  /** Raio da sombra. */
  raio: number
}

/**
 * A faixa da tela em que o conteúdo é absorvido: ele começa a ser puxado quando sobe até `inicio`
 * e chega ao buraco negro em `frente`. Acima de `frente` só fica o buraco negro.
 */
export interface Faixa {
  frente: number
  inicio: number
}

export interface Absorcao {
  /** Mede os blocos de novo (depois de mudanças no layout). */
  medir(): void
  /**
   * Aplica o efeito. `forca` vai de 0 (nada é puxado, como no topo da página) a 1; `rolagem` é o
   * scrollY. Devolve quantas cópias novas foram criadas (depois de um salto, muitas: o quadro pesa
   * mais que os de rolar).
   */
  atualizar(alvo: Alvo, faixa: Faixa, rolagem: number, forca: number): number
  /** Algo mudou dentro de um bloco sendo absorvido: chame atualizar mesmo sem rolagem. */
  pendente(): boolean
  /** A cada quadro, depois de atualizar: leva às cópias o que mudou no original sem rolagem. */
  acompanhar(): void
  /** Devolve todos os blocos ao lugar e apaga as cópias. */
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
  /** As telas mudaram de lugar e precisam ser desenhadas de novo. */
  repintar: boolean
  /** As animações CSS precisam ser acertadas pelas do original (cópia nova). */
  sincronizar: boolean
  transform: string
}

/**
 * O que o original desenha na frente dos vídeos (o botão de pausa). As telas dos vídeos ficam por
 * cima do clone de cada cópia, então nele isso fica escondido, e cópias à parte (as frentes) o
 * mostram por cima das telas.
 */
interface Frente {
  /** Os elementos, pela posição (veja elementosDe). */
  elementos: number[]
  /** O trecho do bloco que eles ocupam (px CSS a partir do alto dele). */
  de: number
  ate: number
}

interface Bloco {
  elemento: HTMLElement
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
  /** A máscara que esconde no original o trecho desenhado pelas cópias ('' com ele inteiro à vista). */
  recorte: string
  /** O que as cópias precisam saber do original. */
  molde: Molde
  /** Os estados do original postos nas cópias agora (veja espelhar): chave (veja sobrescrever) → valor. */
  espelho: Map<string, string>
  /** Uma cópia escondida e sem esses estados: mostra como o bloco fica sem eles. */
  referencia: Tira | null
  /** O React mudou algo dentro do bloco: as cópias precisam ser refeitas. */
  sujo: boolean
}

interface Molde {
  /** Os estilos que o original herda dos ancestrais (as cópias ficam fora deles). */
  herdados: [string, string][]
  /** Os elementos com backdrop-filter, pela posição (veja elementosDe). */
  desfoques: number[]
  /** Os elementos com ::before ou ::after desenhado, pela posição (medidos só quando espelhar precisa). */
  pseudos: [number, 'before' | 'after'][] | null
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

/** Uma fatia do bloco (a de número `fatia`) e para onde vão as suas bordas. */
interface Fatia {
  fatia: number
  cima: Linha
  baixo: Linha
}

const SELETOR = 'main [data-reveal], main .enter'

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
/** Máscara que esconde o bloco inteiro. */
const OCULTO = 'linear-gradient(transparent, transparent)'
/** Em quantos pontos da faixa a máscara do esmaecimento é medida (entre eles, ela vai em linha reta). */
const PARADAS = 12

/**
 * O esmaecimento ao longo da distorção, como máscara da camada das cópias (de cima para baixo, em
 * px da tela): cada linha do conteúdo fica tão transparente quanto já se estreitou a caminho do
 * buraco negro (veja linha em atualizar), inteira na borda de baixo da faixa e sumindo perto do
 * centro dele. Basta a altura: a de cada linha na tela diz o quanto ela já foi puxada, qualquer que
 * seja o bloco. Muda só com a faixa (e com a força, no começo da página), não com a rolagem.
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
        indices.add(i)
        de = Math.min(de, q.top - caixa.top)
        ate = Math.max(ate, q.bottom - caixa.top)
      }
    }
  }
  return indices.size ? { elementos: [...indices], de, ate } : null
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

/** Os elementos do bloco que desenham ::before ou ::after. */
function medirPseudos(elemento: HTMLElement): [number, 'before' | 'after'][] {
  const pseudos: [number, 'before' | 'after'][] = []
  elementosDe(elemento).forEach((filho, i) => {
    for (const pseudo of ['before', 'after'] as const) {
      const conteudo = getComputedStyle(filho, `::${pseudo}`).content
      if (conteudo && conteudo !== 'none' && conteudo !== 'normal') pseudos.push([i, pseudo])
    }
  })
  return pseudos
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
 * Põe (ou tira, com `valor` null) um estado do original num elemento da cópia. A chave é
 * "posição|propriedade" ou, num pseudoelemento, "posição|before|propriedade" (via variável e
 * atributo, que as REGRAS_PSEUDO aplicam).
 */
function sobrescrever(elementos: Element[], chave: string, valor: string | null) {
  const [posicao, a, b] = chave.split('|')
  const elemento = elementos[Number(posicao)] as (Element & ElementCSSInlineStyle) | undefined
  if (!elemento) return
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

export function criarAbsorcao(): Absorcao {
  let blocos: Bloco[] = []
  let camada: HTMLDivElement | null = null
  /** A máscara posta na camada agora (a sombra e o esmaecimento). */
  let mascaraDaCamada = ''
  let pendente = false
  /** A altura das fatias (px CSS): FATIA arredondada a pixels inteiros da tela (veja atualizar). */
  let passo = FATIA

  /** O trecho do bloco (px CSS a partir do alto dele) que a fatia mostra. */
  const trechoDaFatia = (bloco: Bloco, fatia: number): [number, number] => [fatia * passo, Math.min((fatia + 1) * passo, bloco.altura)]
  /** Um tamanho (px CSS) arredondado para cima a pixels inteiros da tela. */
  const emPixels = (v: number) => {
    const dpr = window.devicePixelRatio || 1
    return Math.ceil(v * dpr - 1e-6) / dpr
  }

  // O React redesenhou algo dentro de um bloco sendo absorvido (o ícone de um vídeo que pausou, o
  // relógio do contato): as cópias dele são refeitas. Os estilos que este efeito põe no original
  // (atributo style) e a entrada dos blocos (data-revealed) não contam.
  const vigiaConteudo = new MutationObserver((registros) => {
    for (const { target } of registros) {
      const bloco = blocos.find((outro) => outro.tiras.length && outro.elemento.contains(target))
      if (bloco) bloco.sujo = pendente = true
    }
  })

  /**
   * A camada das cópias, acima da página e abaixo do cabeçalho, cobrindo o alto da tela. Ela não é
   * fixa: fica na página, levada a cada quadro para o alto da tela (veja atualizar). A rolagem corre
   * fora do JavaScript e chega a andar um quadro ou mais à frente dele; uma camada fixa ficaria
   * para trás, e rolando rápido as cópias se descolavam do original na emenda. Assim elas andam
   * junto com ele, rolando rápido ou devagar, com a roda ou não.
   */
  function obterCamada(): HTMLDivElement {
    if (!camada) {
      camada = document.createElement('div')
      camada.className = 'print-hidden'
      camada.setAttribute('aria-hidden', 'true')
      camada.setAttribute('data-copias-buraco-negro', '')
      camada.inert = true
      camada.style.cssText =
        'position:absolute;left:0;top:0;width:100%;overflow:hidden;z-index:40;pointer-events:none;user-select:none;overflow-anchor:none;will-change:transform'
      const regras = document.createElement('style')
      regras.textContent = REGRAS_PSEUDO
      camada.append(regras)
      document.body.append(camada)
      mascaraDaCamada = ''
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

  /** O clone do bloco para uma cópia: fora a referência, já com os estados que o original tem agora. */
  function montarClone(bloco: Bloco, modo: Modo) {
    const clone = bloco.elemento.cloneNode(true) as HTMLElement
    const todos = elementosDe(clone)
    // sem ids repetidos, sem as animações de entrada e sem a máscara do original
    for (const elemento of todos) {
      elemento.removeAttribute('id')
      elemento.removeAttribute('data-reveal')
      elemento.removeAttribute('data-revealed')
      elemento.classList.remove('enter')
    }
    clone.removeAttribute('style')
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
    if (modo !== 'referencia') for (const [chave, valor] of bloco.espelho) sobrescrever(elementos, chave, valor)
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
    caixa.style.cssText = 'position:absolute;left:0;top:0;contain:size layout style;transform-origin:0 0;will-change:transform'
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
    obterCamada().append(caixa)
    return { caixa, clone, elementos, telas, modo, fatia: -1, repintar: false, sincronizar: bloco.molde.animado, transform: '' }
  }

  /**
   * O React mudou algo dentro do bloco (o ícone de um vídeo que pausou, o relógio do contato): cada
   * cópia ganha um clone novo, no mesmo lugar. As telas dos vídeos, fora do clone, continuam com o
   * quadro.
   */
  function refazer(bloco: Bloco) {
    soltarReferencia(bloco)
    // a estrutura pode ter mudado: os estados do mouse e o que fica na frente dos vídeos são medidos de novo
    bloco.espelho.clear()
    bloco.molde = medirMolde(bloco.elemento)
    bloco.frente = medirFrente(bloco.elemento, bloco.videos)
    for (const tira of [...bloco.tiras, ...bloco.frentes]) {
      const novo = montarClone(bloco, tira.modo)
      novo.clone.style.top = tira.clone.style.top
      tira.clone.replaceWith(novo.clone)
      Object.assign(tira, novo, { sincronizar: bloco.molde.animado })
    }
  }

  function mostrarFatia(bloco: Bloco, tira: Tira, fatia: number) {
    tira.fatia = fatia
    const [de, ate] = trechoDaFatia(bloco, fatia)
    // A caixa tem pixels inteiros da tela (a última fatia do bloco, mais baixa, sobra um pouco: o
    // trapézio é o da altura dela, veja ajustar). Com uma fração de pixel, a camada da cópia
    // passaria meio pixel da borda de baixo, uma linha apagada sobre o que vem embaixo dela.
    tira.caixa.style.height = `${emPixels(ate - de)}px`
    tira.caixa.style.visibility = ''
    tira.clone.style.top = `${-de}px`
    bloco.videos.forEach((video, i) => {
      const tela = tira.telas[i]
      if (!tela) return
      if (trechoDoVideo(video, de, ate)) vigiar(bloco, video, i)
      posicionarTela(video, tela, de, ate)
    })
    tira.repintar = tira.telas.some(Boolean)
  }

  /** Leva a cópia ao trapézio da sua fatia. */
  function ajustar(bloco: Bloco, tira: Tira, { fatia, cima, baixo }: Fatia) {
    const [de, ate] = trechoDaFatia(bloco, fatia)
    const transform = trapezio(bloco.largura, ate - de, cima, baixo)
    if (transform !== tira.transform) tira.caixa.style.transform = tira.transform = transform
  }

  /**
   * Põe as cópias (`tiras`, do bloco) nas fatias: as que já mostram uma delas continuam nela; as
   * outras passam às que faltam, e só então se criam cópias novas. Todas no mesmo quadro: uma fatia
   * sem cópia seria um buraco na tira. Devolve quantas foram criadas.
   */
  function distribuir(bloco: Bloco, tiras: Tira[], fatias: Fatia[], modo: Modo): number {
    let novas = 0
    const precisas = new Set(fatias.map(({ fatia }) => fatia))
    const livres = tiras.filter((tira) => !precisas.has(tira.fatia))
    for (const item of fatias) {
      let tira = tiras.find((outra) => outra.fatia === item.fatia)
      if (!tira) {
        tira = livres.pop()
        if (!tira) {
          tira = criarTira(bloco, modo)
          tiras.push(tira)
          novas++
        }
        mostrarFatia(bloco, tira, item.fatia)
      }
      ajustar(bloco, tira, item)
    }
    // as que sobraram ficam guardadas, prontas (com display: none, voltar custaria refazer o estilo e o layout delas)
    for (const tira of livres) {
      if (tira.fatia < 0) continue
      tira.fatia = -1
      tira.caixa.style.visibility = 'hidden'
    }
    return novas
  }

  /** As cópias que mostram o vídeo agora. */
  function tirasDoVideo(bloco: Bloco, video: Video): Tira[] {
    return bloco.tiras.filter((tira) => tira.fatia >= 0 && trechoDoVideo(video, ...trechoDaFatia(bloco, tira.fatia)))
  }

  /** Copia o quadro da fonte para todas as cópias que mostram o vídeo: todas ficam sempre no mesmo quadro. */
  function pintarTodas(bloco: Bloco, video: Video, i: number) {
    for (const tira of tirasDoVideo(bloco, video)) {
      desenharTela(video, tira.telas[i], ...trechoDaFatia(bloco, tira.fatia))
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
    for (const tira of [...bloco.tiras, ...bloco.frentes]) tira.caixa.remove()
    bloco.tiras = []
    bloco.frentes = []
    soltarReferencia(bloco)
    bloco.espelho.clear()
    for (const video of bloco.videos) soltarVideo(video)
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
    if (!bloco.referencia) {
      bloco.referencia = criarTira(bloco, 'referencia')
      bloco.referencia.caixa.style.visibility = 'hidden'
      bloco.referencia.caixa.style.willChange = 'auto'
    }
    bloco.molde.pseudos ??= medirPseudos(bloco.elemento)
    const referencia = bloco.referencia.elementos
    const originais = elementosDe(bloco.elemento)
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
    originais.forEach((original, i) => {
      const copia = referencia[i]
      if (!copia) return
      const eo = getComputedStyle(original)
      const ec = getComputedStyle(copia)
      for (const propriedade of ESTADO) {
        // a posição do bloco é da conta das tiras (o original pode estar no meio da entrada)
        if (i === 0 && (propriedade === 'translate' || propriedade === 'transform')) continue
        comparar(`${i}|${propriedade}`, eo.getPropertyValue(propriedade), ec.getPropertyValue(propriedade))
      }
    })
    for (const [i, pseudo] of bloco.molde.pseudos) {
      const original = originais[i]
      const copia = referencia[i]
      if (!original || !copia) continue
      const eo = getComputedStyle(original, `::${pseudo}`)
      const ec = getComputedStyle(copia, `::${pseudo}`)
      for (const propriedade of ESTADO_PSEUDO) {
        comparar(`${i}|${pseudo}|${propriedade}`, eo.getPropertyValue(propriedade), ec.getPropertyValue(propriedade))
      }
    }
    for (const tira of [...bloco.tiras, ...bloco.frentes]) for (const [chave, valor] of mudancas) sobrescrever(tira.elementos, chave, valor)
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

  /**
   * Esconde no original o trecho que as cópias desenham. Com uma máscara, e não com clip-path: o
   * clip-path conta para o IntersectionObserver, e o vídeo de um cartão pausaria sozinho no meio da
   * absorção. Enquanto mascarado, o bloco fica numa camada própria: a máscara muda a cada fatia, e
   * sem a camada o bloco inteiro (imagens e tudo) seria pintado de novo a cada vez.
   */
  function recortar(bloco: Bloco, recorte: string) {
    if (recorte === bloco.recorte) return
    bloco.recorte = recorte
    const estilo = bloco.elemento.style
    estilo.maskImage = recorte
    estilo.webkitMaskImage = recorte
    estilo.willChange = recorte ? 'transform' : ''
  }

  function devolver(bloco: Bloco) {
    if (bloco.tiras.length || bloco.frentes.length || bloco.referencia) apagarTiras(bloco)
    recortar(bloco, '')
  }

  return {
    limpar() {
      for (const bloco of blocos) devolver(bloco)
      vigiaConteudo.disconnect()
      camada?.remove()
      camada = null
      pendente = false
    },

    pendente: () => pendente,

    medir() {
      // As medidas ignoram o efeito, então os blocos não precisam voltar ao lugar para serem medidos
      // (isso faria o efeito piscar no meio da rolagem). As cópias continuam valendo enquanto o
      // bloco tem o mesmo tamanho.
      const antes = new Map(blocos.map((bloco) => [bloco.elemento, bloco]))
      const elementos = [...document.querySelectorAll<HTMLElement>(SELETOR)]
      blocos = elementos
        .filter(
          (elemento) =>
            // os títulos fixos das seções ficam parados no alto da tela: seriam engolidos o tempo todo
            getComputedStyle(elemento).position !== 'sticky' &&
            // um bloco dentro de outro já é absorvido junto com ele
            !elementos.some((outro) => outro !== elemento && outro.contains(elemento)),
        )
        .map((elemento): Bloco => {
          const medida = medirBloco(elemento)
          const anterior = antes.get(elemento)
          const molde = medirMolde(elemento)
          if (anterior && anterior.largura === medida.largura && anterior.altura === medida.altura) {
            anterior.x = medida.x
            anterior.y = medida.y
            anterior.molde = molde
            const frente = medirFrente(elemento, anterior.videos)
            // o que fica na frente dos vídeos mudou: as cópias são refeitas
            if (String(frente?.elementos) !== String(anterior.frente?.elementos)) anterior.sujo = pendente = true
            anterior.frente = frente
            return anterior
          }
          if (anterior) apagarTiras(anterior)
          const videos = medirVideos(elemento)
          return {
            elemento,
            ...medida,
            videos,
            frente: medirFrente(elemento, videos),
            tiras: [],
            frentes: [],
            recorte: anterior?.recorte ?? '',
            molde,
            espelho: new Map(),
            referencia: null,
            sujo: false,
          }
        })
        // elementos ocultos neste tamanho de tela não têm o que absorver
        .filter((bloco) => bloco.largura > 0 && bloco.altura > 0)

      // o que deixou de ser bloco (um título que passou a ficar fixo, por exemplo) volta ao lugar
      const atuais = new Set(blocos)
      for (const bloco of antes.values()) if (!atuais.has(bloco)) devolver(bloco)
    },

    atualizar(alvo, { frente, inicio }, rolagem, forca) {
      pendente = false
      if (forca < 0.004) {
        for (const bloco of blocos) devolver(bloco)
        return 0
      }
      let novas = 0

      const dpr = window.devicePixelRatio || 1
      // Fatias com um número inteiro de pixels da tela: as que ainda não se deformaram mostram o
      // conteúdo pixel a pixel como o original, sem reamostrar. (Com o zoom mudando, as cópias
      // são refeitas.)
      const novoPasso = Math.max(1, Math.round(FATIA * dpr)) / dpr
      if (novoPasso !== passo) {
        for (const bloco of blocos) devolver(bloco)
        passo = novoPasso
      }
      const banda = Math.max(1, inicio - frente)
      // A linha que chega ao fim da faixa desce até a altura do buraco negro. As de baixo descem
      // menos, na proporção do progresso, e nenhuma passa da que vem antes dela.
      const queda = alvo.y - frente
      // as bordas entre fatias ficam em pixels inteiros da tela: sem a suavização das bordas, não aparecem as emendas
      const alinhar = (v: number) => Math.round(v * dpr) / dpr
      // Um bloco com o foco do teclado fica no lugar (quem navega pelo teclado precisa vê-lo). O
      // foco de um clique (num botão, num link) não conta: senão o bloco nunca seria absorvido.
      const focado = document.activeElement
      const doTeclado = focado instanceof Element && focado !== document.body && focado.matches(':focus-visible') ? focado : null
      /** Um ponto está dentro da sombra, onde a camada das cópias não mostra nada? */
      const naSombra = (x: number, y: number) => Math.hypot(x - alvo.x, y - alvo.y) <= alvo.raio

      for (const bloco of blocos) {
        const topo = bloco.y - rolagem
        const base = topo + bloco.altura
        // ainda abaixo da faixa, já fora da tela por cima (mesmo descendo até a altura do buraco
        // negro) ou com o foco do teclado dentro: fica no lugar
        if (topo >= inicio || base + Math.max(0, queda) <= 0 || (doTeclado && bloco.elemento.contains(doTeclado))) {
          devolver(bloco)
          continue
        }
        if (bloco.sujo) {
          // o conteúdo mudou: clones novos nas cópias, na hora (a máscara do original continua, nada pisca)
          refazer(bloco)
          bloco.sujo = false
        }

        const centro = bloco.x + bloco.largura / 2
        /** Para onde vai a linha do bloco que estaria na altura y da tela. */
        const linha = (y: number): Linha => {
          const q = forca * clamp01((inicio - y) / banda)
          const k = q ** ACELERACAO
          const meio = centro + k * (alvo.x - centro)
          const meia = Math.max(FIO, bloco.largura * (1 - k)) / 2
          return { esquerda: meio - meia, direita: meio + meia, y: alinhar(y + q * q * queda), q }
        }

        // A fatia em que fica o começo da faixa é a última desenhada pelas cópias; abaixo dela, o
        // original. Daí para cima, até o que já foi engolido ou saiu da tela. Uma fatia que já está
        // inteira dentro da sombra não aparece: não precisa de cópia.
        const ultima = Math.min(Math.ceil(bloco.altura / passo) - 1, Math.floor((inicio - topo) / passo))
        let baixo = linha(topo + trechoDaFatia(bloco, ultima)[1])
        // O original volta a aparecer na borda de baixo da última fatia, que ainda está no lugar (só
        // no fim do bloco ela pode já ter sido puxada: aí o original some inteiro). A máscara muda só
        // quando muda a fatia, e não a cada quadro: cada mudança obriga a placa de vídeo a desenhar
        // de novo a máscara do bloco inteiro, e rolando sem parar ela não dava conta.
        const corte = baixo.q > 0 ? bloco.altura : trechoDaFatia(bloco, ultima)[1]
        const fatias: Fatia[] = []
        for (let fatia = ultima; fatia >= 0 && baixo.y > 0 && baixo.q < 1; fatia--) {
          const cima = linha(topo + fatia * passo)
          const engolida =
            naSombra(cima.esquerda, cima.y) && naSombra(cima.direita, cima.y) && naSombra(baixo.esquerda, baixo.y) && naSombra(baixo.direita, baixo.y)
          if (cima.y < baixo.y && !engolida) fatias.push({ fatia, cima, baixo })
          baixo = cima
        }

        novas += distribuir(bloco, bloco.tiras, fatias, 'copia')
        // as fatias com algo na frente dos vídeos ganham também uma frente
        const { frente: naFrente } = bloco
        novas += distribuir(
          bloco,
          bloco.frentes,
          naFrente
            ? fatias.filter(({ fatia }) => {
                const [de, ate] = trechoDaFatia(bloco, fatia)
                return de < naFrente.ate && ate > naFrente.de
              })
            : [],
          'frente',
        )

        recortar(bloco, corte >= bloco.altura - 0.01 ? OCULTO : `linear-gradient(transparent ${corte}px, #000 ${corte}px)`)
      }

      if (camada) {
        // no alto da tela desta rolagem (veja obterCamada), da altura da faixa
        camada.style.transform = `translate3d(0,${rolagem}px,0)`
        const altura = `${Math.ceil(inicio + 2 * passo)}px`
        if (camada.style.height !== altura) camada.style.height = altura
        // A sombra apaga o que entra nela, e antes disso o conteúdo vai esmaecendo pelo caminho. (A
        // força só muda no começo da página: em degraus, para a máscara não mudar a cada quadro.)
        const furo = `radial-gradient(circle at ${alvo.x}px ${alvo.y}px, transparent ${alvo.raio}px, #000 ${alvo.raio * HORIZONTE + 1}px)`
        const mascara = `${furo}, ${esmaecimento({ frente, inicio }, queda, Math.round(forca * 20) / 20)}`
        if (mascara !== mascaraDaCamada) {
          mascaraDaCamada = mascara
          camada.style.maskImage = mascara
          camada.style.webkitMaskImage = mascara
          // a máscara é o que as duas deixam passar
          camada.style.setProperty('-webkit-mask-composite', 'source-in')
          camada.style.maskComposite = 'intersect'
        }
      }
      return novas
    },

    acompanhar() {
      for (const bloco of blocos) {
        if (!bloco.tiras.length) continue
        espelhar(bloco)
        const novas = [...bloco.tiras, ...bloco.frentes].filter((tira) => tira.sincronizar)
        if (novas.length) sincronizarAnimacoes(bloco, novas)
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
            if (tira.repintar && tira.fatia >= 0) {
              desenharTela(video, tira.telas[i], ...trechoDaFatia(bloco, tira.fatia))
            }
          }
        })
        for (const tira of bloco.tiras) tira.repintar = false
      }
    },
  }
}
