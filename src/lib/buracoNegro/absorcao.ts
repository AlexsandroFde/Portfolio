// Absorção: o conteúdo que sobe até perto do buraco negro é esticado para dentro do disco e se
// desfaz nele, e é cuspido de volta quando a página sobe. Quanto ele já foi absorvido depende só
// de onde ele está na tela: rolando devagar o efeito é o mesmo, e com a página parada o que estava
// no meio do caminho continua ali, sendo absorvido.
//
// A página é tratada como a continuação do plano do disco, visto em perspectiva. Cada bloco de
// conteúdo é um retângulo nesse plano, e cada borda dele (a de cima e a de baixo) é puxada no seu
// ritmo na direção de um trecho de órbita do disco. A borda de cima vai antes, enquanto a de baixo
// ainda está presa à página: o bloco se alonga entre as duas, a "espaguetificação" de quem cai num
// buraco negro, em que a ponta mais próxima é puxada com mais força. O que está perto do disco
// chega a ele; o que está longe anda só um trecho (veja CURSO). A
// parte puxada se desfaz e o shader continua o movimento com filamentos de matéria no mesmo
// plano, que entram no disco, esquentam o gás e passam a girar com ele (os "fluxos"). Um bloco
// alto sobe inteiro e só a parte dele que entra na faixa se desfaz, até a borda de baixo chegar
// perto: o efeito fica no alto da tela (veja ALCANCE).
//
// Tudo muda de forma contínua com a rolagem (nada salta nem acende de uma vez), para a absorção
// correr fluida mesmo com a roda do mouse, que rola aos trancos.
//
// Os blocos são os que já têm animação de entrada ([data-reveal] e .enter).

import { DIRECOES, type Fluxos } from './renderizador.ts'

/** O buraco negro neste quadro, na tela (px CSS). */
export interface Alvo {
  x: number
  y: number
  /** Raio da sombra. */
  raio: number
  /** Ângulo da câmera acima do plano do disco (rad). */
  inclinacao: number
  /** Rotação da imagem na tela (rad). */
  giro: number
  /** Sentido do giro do disco na tela: -1 anti-horário, 1 horário. */
  sentido: number
}

/**
 * A faixa da tela em que o conteúdo é absorvido: ele começa a ser puxado quando sobe até `inicio`
 * e é engolido por inteiro em `frente`. Acima de `frente` só fica o buraco negro.
 */
export interface Faixa {
  frente: number
  inicio: number
}

export interface Absorcao {
  /** A matéria que o shader desenha caindo no disco, atualizada a cada quadro. */
  readonly fluxos: Fluxos
  /** Mede os blocos de novo (depois de mudanças no layout). */
  medir(): void
  /**
   * Aplica o efeito. `forca` vai de 0 (nada é puxado, como no topo da página) a 1; `rolagem` é o
   * scrollY.
   */
  atualizar(alvo: Alvo, faixa: Faixa, rolagem: number, forca: number): void
  /** Devolve todos os blocos ao lugar. */
  limpar(): void
  /**
   * Roda `medida` com os blocos no lugar, sem que isso apareça na tela (as deformações voltam
   * antes do próximo quadro). Para medir o layout real no meio da absorção.
   */
  semEfeito<T>(medida: () => T): T
}

interface Bloco {
  elemento: HTMLElement
  // posição e tamanho na página, sem transformações
  x: number
  y: number
  largura: number
  altura: number
  afetado: boolean
}

type Ponto = readonly [number, number]

/**
 * Transformação projetiva do quadrado unitário num quadrilátero:
 * (u, v) → ((m0·u + m1·v + m2) / w, (m3·u + m4·v + m5) / w), com w = m6·u + m7·v + 1.
 */
type Projecao = readonly [number, number, number, number, number, number, number, number]
const IDENTIDADE: Projecao = [1, 0, 0, 0, 1, 0, 0, 0]
/** A maior razão aceita entre os divisores da projeção nos cantos do bloco (ver projetar). */
const PERSPECTIVA_MAXIMA = 6

const SELETOR = 'main [data-reveal], main .enter'
const TAU = Math.PI * 2

/** O nó é um bloco de conteúdo, ou tem blocos dentro? (Para saber se uma mudança na página pede novas medidas.) */
export function temBlocos(no: Node): boolean {
  return no instanceof Element && (no.matches('[data-reveal], .enter') || no.querySelector('[data-reveal], .enter') !== null)
}

// As mesmas medidas do shader (buracoNegro.frag), em raios de Schwarzschild.
const SOMBRA = 2.5980762
const R_FORA = 10
/** Quanto as linhas de corrente dos filamentos entortam no sentido da rotação até a borda do disco (rad). */
const GANCHO = 0.45
/**
 * Quanto a borda de um bloco é arrastada no sentido da rotação ao chegar ao disco (rad). Pouco: no
 * canto da tela, arrastar mais levaria o conteúdo para a frente do disco, que fica mais abaixo,
 * através da página.
 */
const ARRASTO = 0.12
/** O conteúdo chega um pouco para dentro da borda do disco (fração do raio dela). */
const CHEGADA = 0.96
/** O que já está sobre o disco mergulha nele: vai para esta fração da distância ao centro. */
const MERGULHO = 0.55
/**
 * Em que progresso (0 a 1) o conteúdo começa a se desfazer, e em qual já sumiu. Some antes de
 * chegar ao disco: lá o texto estaria tão achatado que viraria um tracejado serrilhado, e quem
 * faz esse trecho final são os filamentos do shader.
 */
const DESFAZ = { de: 0.3, ate: 0.76 }
/**
 * Até quanto abaixo do começo da faixa um bloco pode se deformar, em frações da altura dela. Um
 * bloco mais alto que isso (um cartão de projeto) sobe sem se deformar, e só a parte dele que entra
 * na faixa se desfaz: as bordas são puxadas só quando a de baixo chega perto. Senão ele se
 * inclinaria inteiro, tomando boa parte da tela, quando só o alto dela deve ser engolido.
 */
const ALCANCE = 0.7
/**
 * Quanto cada borda pode andar em direção ao disco, em frações da altura da faixa. O canto da tela
 * fica longe da maior parte da página: sem limite, o conteúdo da esquerda cruzaria a tela inteira
 * enquanto a página rola só a altura da faixa, rápido demais para o olho acompanhar (parece
 * piscar). Com ele, o que está longe só se estica na direção do buraco negro e se desfaz no meio do
 * caminho, e os filamentos levam o resto até o disco.
 */
const CURSO = 1.6

/**
 * Pontos por bloco na linha de onde saem os filamentos: vários em cada direção, mesmo num bloco que
 * cobre meia volta em torno do buraco negro, para a cobertura não oscilar enquanto eles andam.
 */
const AMOSTRAS = 160

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Mistura cada direção com as duas vizinhas (1/4, 1/2, 1/4), em volta do círculo. */
const copiaEspalhar = new Float32Array(DIRECOES)
function espalhar(valores: Float32Array) {
  copiaEspalhar.set(valores)
  for (let i = 0; i < DIRECOES; i++) {
    const antes = copiaEspalhar[(i + DIRECOES - 1) % DIRECOES]
    const depois = copiaEspalhar[(i + 1) % DIRECOES]
    valores[i] = 0.25 * antes + 0.5 * copiaEspalhar[i] + 0.25 * depois
  }
}
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const entre = (p: Ponto, q: Ponto, t: number): Ponto => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]

/** Posição na página pelo offsetTop, que ignora transformações (inclusive as deste efeito). */
function naPagina(elemento: HTMLElement) {
  let x = 0
  let y = 0
  for (let e: Element | null = elemento; e instanceof HTMLElement; e = e.offsetParent) {
    x += e.offsetLeft
    y += e.offsetTop
  }
  return { x, y, largura: elemento.offsetWidth, altura: elemento.offsetHeight }
}

/**
 * Quadrilátero convexo, com os cantos no sentido horário (o do retângulo original)? As medidas
 * são frações do bloco, então cada "virada" vale 1 no bloco em repouso.
 */
function convexo(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const vira = (p: Ponto, q: Ponto, r: Ponto) => (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0])
  const minimo = 1e-4
  return vira(a, b, c) > minimo && vira(b, c, d) > minimo && vira(c, d, a) > minimo && vira(d, a, b) > minimo
}

/**
 * A projeção que leva o quadrado unitário ao quadrilátero a, b, c, d (cantos de cima à esquerda,
 * de cima à direita, de baixo à direita e de baixo à esquerda), ou `null` se ele for degenerado.
 */
function projetar(a: Ponto, b: Ponto, c: Ponto, d: Ponto): Projecao | null {
  if (!convexo(a, b, c, d)) return null
  const dx1 = b[0] - c[0]
  const dx2 = d[0] - c[0]
  const sx = a[0] - b[0] + c[0] - d[0]
  const dy1 = b[1] - c[1]
  const dy2 = d[1] - c[1]
  const sy = a[1] - b[1] + c[1] - d[1]
  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) < 1e-6) return null
  const g = (sx * dy2 - dx2 * sy) / det
  const h = (dx1 * sy - sx * dy1) / det
  // O divisor não pode zerar nem trocar de sinal dentro do bloco, nem variar demais entre os cantos:
  // uma perspectiva extrema esmaga quase tudo num canto, e muda muito com qualquer movimento.
  const divisores = [1, 1 + g, 1 + h, 1 + g + h]
  if (Math.min(...divisores) < 0.02 || Math.max(...divisores) / Math.min(...divisores) > PERSPECTIVA_MAXIMA) return null
  return [b[0] - a[0] + g * b[0], d[0] - a[0] + h * d[0], a[0], b[1] - a[1] + g * b[1], d[1] - a[1] + h * d[1], a[1], g, h]
}

export function criarAbsorcao(): Absorcao {
  let blocos: Bloco[] = []
  // Elementos que este efeito está deformando agora. Os que voltam ao lugar ficam com a transição
  // desligada até o navegador desenhá-los no lugar (dois quadros depois); só então ela é religada,
  // senão a volta viraria uma animação. Quem voltou a ser deformado nesse meio-tempo continua sem.
  const deformados = new WeakSet<HTMLElement>()
  const aSoltar = new Set<HTMLElement>()
  let soltura = 0

  const fluxos: Fluxos = { dados: new Float32Array(DIRECOES * 2), forca: 0, raio: 0 }
  // Acumuladores dos fluxos, por direção. Os de um bloco (quanto da direção ele cobre e o raio
  // somado) e os de todos (a força, e o raio com o peso dele).
  const pesoBloco = new Float32Array(DIRECOES)
  const raioBloco = new Float32Array(DIRECOES)
  const forcas = new Float32Array(DIRECOES)
  const raios = new Float32Array(DIRECOES)
  const pesoRaios = new Float32Array(DIRECOES)

  function soltar() {
    soltura = 0
    for (const elemento of aSoltar) if (!deformados.has(elemento)) elemento.style.transition = ''
    aSoltar.clear()
  }

  /** Deforma o bloco (`transform`) e desfaz a parte que já chegou ao disco (`mascara`). */
  function aplicar(bloco: Bloco, transform: string, mascara: string) {
    const estilo = bloco.elemento.style
    if (!bloco.afetado) {
      // os blocos com Reveal têm transição de transform: desligada enquanto o efeito manda
      estilo.transition = 'none'
      estilo.transformOrigin = '0 0'
      estilo.willChange = 'transform'
      bloco.afetado = true
      deformados.add(bloco.elemento)
    }
    estilo.transform = transform
    estilo.maskImage = mascara
    estilo.webkitMaskImage = mascara
  }

  function devolver(bloco: Bloco) {
    const estilo = bloco.elemento.style
    estilo.transform = ''
    estilo.transformOrigin = ''
    estilo.willChange = ''
    estilo.maskImage = ''
    estilo.webkitMaskImage = ''
    bloco.afetado = false
    deformados.delete(bloco.elemento)
    aSoltar.add(bloco.elemento)
    if (!soltura) soltura = requestAnimationFrame(() => (soltura = requestAnimationFrame(soltar)))
  }

  function limpar() {
    for (const bloco of blocos) if (bloco.afetado) devolver(bloco)
    fluxos.forca = 0
  }

  function semEfeito<T>(medida: () => T): T {
    // a transição continua desligada nos blocos afetados: tirar e devolver não anima nada
    const salvos = blocos
      .filter((bloco) => bloco.afetado)
      .map(({ elemento }) => ({ estilo: elemento.style, transform: elemento.style.transform, mascara: elemento.style.maskImage }))
    for (const { estilo } of salvos) {
      estilo.transform = ''
      estilo.maskImage = ''
      estilo.webkitMaskImage = ''
    }
    try {
      return medida()
    } finally {
      for (const { estilo, transform, mascara } of salvos) {
        estilo.transform = transform
        estilo.maskImage = mascara
        estilo.webkitMaskImage = mascara
      }
    }
  }

  return {
    fluxos,
    limpar,
    semEfeito,

    medir() {
      // As medidas ignoram as transformações, então os blocos não precisam voltar ao lugar para
      // serem medidos (isso faria o efeito piscar no meio da rolagem): só mantêm o estado.
      const antes = new Map(blocos.map((bloco) => [bloco.elemento, bloco]))
      const elementos = [...document.querySelectorAll<HTMLElement>(SELETOR)]
      blocos = elementos
        .filter(
          (elemento) =>
            // os títulos fixos das seções ficam parados no alto da tela: seriam engolidos o tempo todo
            getComputedStyle(elemento).position !== 'sticky' &&
            // um bloco dentro de outro já se deforma junto com ele
            !elementos.some((outro) => outro !== elemento && outro.contains(elemento)),
        )
        .map((elemento) => ({ elemento, ...naPagina(elemento), afetado: antes.get(elemento)?.afetado ?? false }))
        // elementos ocultos neste tamanho de tela não têm o que deformar
        .filter((bloco) => bloco.largura > 0 && bloco.altura > 0)

      // o que deixou de ser bloco (um título que passou a ficar fixo, por exemplo) volta ao lugar
      const atuais = new Set(blocos.map((bloco) => bloco.elemento))
      for (const bloco of antes.values()) if (bloco.afetado && !atuais.has(bloco.elemento)) devolver(bloco)
    },

    atualizar(alvo, { frente, inicio }, rolagem, forca) {
      fluxos.forca = 0
      if (forca < 0.004) {
        for (const bloco of blocos) if (bloco.afetado) devolver(bloco)
        return
      }

      // ---- a geometria deste quadro ----
      const cg = Math.cos(alvo.giro)
      const sg = Math.sin(alvo.giro)
      const si = Math.sin(alvo.inclinacao)
      const pxPorRs = alvo.raio / SOMBRA
      const borda = R_FORA * pxPorRs   // raio da borda do disco, em px

      /** Da tela para o plano do disco: px com origem no buraco negro, z crescendo para a câmera. */
      const noPlano = (x: number, y: number): Ponto => {
        const bx = x - alvo.x
        const by = alvo.y - y
        return [cg * bx - sg * by, -(sg * bx + cg * by) / si]
      }
      const naTela = (px: number, pz: number): Ponto => {
        const by = -pz * si
        return [alvo.x + cg * px + sg * by, alvo.y + sg * px - cg * by]
      }

      // O conteúdo é puxado conforme sobe pela faixa.
      const faixa = (y: number) => clamp01((inicio - y) / (inicio - frente))
      const curso = (inicio - frente) * CURSO
      /** A altura da tela em que o progresso é q (com a força atual). */
      const alturaDe = (q: number) => inicio - (q / forca) * (inicio - frente)

      /**
       * Para onde vai, com progresso q, a borda horizontal do bloco que vai de `esquerda` a
       * `direita` na altura y. O destino é um ponto de órbita na direção dela, um pouco arrastado
       * no sentido da rotação: na borda do disco, ou numa órbita mais para dentro se ela já está
       * sobre o disco, e sempre na metade da frente (a página não passa por trás do buraco negro).
       * A borda chega com largura, e não afunilando num ponto: o conteúdo se derrama no disco.
       * Longe do disco, ela anda só `curso` px nesse caminho.
       */
      const chegada = (esquerda: number, direita: number, y: number, q: number): [Ponto, Ponto] => {
        const inicioEsq: Ponto = [esquerda, y]
        const inicioDir: Ponto = [direita, y]
        if (q <= 0) return [inicioEsq, inicioDir]
        const e = q * q * (3 - 2 * q)

        const [px, pz] = noPlano((esquerda + direita) / 2, y)
        const raio = Math.min(CHEGADA * borda, Math.hypot(px, pz) * MERGULHO)
        const phi = Math.atan2(Math.max(pz, raio * 0.12), px) + alvo.sentido * ARRASTO * (0.5 + 0.5 * e)
        const cx = raio * Math.cos(phi)
        const cz = raio * Math.sin(phi)
        const centro = naTela(cx, cz)
        // A borda chega na horizontal, mais estreita, centrada nesse ponto. (Deitada na órbita ela
        // ficaria quase de pé perto da ponta do disco, e a ponta direita da borda de cima passaria
        // para baixo da de baixo, torcendo o bloco.)
        const meia = clamp((direita - esquerda) * 0.25, 12, raio * 0.5)
        const destEsq: Ponto = [centro[0] - meia, centro[1]]
        const destDir: Ponto = [centro[0] + meia, centro[1]]
        // o caminho, encurtado para no máximo `curso` px (as duas pontas na mesma proporção)
        const longe = Math.max(Math.hypot(destEsq[0] - esquerda, destEsq[1] - y), Math.hypot(destDir[0] - direita, destDir[1] - y))
        const k = e * Math.min(1, curso / Math.max(longe, 1))
        return [entre(inicioEsq, destEsq, k), entre(inicioDir, destDir, k)]
      }

      forcas.fill(0)
      raios.fill(0)
      pesoRaios.fill(0)
      // o caminho da linha do bloco em volta do buraco negro, em direções (ver marcar)
      let percurso = 0
      let anterior = -1
      /**
       * Registra matéria saindo do ponto (x, y) da tela, um dos pontos da linha de um bloco: o
       * shader desenha o fluxo dali ao disco e esquenta o gás por onde ele entra. (O que já se
       * desfaz sobre o disco só esquenta o gás.)
       */
      const marcar = (x: number, y: number) => {
        const [px, pz] = noPlano(x, y)
        const r = Math.max(Math.hypot(px, pz) / pxPorRs, R_FORA * 1.02)
        // a linha de corrente que passa pelo ponto (a mesma conta de torcao() no shader)
        const sigma = Math.atan2(pz, px) - alvo.sentido * GANCHO * (R_FORA / r) ** 3
        const posicao = ((((sigma / TAU) % 1) + 1) % 1) * DIRECOES
        const i = Math.floor(posicao) % DIRECOES
        const j = (i + 1) % DIRECOES
        const f = posicao - Math.floor(posicao)
        pesoBloco[i] += 1 - f
        pesoBloco[j] += f
        raioBloco[i] += r * (1 - f)
        raioBloco[j] += r * f
        if (anterior >= 0) {
          const passo = Math.abs(posicao - anterior)
          percurso += Math.min(passo, DIRECOES - passo)
        }
        anterior = posicao
      }
      /**
       * Soma o fluxo de um bloco ao de todos: em cada direção, a força dele vezes quanto da
       * direção ele cobre. A cobertura é a parte dos pontos do bloco que caiu ali, comparada com a
       * que caberia se eles se espalhassem por igual (um bloco que ocupa uma direção só cobre metade
       * de cada uma das duas vizinhas): assim ela muda na proporção do movimento, e um bloco que se
       * desloca um pouco não acende a direção do lado de uma vez. Cada bloco entra e sai do fluxo
       * aos poucos, junto com a força dele, sem mudar o dos outros. Cada direção tem um raio só,
       * onde os fios começam: quando dois blocos dividem a direção, vale o mais forte (o peso do
       * raio é o quadrado da força), e um bloco que acaba de chegar não o arrasta de repente.
       */
      const juntar = (quanto: number, pontos: number) => {
        const porDirecao = pontos / Math.max(1, percurso)
        for (let i = 0; i < DIRECOES; i++) {
          if (pesoBloco[i] <= 0) continue
          const parte = quanto * Math.min(1, pesoBloco[i] / porDirecao)
          forcas[i] += parte
          raios[i] += parte * parte * (raioBloco[i] / pesoBloco[i])
          pesoRaios[i] += parte * parte
        }
      }

      // ---- os blocos ----
      const focado = document.activeElement
      const alcance = (inicio - frente) * ALCANCE
      for (const bloco of blocos) {
        const topo = bloco.y - rolagem
        const base = topo + bloco.altura
        // já fora da tela por cima, ou com o foco do teclado dentro: fica no lugar
        if (base < 0 || (focado && bloco.elemento.contains(focado))) {
          if (bloco.afetado) devolver(bloco)
          continue
        }
        // a borda de cima de um bloco alto espera a de baixo chegar a `alcance` da faixa
        const qTopo = forca * faixa(Math.max(topo, base - alcance))
        const qBase = forca * faixa(base)
        const esquerda = bloco.x
        const direita = bloco.x + bloco.largura
        const largura = bloco.largura
        const altura = bloco.altura

        // A parte de cima se desfaz: opaca até a linha onde o progresso é DESFAZ.de, sumindo até
        // onde ele chega a DESFAZ.ate (ou para de crescer).
        let mascara = ''
        let desfeito = 0
        let yAte = -Infinity
        const yDe = forca > DESFAZ.de ? alturaDe(DESFAZ.de) : -Infinity
        if (yDe > topo) {
          const qFim = Math.min(forca, DESFAZ.ate)
          yAte = alturaDe(qFim)
          desfeito = (qFim - DESFAZ.de) / (DESFAZ.ate - DESFAZ.de)
          if (desfeito > 0.995 && yAte >= base) {
            // O bloco inteiro já está no disco: some, sem deformação (os quatro cantos chegaram
            // ao mesmo lugar, e não há transformação que represente isso).
            aplicar(bloco, '', 'linear-gradient(transparent, transparent)')
            continue
          }
          const porcento = (y: number) => (((y - topo) / altura) * 100).toFixed(2)
          mascara = `linear-gradient(to bottom, rgba(0,0,0,${(1 - desfeito).toFixed(3)}) ${porcento(yAte)}%, #000 ${porcento(yDe)}%)`
        }
        // nada a puxar nem a desfazer ainda
        if (qTopo < 0.004 && !mascara) {
          if (bloco.afetado) devolver(bloco)
          continue
        }

        // a borda de cima já perto do disco e a de baixo ainda na página: o bloco se estica entre as duas
        const [a, b] = chegada(esquerda, direita, topo, qTopo)
        const [d, c] = chegada(esquerda, direita, base, qBase)

        // O quadrilátero em coordenadas do próprio bloco, com os cantos a uma fração `recuo` do
        // caminho (1 é o destino; 0, o repouso).
        const projecaoCom = (recuo: number) => {
          const local = (repousoX: number, repousoY: number, canto: Ponto): Ponto => [
            (repousoX + (canto[0] - repousoX) * recuo - esquerda) / largura,
            (repousoY + (canto[1] - repousoY) * recuo - topo) / altura,
          ]
          return projetar(local(esquerda, topo, a), local(direita, topo, b), local(direita, base, c), local(esquerda, base, d))
        }
        // Se ele sair torto demais para uma transformação válida, recua em direção ao repouso só o
        // necessário. A busca é contínua: recuar aos saltos faria o bloco pular de um quadro ao outro.
        let projecao = projecaoCom(1)
        if (!projecao) {
          let valido = 0
          let invalido = 1
          for (let passo = 0; passo < 12; passo++) {
            const meio = (valido + invalido) / 2
            if (projecaoCom(meio)) valido = meio
            else invalido = meio
          }
          projecao = projecaoCom(valido) ?? IDENTIDADE
        }
        const [m0, m1, m2, m3, m4, m5, m6, m7] = projecao

        // Da linha em que o conteúdo começa a se desfazer, a matéria segue como fluxo até o disco.
        // A força é a parte do bloco que está se desfazendo agora (entre yAte e yDe): cresce aos
        // poucos quando ele chega à linha e some aos poucos quando ele acaba. A linha é tomada sem
        // a deformação: ela fica parada na tela, e o fluxo não varre o disco junto com o bloco
        // (perto do buraco negro, poucos pixels de deformação mudam muito a direção).
        const quanto = mascara ? desfeito * clamp01((Math.min(base, yDe) - Math.max(topo, yAte)) / Math.max(1, yDe - yAte)) : 0
        if (quanto > 0.001) {
          pesoBloco.fill(0)
          raioBloco.fill(0)
          percurso = 0
          anterior = -1
          const linha = Math.min(base, yDe)
          for (let k = 0; k <= AMOSTRAS; k++) marcar(esquerda + (k / AMOSTRAS) * largura, linha)
          juntar(quanto, AMOSTRAS + 1)
        }

        // A projeção está em frações do bloco; a matrix3d (em colunas) trabalha em px:
        // (x, y) → (largura·(m0·x/largura + m1·y/altura + m2) / divisor, ...)
        aplicar(
          bloco,
          `matrix3d(${m0},${(m3 * altura) / largura},0,${m6 / largura},${(m1 * largura) / altura},${m4},0,${m7 / altura},0,0,1,0,${m2 * largura},${m5 * altura},0,1)`,
          mascara,
        )
      }

      // ---- os fluxos, por direção ----
      // Um pouco espalhados entre as direções vizinhas: o alto da tela fica na altura do buraco
      // negro e é visto quase de lado, então poucos pixels de rolagem mudam a direção de onde a
      // matéria vem. Espalhada, ela desliza de uma direção para a outra em vez de pular. O shader
      // interpola as direções vizinhas pesando o raio pela força: o de uma direção vazia não conta.
      espalhar(forcas)
      espalhar(raios)
      espalhar(pesoRaios)
      let maiorRaio = 0
      for (let i = 0; i < DIRECOES; i++) {
        const raio = pesoRaios[i] > 0 ? raios[i] / pesoRaios[i] : 0
        fluxos.dados[i * 2] = Math.min(1, forcas[i])
        fluxos.dados[i * 2 + 1] = raio
        fluxos.forca = Math.max(fluxos.forca, fluxos.dados[i * 2])
        maiorRaio = Math.max(maiorRaio, raio)
      }
      fluxos.raio = maiorRaio * 1.05
    },
  }
}
