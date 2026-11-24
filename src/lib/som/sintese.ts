// Os efeitos sonoros do site, sintetizados na hora com a Web Audio API: nenhum arquivo de áudio é
// baixado. Tudo sai de osciladores, de ruído e de filtros, como o buraco negro sai de shaders.
//
// O fundo é um coro no clima da versão lenta, com eco, de Choral Chambers (de Christopher Larkin, da
// trilha de Hollow Knight: Silksong), a faixa de referência: ré menor, na afinação dela (45 cents
// abaixo do lá 440), vozes escuras, acordes longos que se fundem uns nos outros e um eco de catedral,
// de uns 7 s. E, como ela, a música começa de um jeito e termina de outro: no topo da página, só as
// vozes do meio, longe, escuras e quase paradas; descendo, entra um grave fundo, as vozes andam, um
// descante canta por cima e, perto do fim, um pulso bate sobre o ré do buraco negro (veja SECOES). Os
// acordes, a ordem deles e as vozes são próprios; da faixa vêm a tonalidade, a afinação, o timbre
// escuro, o tamanho do eco e esse jeito de crescer.
//
// Tudo soa junto, em harmonia: o tique do mouse, o chirp da onda, as notas do tema, o ponto de luz e
// o acorde do pouso tocam notas do acorde que o coro canta naquela hora, e até os ruídos (a sucção, os
// jatos, o ar da queda, o sopro da volta) passam por filtros afinados nelas. E, no mergulho, tudo desce
// de tom junto: é o desvio para o vermelho, que também deixa a música mais lenta. Perto do horizonte,
// o tempo passa devagar (a versão lenta, de verdade), e lá ele para:
//
// - Ao longo da página, a música cresce (veja SECOES), a vogal se abre (do "u" ao "a"), as vozes
//   chegam mais perto e mais claras, e o fundo vem de onde o buraco negro está.
// - Rolando para baixo, o conteúdo é sugado num sussurro afinado; para cima, os jatos brilham.
// - Cada clique solta uma onda gravitacional, e ela soa como as que os detectores ouviram: um chirp,
//   um assobio que sobe cada vez mais depressa até a fusão e se apaga num zumbido curto (aqui, numa
//   nota do acorde).
// - No mergulho, o coro desce até quase parar, o ronco cresce, o ar corre mais rápido e tudo treme
//   perto do horizonte; quando o véu fecha a tela, o som acaba de uma vez, e só o eco se perde no
//   escuro.
// - Na volta ao topo, um ponto de luz soa no silêncio, o site vem num sopro que sobe, o coro volta um
//   pouco mais agudo (o desvio para o azul) num acorde suspenso e pousa no ré menor com o site.
//
// Este arquivo não sabe nada da página: recebe o estado (veja Estado) e os momentos dos efeitos, e
// quem acompanha a página é o regente (regente.ts). Assim os sons também podem ser gravados fora
// dela, num OfflineAudioContext.

/** O que o fundo acompanha (veja regente.ts). Frações de 0 a 1, menos `lado`. */
export interface Estado {
  /** O buraco negro anda com a rolagem. Parado no alto da página, o fundo fica como no topo, e não há queda. */
  animado: boolean
  /** Quanto ele já se aproximou ao longo da página: 0 no topo, 1 no fim do conteúdo. */
  perto: number
  /**
   * Quanto da página já se leu: 0 no topo, 1 no fim do conteúdo, ande o buraco negro ou não. É por onde
   * a música vai (veja SECOES).
   */
  progresso: number
  /** Em que parte do mergulho se está: 0 até ele começar, 1 com a tela toda preta. */
  mergulho: number
  /** A rapidez da rolagem, em qualquer ponto da página. */
  rapidez: number
  /** A rapidez da rolagem para baixo e para cima, onde há conteúdo passando pela faixa da absorção. */
  descendo: number
  subindo: number
  /** Onde o buraco negro está na tela, da esquerda (-1) à direita (1): o fundo vem de lá. */
  lado: number
}

export interface Sons {
  /** O fundo segue o estado da página, com um pequeno atraso, sem saltos. */
  ajustar(estado: Estado): void
  /**
   * Agenda as trocas de acorde dos próximos segundos. O regente chama de tempos em tempos; sem isso,
   * o coro fica no último acorde.
   */
  reger(): void
  /** O som aparece; com `pan` (de -1 a 1, o lado do botão), a onda do clique que o ligou soa já. */
  ligar(pan?: number): void
  desligar(): void
  /** O chirp de uma onda, vindo do lado `pan`, com a força de 0 a 1 (a onda some no mergulho). */
  onda(pan: number, forca?: number, quando?: number): void
  /** O tique de passar o mouse num link ou num botão. */
  toque(quando?: number): void
  /** As duas notas da troca de tema. */
  tema(escuro: boolean, quando?: number): void
  /**
   * A volta ao topo, a partir de `inicio` (no relógio do áudio), por `duracao` s. Com `soFade` (o
   * movimento reduzido, em que o topo só aparece num fade), só o fundo voltando e o acorde.
   */
  voltar(inicio: number, duracao: number, soFade: boolean): void
}

/** A afinação da faixa de referência, em cents em relação ao lá 440: a versão lenta baixou a original. */
const AFINACAO = -45

/** A frequência (Hz) de uma nota MIDI (62 é o ré do meio do piano), na afinação acima. */
const freq = (nota: number) => 440 * 2 ** ((nota - 69) / 12 + AFINACAO / 1200)

/** A batida (s), o passo em que as vozes andam e o pulso bate, e quantas cabem num compasso. */
const BATIDA = 1.1
const BATIDAS = 8

/**
 * Um acorde do coro: as notas de cada voz (baixo, tenor, contralto e soprano), por onde o soprano passa
 * ao longo dele (a primeira é a nota dele no acorde) e, quando é o caso, a nota para onde o tenor vai
 * no meio dele.
 */
interface Acorde {
  vozes: readonly [number, number, number, number]
  melodia: readonly number[]
  resolve?: number
}

/**
 * Um compasso do chão: o acorde; a virada, o acorde em que o compasso termina, na metade, nas seções
 * que viram (veja SECOES); e o descante, a voz mais aguda, que entra no meio da página: a batida em
 * que cada nota dele começa, e a nota.
 */
interface Compasso {
  acorde: Acorde
  virada?: Acorde
  descante: readonly (readonly [number, number])[]
}

/**
 * O chão: os acordes que se repetem do começo ao fim, em ré menor, como numa passacalha. O que muda
 * ao longo da página é o que se canta sobre eles (veja SECOES). Cada voz anda pouco de um acorde para
 * o outro; o soprano faz uma melodia lenta (fá, mi, lá, sol) e, dentro de cada acorde, sai da nota
 * dele para a vizinha e volta, como um suspiro; o descante desce do lá agudo e sobe de volta a ele,
 * sempre em notas do acorde, mudando junto com o soprano (nunca a meio tom dele). A virada troca o
 * último dó pela dominante, lá maior, que pede a volta ao ré menor.
 */
const CHAO: readonly Compasso[] = [
  { acorde: { vozes: [50, 57, 62, 65], melodia: [65, 67, 65] }, descante: [[0, 81], [6, 79]] }, // ré menor (i)
  { acorde: { vozes: [46, 57, 62, 65], melodia: [65, 64, 65] }, descante: [[0, 77], [3, 74]] }, // si bemol com sétima maior (VI)
  { acorde: { vozes: [45, 53, 60, 64], melodia: [64, 65, 64] }, descante: [[0, 76], [3, 72]] }, // fá com sétima maior, com o lá no baixo (III)
  { acorde: { vozes: [48, 55, 62, 64], melodia: [64, 62, 64] }, descante: [[0, 74], [4, 76]] }, // dó com nona (VII)
  { acorde: { vozes: [50, 57, 65, 69], melodia: [69, 70, 69] }, descante: [[0, 77], [5, 81]] }, // ré menor, com a terça no meio (i)
  { acorde: { vozes: [46, 55, 62, 69], melodia: [69, 67, 69] }, descante: [[0, 79], [4, 74]] }, // sol menor com nona, com o si bemol no baixo (iv)
  { acorde: { vozes: [46, 53, 62, 69], melodia: [69, 72, 69] }, descante: [[0, 77]] }, // si bemol com sétima maior (VI)
  {
    acorde: { vozes: [48, 53, 60, 67], melodia: [67, 69, 67], resolve: 52 }, // dó com quarta, que resolve na terça (VII)
    virada: { vozes: [45, 57, 61, 64], melodia: [64] }, // lá maior (V)
    descante: [[0, 79]],
  },
]
/** O compasso do acorde suspenso em que o coro entra na volta ao topo, e o do pouso, quando o site chega. */
const SUSPENSO = 7
const TONICA = 0

/**
 * Uma seção da música: onde ela começa (a fração da página, do topo ao fim do conteúdo); que vozes
 * andam de um acorde ao outro, por notas de passagem (0 é o baixo, 2 o contralto); se o tenor e o
 * contralto bordam a nota que fica de um acorde ao outro (vão à vizinha e voltam); se o último
 * compasso vira para a dominante; e se o grave fundo fica no ré nos quatro primeiros compassos.
 */
interface Secao {
  de: number
  andam: readonly number[]
  bordam: boolean
  vira: boolean
  pedal: boolean
}

/**
 * As seções, como na faixa de referência, que começa só com as vozes do meio e cresce até o fim. Elas
 * mudam no começo de um compasso, e as camadas novas entram aos poucos com a rolagem (veja ENTRA).
 */
const SECOES: readonly Secao[] = [
  // a câmara: só o coro, longe, escuro e quase parado (o soprano suspira, e o contralto passa)
  { de: 0, andam: [2], bordam: false, vira: false, pedal: false },
  // o chão: entra o grave fundo, e o tenor e o contralto andam
  { de: 0.15, andam: [1, 2], bordam: true, vira: false, pedal: false },
  // o pleno: entra o descante, o baixo anda, e o último compasso vira para a dominante
  { de: 0.45, andam: [0, 1, 2], bordam: true, vira: true, pedal: false },
  // o horizonte: entra o pulso, e o chão vira o ré do buraco negro na primeira metade do ciclo
  { de: 0.72, andam: [0, 1, 2], bordam: true, vira: true, pedal: true },
]

/**
 * Em que trecho da página (frações) cada camada nova vai do nada ao todo: o grave fundo, o descante e
 * o pulso. E de onde o pulso dobra, batendo em colcheias, com a oitava no contratempo.
 */
const ENTRA = { grave: [0.1, 0.22], descante: [0.4, 0.52], pulso: [0.68, 0.8], colcheias: 0.88 } as const

/**
 * O pedal, que é o zumbido do buraco negro: o ré grave e a oitava, em senos (com a quinta, ou com os
 * harmônicos de outra forma de onda, o lá cobria a terça do coro, a nota que faz o acorde menor). Nota,
 * forma, ganho e desafino. Na página, o ré grave quase não soa (como na faixa, o começo não tem grave
 * fundo, e depois o grave fundo é o da música): ele é do mergulho (veja GRAVE_DO_PEDAL).
 */
const PEDAL: readonly [number, OscillatorType, number, number][] = [
  [38, 'sine', 0.6, 0],
  [50, 'sine', 0.32, -4],
]
/** Quanto do ré grave do pedal soa na página, em relação ao mergulho. */
const GRAVE_DO_PEDAL = 0.12
/** O ré mais grave, que se sente mais do que se ouve: a gravidade. */
const SUB = 26

/**
 * O coro: o desafino (cents) dos dois osciladores de cada voz, que batem devagar, como um naipe; o
 * vibrato de cada voz (vezes por segundo e cents); o peso dela no topo e no fim do conteúdo (o
 * descante, a quinta voz, só canta da metade da página em diante); e em quanto tempo (s) um acorde
 * some e o seguinte aparece.
 */
const CORO = {
  naipe: [-7, 6],
  vibrato: [
    [4.6, 9],
    [5.1, 11],
    [4.9, 12],
    [5.4, 10],
    [5.8, 13],
  ],
  peso: [
    [0.6, 0.9],
    [0.8, 1],
    [0.8, 1],
    [0.75, 0.95],
    [0, 0.7],
  ],
  sai: 1.6,
  entra: 1.1,
} as const

/**
 * O grave fundo, um órgão de pedal: os harmônicos (do primeiro em diante; os de cima o fazem ouvir-se
 * também em alto-falantes pequenos, que quase não tocam a fundamental) e o filtro (Hz). Um oscilador
 * só: dois, desafinados, batiam e sumiam a cada poucos segundos.
 */
const ORGAO = { harmonicos: [1, 0.8, 0.5, 0.3, 0.16, 0.08], filtro: 480 } as const

/**
 * O pulso, cordas graves repetindo a nota do grave: o desafino dos osciladores; quanto ele soa entre
 * uma batida e outra (do pico); em quanto tempo (s) cai até lá, em semínimas e em colcheias; e o filtro
 * (Hz), no começo e no fim do trecho dele.
 */
const PULSO = { naipe: [-6, 6], repouso: 0.03, cai: 0.22, caiColcheia: 0.1, filtro: [650, 1300] } as const

/**
 * As vogais do coro: os três formantes (Hz), do "u" fechado, no topo da página, ao "a" aberto, no
 * fim, e o ganho e a largura (Q) de cada um.
 */
const VOGAL = {
  fechada: [400, 800, 2600],
  aberta: [620, 1060, 2650],
  ganho: [1, 0.7, 0.3],
  q: [5, 7, 9],
} as const

/** O brilho do coro (o corte do filtro, Hz): escuro no topo, claro no fim do conteúdo. */
const BRILHO = [1400, 3200] as const

/** Quanto do coro, do pedal e do ré mais grave soa no topo da página, em relação ao fim do conteúdo. */
const NO_TOPO = { coro: 0.55, pedal: 0.42, sub: 0 }

/** Quantos segundos adiante as trocas de acorde ficam agendadas (veja reger). */
const ADIANTE = 2

/**
 * Os volumes (ganho linear). A saída tem um limitador para os picos, mas a mistura foi feita para ele
 * quase não agir: o fundo fica baixo, e os efeitos passam por cima dele.
 */
const VOLUME = {
  geral: 0.9,
  eco: 0.55,
  coro: 0.05,
  folego: 0.05,
  grave: 0.017,
  pulso: 0.08,
  pedal: 0.025,
  sub: 0.025,
  succao: 0.45,
  jato: 0.25,
  ronco: 0.24,
  corrente: 0.4,
  onda: 0.19,
  toque: 0.045,
  tema: 0.06,
  luz: 0.03,
  sopro: 0.5,
  acorde: 0.045,
  baque: 0.28,
}

/**
 * O fundo (tudo o que soa o tempo todo): quanto dele vai direto para a saída, no topo da página e no
 * fim do conteúdo (longe, ele soa mais pelo eco; perto, mais direto), e quanto vai para o eco.
 */
const FUNDO = { seco: [0.4, 0.62], eco: 0.9 } as const

/**
 * Quanto dura o eco (s): o de sempre e o do modo leve (veja criarSons). Gerar o eco e entregá-lo ao
 * navegador custa uns 40 ms na thread principal, e isso fica para uma tarefa à parte, logo depois
 * de o som ligar: o coro começa na hora, e o eco chega uma fração de segundo depois.
 */
const ECO_DURA = { normal: 6, leve: 3.5 }

/** Quanto do eco cada efeito leva (do sinal que vai para ele). */
const ECO = { onda: 0.45, toque: 0.5, tema: 0.6, luz: 0.8, sopro: 0.6, acorde: 0.7 }

/**
 * O chirp da onda de um clique: quanto dura a espiral (s), entre que frequências (Hz) fica a nota do
 * acorde em que ela termina, e quanto dura o zumbido depois da fusão (s).
 */
const ONDA = { espiral: 0.12, de: 420, ate: 800, zumbido: 0.11 }

/** O tique do mouse: entre que frequências (Hz) ficam as notas, e depois de quanto tempo parado (s) o arpejo recomeça. */
const TOQUE = { de: 900, ate: 2300, recomeca: 1.4 }

/**
 * O fim do mergulho: em que parte dele o som começa a se calar e quando acaba (o véu cobre a tela de
 * 0,8 a 0,96, veja mergulho.ts).
 */
const SILENCIO = { de: 0.84, ate: 0.96 }

/**
 * O desvio para o vermelho (cents), no mergulho, e o azul, na volta. Ao longo da página não há: longe
 * do horizonte, ele é pequeno demais para se ouvir, e quem muda ali é a música (veja SECOES).
 */
const DESVIO = { mergulho: -1300, azul: 500 }

const limitar = (v: number, de = 0, ate = 1) => Math.min(ate, Math.max(de, v))

const suave = (de: number, ate: number, v: number) => {
  const t = limitar((v - de) / (ate - de))
  return t * t * (3 - 2 * t)
}

const misturar = (de: number, ate: number, t: number) => de + (ate - de) * t

/** A classe de uma nota (0 é dó, 2 é ré), de 0 a 11. */
const classe = (nota: number) => ((nota % 12) + 12) % 12

/** Se o acorde é a dominante: tem o dó sustenido, a meio tom do ré do pedal. */
const dominante = (acorde: Acorde) => acorde.vozes.some((nota) => classe(nota) === 1)

/** As classes das notas de um acorde, e a do ré do pedal, que combina com todos menos a dominante. */
function classesDe(acorde: Acorde): Set<number> {
  const classes = new Set(acorde.vozes.map(classe))
  if (!dominante(acorde)) classes.add(classe(PEDAL[0]![0]))
  return classes
}

/** As notas MIDI de `acorde` (e do pedal, em ré) entre `de` e `ate` Hz, da mais grave à mais aguda. */
function notasEntre(acorde: Acorde, de: number, ate: number): number[] {
  const classes = classesDe(acorde)
  const notas: number[] = []
  for (let n = 24; n <= 108; n++) {
    const f = freq(n)
    if (classes.has(classe(n)) && f >= de && f <= ate) notas.push(n)
  }
  return notas
}

/** A escala por onde as vozes passam: ré menor e, no acorde da dominante, com o dó sustenido no lugar do dó. */
function escalaDe(acorde: Acorde): Set<number> {
  const escala = new Set([0, 2, 4, 5, 7, 9, 10])
  if (dominante(acorde)) {
    escala.delete(0)
    escala.add(1)
  }
  return escala
}

/** As notas da escala entre `de` e `ate` (sem as duas), na ordem em que a voz passa por elas. */
function passagem(de: number, ate: number, escala: Set<number>): number[] {
  const passo = Math.sign(ate - de)
  const notas: number[] = []
  for (let n = de + passo; passo !== 0 && n !== ate; n += passo) if (escala.has(classe(n))) notas.push(n)
  return notas
}

/**
 * A vizinha de `nota` para a voz bordar: um tom acima ou abaixo, na escala, e nunca a meio tom de uma
 * nota do acorde (aí ela soaria como erro, e não como enfeite).
 */
function vizinha(nota: number, acorde: Acorde, escala: Set<number>): number | undefined {
  const doAcorde = [...classesDe(acorde)]
  return [nota + 2, nota - 2].find((n) => escala.has(classe(n)) && doAcorde.every((c) => ![1, 11].includes(classe(n - c))))
}

/** A nota do descante que soa na batida `batida` do compasso. */
function descanteEm(compasso: Compasso, batida: number): number {
  let nota = compasso.descante[0]![1]
  for (const [b, n] of compasso.descante) if (b <= batida) nota = n
  return nota
}

/**
 * Uma vez de um acorde: em que compasso do chão (e qual metade dele: 1 é a virada), o acorde, quantas
 * batidas ele dura, em que seção da música cai e o acorde seguinte, para onde as vozes andam.
 */
interface Vez {
  posicao: number
  metade: 0 | 1
  acorde: Acorde
  batidas: number
  secao: number
  seguinte: Acorde
}

/** A vez da `metade` do compasso `posicao` na seção `secao`. */
function vezDe(posicao: number, metade: 0 | 1, secao: number): Vez {
  const compasso = CHAO[posicao]!
  const virada = SECOES[secao]!.vira ? compasso.virada : undefined
  const seguinte = metade === 0 && virada ? virada : CHAO[(posicao + 1) % CHAO.length]!.acorde
  return {
    posicao,
    metade,
    acorde: metade === 1 && compasso.virada ? compasso.virada : compasso.acorde,
    batidas: virada ? BATIDAS / 2 : BATIDAS,
    secao,
    seguinte,
  }
}

/** A seção em que a página está, com `progresso` de 0 (o topo) a 1 (o fim do conteúdo). */
const secaoDe = (progresso: number) => Math.max(0, SECOES.findLastIndex((secao) => progresso >= secao.de))

/**
 * As notas por onde cada voz do coro passa numa vez (baixo, tenor, contralto e soprano): a batida em
 * que cada uma começa, e a nota. O soprano faz a melodia do acorde; o tenor, quando é o caso, resolve
 * o retardo; e as vozes que andam (veja SECOES) vão para a nota do acorde seguinte por notas de
 * passagem da escala, nas últimas batidas, ou, se a nota fica, bordam a vizinha.
 */
function linhas(vez: Vez): [number, number][][] {
  const { acorde, seguinte, batidas } = vez
  const secao = SECOES[vez.secao]!
  const escala = escalaDe(acorde)
  return acorde.vozes.map((nota, voz) => {
    const linha: [number, number][] = [[0, nota]]
    if (voz === 3) {
      acorde.melodia.forEach((n, k) => k > 0 && linha.push([Math.round((k * batidas) / acorde.melodia.length), n]))
      return linha
    }
    if (voz === 1 && acorde.resolve !== undefined) {
      linha.push([Math.round(0.55 * batidas), acorde.resolve])
      return linha
    }
    if (!secao.andam.includes(voz)) return linha
    const alvo = seguinte.vozes[voz]!
    const passa = passagem(nota, alvo, escala).slice(batidas > BATIDAS / 2 ? -2 : -1)
    passa.forEach((n, k) => linha.push([batidas - passa.length + k, n]))
    // o tenor borda na terceira batida, o contralto na sexta: um de cada vez
    const borda = BORDA[voz]
    if (!passa.length && nota === alvo && secao.bordam && borda !== undefined && batidas === BATIDAS) {
      const n = vizinha(nota, acorde, escala)
      if (n !== undefined) linha.push([borda, n], [borda + 1, nota])
    }
    return linha
  })
}
/** Em que batida do compasso o tenor (1) e o contralto (2) bordam. */
const BORDA: Partial<Record<number, number>> = { 1: 2, 2: 5 }

/**
 * Um ruído estéreo de `segundos` (cada canal o seu) que se repete sem emenda: o fim se funde ao
 * começo, com a mesma potência, e o laço não estala. Marrom é o ruído integrado, grave, como um ronco;
 * branco, todo chiado.
 */
function ruido(ctx: BaseAudioContext, segundos: number, marrom: boolean): AudioBuffer {
  const taxa = ctx.sampleRate
  const n = Math.round(segundos * taxa)
  const emenda = Math.round(0.05 * taxa)
  const buffer = ctx.createBuffer(2, n, taxa)
  const bruto = new Float32Array(n + emenda)
  for (let canal = 0; canal < 2; canal++) {
    let integrado = 0
    for (let i = 0; i < bruto.length; i++) {
      const branco = Math.random() * 2 - 1
      integrado = (integrado + 0.02 * branco) / 1.02
      bruto[i] = marrom ? integrado * 3.5 : branco
    }
    // o começo é o fim continuando e, aos poucos, o começo de verdade (só a emenda faz a conta: ler
    // além do fim de `bruto` em todas as amostras levava uns 190 ms, na thread principal)
    const dados = buffer.getChannelData(canal)
    dados.set(bruto.subarray(0, n))
    for (let i = 0; i < emenda; i++) {
      const a = ((i / emenda) * Math.PI) / 2
      dados[i] = bruto[i]! * Math.sin(a) + bruto[n + i]! * Math.cos(a)
    }
  }
  return buffer
}

/**
 * A resposta de uma catedral, para o eco: ruído que decai em `segundos` até -60 dB e escurece com o
 * tempo, onde os agudos morrem antes, depois de um primeiro silêncio. Os dois canais são independentes:
 * o eco se abre de um lado ao outro, como na faixa de referência, quase sem nada em comum entre eles.
 */
function catedral(ctx: BaseAudioContext, segundos: number): AudioBuffer {
  const taxa = ctx.sampleRate
  const n = Math.round(segundos * taxa)
  const atraso = Math.round(0.03 * taxa)
  const buffer = ctx.createBuffer(2, n, taxa)
  for (let canal = 0; canal < 2; canal++) {
    const dados = buffer.getChannelData(canal)
    let filtrado = 0
    for (let i = atraso; i < n; i++) {
      const t = (i - atraso) / (n - atraso)
      // um filtro de um polo, cada vez mais fechado
      filtrado += (0.6 - 0.5 * t) * (Math.random() * 2 - 1 - filtrado)
      const entrada = Math.min(1, (i - atraso) / (0.08 * taxa))
      dados[i] = filtrado * Math.exp(-6.9 * t) * entrada
    }
  }
  return buffer
}

/**
 * Monta os sons num contexto de áudio, saindo em `destino`. Começam calados (veja ligar). `leve`: para
 * celulares e aparelhos com poucos núcleos, o coro com um oscilador por voz (e não dois), sem o fôlego,
 * e o eco mais curto. Num OfflineAudioContext (uma gravação), o eco fica pronto já.
 */
export function criarSons(ctx: BaseAudioContext, destino: AudioNode, leve = false): Sons {
  const agora = () => ctx.currentTime

  // ---------- a saída ----------
  const limitador = ctx.createDynamicsCompressor()
  limitador.threshold.value = -10
  limitador.knee.value = 6
  limitador.ratio.value = 10
  limitador.attack.value = 0.003
  limitador.release.value = 0.25
  limitador.connect(destino)
  const geral = ctx.createGain()
  geral.gain.value = 0
  geral.connect(limitador)
  const seco = ctx.createGain()
  seco.connect(geral)
  const eco = ctx.createConvolver()
  const prepararEco = () => {
    eco.buffer = catedral(ctx, leve ? ECO_DURA.leve : ECO_DURA.normal)
  }
  if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) prepararEco()
  else setTimeout(prepararEco, 0)
  const envio = ctx.createGain()
  envio.connect(eco)
  const retorno = ctx.createGain()
  retorno.gain.value = VOLUME.eco
  eco.connect(retorno).connect(geral)

  /** Leva `no` à saída, com a fração `direto` do sinal direto e a fração `quanto` no eco. */
  function sair(no: AudioNode, quanto: number, direto = 1) {
    const ida = ctx.createGain()
    ida.gain.value = direto
    no.connect(ida).connect(seco)
    if (quanto <= 0) return
    const aoEco = ctx.createGain()
    aoEco.gain.value = quanto
    no.connect(aoEco).connect(envio)
  }

  // O desvio de tom, em cents: o vermelho (a página e a queda) e o azul (a volta ao topo), somados ao
  // tom de cada nota e ao de cada filtro afinado. Tudo desce e sobe junto, e nada sai do acorde.
  const vermelho = ctx.createConstantSource()
  vermelho.offset.value = 0
  const azul = ctx.createConstantSource()
  azul.offset.value = 0
  /** O vermelho de agora, para o tempo da música (veja batidaAgora). */
  let desvio = 0

  /** Liga o desvio de tom a estes parâmetros de tom (cents). Devolve a função que os solta. */
  function deslocar(...params: AudioParam[]): () => void {
    for (const param of params) {
      vermelho.connect(param)
      azul.connect(param)
    }
    return () => {
      for (const param of params) {
        try {
          vermelho.disconnect(param)
          azul.disconnect(param)
        } catch {
          // já solto
        }
      }
    }
  }

  /**
   * Uma voz que toca uma vez: `no` sai pelo lado `pan`, com a fração `quanto` no eco, e as `fontes`
   * (já começadas: parar uma fonte antes de ela começar é erro) param em `fim`, quando a voz se
   * desliga da saída e `soltar` solta o desvio de tom dela.
   */
  function despachar(no: AudioNode, pan: number, quanto: number, fontes: AudioScheduledSourceNode[], fim: number, soltar?: () => void) {
    const lado = ctx.createStereoPanner()
    lado.pan.value = limitar(pan, -1, 1)
    no.connect(lado)
    sair(lado, quanto)
    for (const fonte of fontes) fonte.stop(fim)
    const ultima = fontes.at(-1)
    if (ultima)
      ultima.onended = () => {
        lado.disconnect()
        soltar?.()
      }
  }

  /** Segue `param` até cada novo valor com a `constante` de tempo (s), sem refazer o mesmo pedido. */
  function seguidor(param: AudioParam) {
    let ultimo = Number.NaN
    return (valor: number, constante: number) => {
      if (Math.abs(valor - ultimo) <= 1e-4 * (1 + Math.abs(valor))) return
      ultimo = valor
      param.setTargetAtTime(valor, agora(), constante)
    }
  }

  // ---------- o que soa o tempo todo ----------
  const marrom = ruido(ctx, 6, true)
  const branco = ruido(ctx, 4, false)
  /** As fontes que tocam sem parar, e de que ponto do buffer cada uma começa (s). */
  const continuas: [AudioScheduledSourceNode, number][] = [
    [vermelho, 0],
    [azul, 0],
  ]

  const emLaco = (buffer: AudioBuffer) => {
    const fonte = ctx.createBufferSource()
    fonte.buffer = buffer
    fonte.loop = true
    continuas.push([fonte, Math.random() * buffer.duration])
    return fonte
  }

  /** Uma oscilação lenta (Hz) somada a `params`, de `profundidade` para cada lado. */
  function oscilar(frequencia: number, profundidade: number, ...params: AudioParam[]) {
    const lfo = ctx.createOscillator()
    lfo.frequency.value = frequencia
    const quanto = ctx.createGain()
    quanto.gain.value = profundidade
    lfo.connect(quanto)
    for (const param of params) quanto.connect(param)
    continuas.push([lfo, 0])
    return quanto
  }

  /** Ruído por filtros estreitos afinados nas `notas`, que saem em `saida`. Devolve os filtros. */
  function ruidoAfinado(buffer: AudioBuffer, notas: number[], q: number, saida: AudioNode): BiquadFilterNode[] {
    const fonte = emLaco(buffer)
    return notas.map((nota) => {
      const filtro = ctx.createBiquadFilter()
      filtro.type = 'bandpass'
      filtro.frequency.value = freq(nota)
      filtro.Q.value = q
      deslocar(filtro.detune)
      fonte.connect(filtro).connect(saida)
      return filtro
    })
  }

  // O que soa o tempo todo passa por três portas: `vivo` se fecha no fim do mergulho (o eco, que vem
  // depois dela, continua e se perde no escuro), `volta` traz o som do silêncio quando ele liga e na
  // volta ao topo, e o lado põe o som onde o buraco negro está. Tudo bem molhado de eco, e mais seco
  // quanto mais se desce: a música chega mais perto.
  const vivo = ctx.createGain()
  const volta = ctx.createGain()
  volta.gain.value = 0
  const lado = ctx.createStereoPanner()
  vivo.connect(volta).connect(lado)
  const fundoSeco = ctx.createGain()
  fundoSeco.gain.value = FUNDO.seco[0]
  lado.connect(fundoSeco).connect(seco)
  const fundoEco = ctx.createGain()
  fundoEco.gain.value = FUNDO.eco
  lado.connect(fundoEco).connect(envio)

  // O coro: dois conjuntos de cinco vozes (o baixo, o tenor, o contralto, o soprano e o descante), um
  // cantando o acorde e o outro esperando o seguinte, calado (as trocas se fundem: um some enquanto o
  // outro aparece). Cada voz são dois osciladores dente de serra, desafinados um contra o outro, com
  // vibrato, e as vozes dos dois conjuntos passam pelos mesmos formantes, os da vogal, que descem junto
  // com o tom (como numa gravação tocada mais devagar).
  const vozDoCoro = ctx.createGain()
  const coroSaida = ctx.createGain()
  const formantes = VOGAL.fechada.map((f, i) => {
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = f
    filtro.Q.value = VOGAL.q[i]!
    deslocar(filtro.detune)
    const g = ctx.createGain()
    g.gain.value = VOGAL.ganho[i]!
    vozDoCoro.connect(filtro).connect(g).connect(coroSaida)
    return filtro
  })
  oscilar(0.023, 40, formantes[0]!.frequency)
  oscilar(0.017, 60, formantes[1]!.frequency)
  const corpo = ctx.createBiquadFilter()
  corpo.type = 'lowpass'
  corpo.frequency.value = 700
  deslocar(corpo.detune)
  const corpoGanho = ctx.createGain()
  corpoGanho.gain.value = 0.35
  vozDoCoro.connect(corpo).connect(corpoGanho).connect(coroSaida)
  const escuro = ctx.createBiquadFilter()
  escuro.type = 'lowpass'
  escuro.frequency.value = 1500
  escuro.Q.value = 0.5
  deslocar(escuro.detune)
  const coro = ctx.createGain()
  coro.gain.value = 0
  coroSaida.connect(escuro).connect(coro).connect(vivo)
  const conjuntos = [0, 1].map((c) => {
    const g = ctx.createGain()
    g.gain.value = c === 0 ? 1 : 0
    g.connect(vozDoCoro)
    return g
  })
  // (com um oscilador só por voz, ela soa mais baixo: o peso compensa)
  const compensa = leve ? Math.SQRT2 : 1
  const partes = conjuntos.map((conjunto) =>
    CORO.peso.map(([peso]) => {
      const g = ctx.createGain()
      g.gain.value = peso * compensa
      g.connect(conjunto)
      return g
    }),
  )
  const naipe = leve ? [0] : CORO.naipe
  const primeiras = [...CHAO[TONICA]!.acorde.vozes, descanteEm(CHAO[TONICA]!, 0)]
  const vozes = partes.map((doConjunto) =>
    doConjunto.map((parte, p) =>
      naipe.map((desafino) => {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = freq(primeiras[p]!)
        osc.detune.value = desafino
        deslocar(osc.detune)
        osc.connect(parte)
        continuas.push([osc, 0])
        return osc
      }),
    ),
  )
  CORO.vibrato.forEach(([vezes, cents], p) => {
    oscilar(vezes, cents, ...vozes.flatMap((doConjunto) => doConjunto[p]!.map((osc) => osc.detune)))
  })
  // o fôlego das vozes, pelos mesmos formantes
  if (!leve) {
    const folegoFiltro = ctx.createBiquadFilter()
    folegoFiltro.type = 'highpass'
    folegoFiltro.frequency.value = 400
    const folego = ctx.createGain()
    folego.gain.value = VOLUME.folego
    emLaco(branco).connect(folegoFiltro).connect(folego).connect(vozDoCoro)
  }

  // O pedal (o zumbido do buraco negro), que respira devagar e cede na dominante (veja ornar), e o ré
  // mais grave.
  const pedalTom = ctx.createBiquadFilter()
  pedalTom.type = 'lowpass'
  pedalTom.frequency.value = 260
  pedalTom.Q.value = 0.5
  oscilar(0.047, 60, pedalTom.frequency)
  const pedalCede = ctx.createGain()
  const pedal = ctx.createGain()
  pedal.gain.value = 0
  pedalTom.connect(pedalCede).connect(pedal).connect(vivo)
  const pedalGanhos = PEDAL.map(([nota, forma, ganho, desafino]) => {
    const osc = ctx.createOscillator()
    osc.type = forma
    osc.frequency.value = freq(nota)
    osc.detune.value = desafino
    deslocar(osc.detune)
    const g = ctx.createGain()
    g.gain.value = nota === PEDAL[0]![0] ? ganho * GRAVE_DO_PEDAL : ganho
    osc.connect(g).connect(pedalTom)
    continuas.push([osc, 0])
    return g
  })
  const sub = ctx.createGain()
  sub.gain.value = 0
  const subOsc = ctx.createOscillator()
  subOsc.frequency.value = freq(SUB)
  deslocar(subOsc.detune)
  subOsc.connect(sub).connect(vivo)
  continuas.push([subOsc, 0])

  // O grave fundo, que entra depois do topo, como o da faixa: um órgão de pedal, uma oitava abaixo do
  // baixo do coro, que anda com ele. Uma voz só, que respira um instante a cada nota nova.
  const graveTom = ctx.createBiquadFilter()
  graveTom.type = 'lowpass'
  graveTom.frequency.value = ORGAO.filtro
  graveTom.Q.value = 0.7
  const graveRespira = ctx.createGain()
  const grave = ctx.createGain()
  grave.gain.value = 0
  graveRespira.connect(graveTom).connect(grave).connect(vivo)
  const graveVoz = ctx.createOscillator()
  graveVoz.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(ORGAO.harmonicos.length + 1), Float32Array.from([0, ...ORGAO.harmonicos])))
  graveVoz.frequency.value = freq(CHAO[TONICA]!.acorde.vozes[0] - 12)
  deslocar(graveVoz.detune)
  graveVoz.connect(graveRespira)
  continuas.push([graveVoz, 0])

  // O pulso, perto do fim: cordas graves repetindo a nota do grave fundo, uma oitava acima, a cada
  // batida (veja pulsar). Entre uma batida e outra, ele quase some.
  const pulsoTom = ctx.createBiquadFilter()
  pulsoTom.type = 'lowpass'
  pulsoTom.frequency.value = PULSO.filtro[0]
  pulsoTom.Q.value = 1.2
  const pulsoBatida = ctx.createGain()
  pulsoBatida.gain.value = PULSO.repouso
  const pulso = ctx.createGain()
  pulso.gain.value = 0
  pulsoTom.connect(pulsoBatida).connect(pulso).connect(vivo)
  const pulsoVozes = (leve ? [0] : PULSO.naipe).map((desafino) => {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq(CHAO[TONICA]!.acorde.vozes[0])
    osc.detune.value = desafino
    deslocar(osc.detune)
    osc.connect(pulsoTom)
    continuas.push([osc, 0])
    return osc
  })

  // A absorção: rolando para baixo, um sussurro nas notas do coro, uma oitava acima; para cima, o
  // brilho dos jatos, três oitavas acima.
  const succaoTom = ctx.createBiquadFilter()
  succaoTom.type = 'lowpass'
  succaoTom.frequency.value = 2200
  const succao = ctx.createGain()
  succao.gain.value = 0
  succaoTom.connect(succao).connect(vivo)
  const filtrosDaSuccao = ruidoAfinado(branco, [69, 74, 77], 14, succaoTom)
  const jato = ctx.createGain()
  jato.gain.value = 0
  jato.connect(vivo)
  const filtrosDoJato = ruidoAfinado(branco, [93, 98, 101], 22, jato)

  // A queda: o ronco, um grave que zumbe no ré e treme perto do horizonte (duas oscilações rápidas
  // somadas, para o tremor não ficar regular), e o ar correndo, afinado nas notas do coro, mais claro
  // quanto mais depressa se cai.
  const tremor = ctx.createGain()
  const tremura = oscilar(9.3, 0, tremor.gain)
  const tremura2 = oscilar(13.1, 0, tremor.gain)
  const ronco = ctx.createGain()
  ronco.gain.value = 0
  tremor.connect(ronco).connect(vivo)
  const roncoGrave = ctx.createBiquadFilter()
  roncoGrave.type = 'lowpass'
  roncoGrave.frequency.value = 100
  roncoGrave.Q.value = 0.8
  emLaco(marrom).connect(roncoGrave).connect(tremor)
  const roncoNota = ctx.createBiquadFilter()
  roncoNota.type = 'bandpass'
  roncoNota.frequency.value = freq(PEDAL[0]![0])
  roncoNota.Q.value = 4
  deslocar(roncoNota.detune)
  const roncoNotaGanho = ctx.createGain()
  roncoNotaGanho.gain.value = 2
  emLaco(marrom).connect(roncoNota).connect(roncoNotaGanho).connect(tremor)
  const correnteAr = ctx.createBiquadFilter()
  correnteAr.type = 'lowpass'
  correnteAr.frequency.value = 800
  const corrente = ctx.createGain()
  corrente.gain.value = 0
  correnteAr.connect(corrente).connect(vivo)
  const filtrosDaCorrente = ruidoAfinado(branco, [74, 81, 86], 10, correnteAr)

  const inicio = agora()
  for (const [fonte, deOnde] of continuas) {
    if (fonte instanceof AudioBufferSourceNode) fonte.start(inicio, deOnde)
    else fonte.start(inicio)
  }

  // ---------- a harmonia ----------
  /** Quanto da página já se leu (veja Estado), para escolher a seção de cada compasso. */
  let progresso = 0
  /**
   * Onde a música está (o compasso, a metade e a seção do último agendado), que conjunto o canta, e
   * quando vem o próximo. Ela começa no primeiro compasso, já na primeira regência (com o estado da
   * página já dado): daqui, como se viesse do último.
   */
  let posicao = CHAO.length - 1
  let metade: 0 | 1 = 1
  let secao = 0
  let ativo = 0
  /** As trocas recentes, em ordem, para saber que acorde soa num instante (veja acordeEm). */
  let trocas: { t: number; acorde: Acorde }[] = [{ t: inicio, acorde: CHAO[TONICA]!.acorde }]
  /** Perto do horizonte, o tempo passa devagar: a batida dura mais, na mesma medida em que o tom desce. */
  const batidaAgora = () => BATIDA / 2 ** (desvio / 1200)
  let proxima = inicio
  /** A nota do grave fundo (a última agendada). */
  let notaDoGrave = CHAO[TONICA]!.acorde.vozes[0] - 12

  function acordeEm(t: number): Acorde {
    let acorde = trocas[0]!.acorde
    for (const troca of trocas) if (troca.t <= t) acorde = troca.acorde
    return acorde
  }

  /** As vozes do conjunto `c` passam a cantar a vez no instante `t` (com ele calado). */
  function afinar(c: number, vez: Vez, t: number) {
    const notas = [...vez.acorde.vozes, descanteEm(CHAO[vez.posicao]!, vez.metade * (BATIDAS / 2))]
    notas.forEach((nota, v) => {
      for (const osc of vozes[c]![v]!) osc.frequency.setValueAtTime(freq(nota), t)
    })
  }

  /** Os ruídos afinados vão para as notas de `acorde`. */
  function afinarRuidos(acorde: Acorde, t: number) {
    const [baixo, tenor, contralto, soprano] = acorde.vozes
    const ir = (filtros: BiquadFilterNode[], notas: number[]) =>
      filtros.forEach((filtro, k) => filtro.frequency.setTargetAtTime(freq(notas[k]!), t, 0.5))
    ir(filtrosDaSuccao, [tenor + 12, contralto + 12, soprano + 12])
    ir(filtrosDoJato, [tenor + 36, contralto + 36, soprano + 36])
    ir(filtrosDaCorrente, [baixo + 24, tenor + 24, contralto + 24])
  }

  function lembrar(t: number, acorde: Acorde) {
    trocas.push({ t, acorde })
    if (trocas.length > 8) trocas.shift()
  }

  /** O grave fundo vai para `nota` em `t`, respirando um instante (na mesma nota, ele segue). */
  function tocarGrave(nota: number, t: number) {
    if (nota === notaDoGrave) return
    notaDoGrave = nota
    graveVoz.frequency.setTargetAtTime(freq(nota), t, 0.03)
    graveRespira.gain.setTargetAtTime(0.45, Math.max(agora(), t - 0.06), 0.02)
    graveRespira.gain.setTargetAtTime(1, t + 0.03, 0.15)
  }

  /**
   * O pulso de uma vez, a partir de `t`: a nota do grave fundo, uma oitava acima, a cada batida; no fim
   * da página, a cada meia batida, com a oitava de cima no contratempo. Ele bate sempre, calado longe
   * do trecho dele: assim entra na hora em que a rolagem chega lá, sem esperar o compasso seguinte.
   */
  function pulsar(vez: Vez, t: number, batida: number, grave: [number, number][]) {
    const colcheias = progresso >= ENTRA.colcheias
    const cai = colcheias ? PULSO.caiColcheia : PULSO.cai
    const bater = (quando: number, nota: number, forca: number) => {
      for (const osc of pulsoVozes) osc.frequency.setValueAtTime(freq(nota), quando)
      pulsoBatida.gain.setTargetAtTime(forca, quando, 0.008)
      pulsoBatida.gain.setTargetAtTime(PULSO.repouso, quando + 0.05, cai)
    }
    for (let k = 0; k < vez.batidas; k++) {
      const nota = grave.findLast(([b]) => b <= k)![1] + 12
      bater(t + k * batida, nota, 1)
      if (colcheias) bater(t + (k + 0.5) * batida, nota + 12, 0.55)
    }
  }

  /**
   * Ao longo de uma vez, que o conjunto `c` começa a cantar em `t`: as vozes do coro passam pelas notas
   * das linhas delas (veja linhas), o descante pelas dele, o grave fundo segue o baixo (ou o ré do
   * pedal, onde a seção pede) e o pulso bate. No fim da vez, as vozes que vão por passo à nota
   * seguinte já chegam a ela com este conjunto, enquanto ele se cala: assim a nota de passagem não
   * fica soando contra a seguinte; as que saltam, saltam com o outro conjunto, fundidas.
   */
  function ornar(c: number, vez: Vez, t: number, batida: number) {
    const compasso = CHAO[vez.posicao]!
    const desde = vez.metade * (BATIDAS / 2)
    const fim = t + vez.batidas * batida
    const todas = linhas(vez)
    todas.forEach((linha, v) => {
      const constante = v === 3 ? 0.35 : v === 1 && vez.acorde.resolve !== undefined ? 0.5 : 0.07
      for (const [b, nota] of linha) if (b > 0) for (const osc of vozes[c]![v]!) osc.frequency.setTargetAtTime(freq(nota), t + b * batida, constante)
    })
    for (const [b, nota] of compasso.descante) {
      const k = b - desde
      if (k > 0 && k < vez.batidas) for (const osc of vozes[c]![4]!) osc.frequency.setTargetAtTime(freq(nota), t + k * batida, 0.15)
    }
    const ultimas = [...todas.map((linha) => linha.at(-1)![1]), descanteEm(compasso, desde + vez.batidas - 1)]
    const depois = vez.metade === 0 && vez.batidas < BATIDAS ? vezDe(vez.posicao, 1, vez.secao) : vezDe((vez.posicao + 1) % CHAO.length, 0, vez.secao)
    const seguintes = [...depois.acorde.vozes, descanteEm(CHAO[depois.posicao]!, depois.metade * (BATIDAS / 2))]
    ultimas.forEach((ultima, v) => {
      const seguinte = seguintes[v]!
      if (seguinte !== ultima && Math.abs(seguinte - ultima) <= 2) for (const osc of vozes[c]![v]!) osc.frequency.setTargetAtTime(freq(seguinte), fim, 0.08)
    })
    const grave: [number, number][] =
      SECOES[vez.secao]!.pedal && vez.posicao < CHAO.length / 2 ? [[0, PEDAL[0]![0]]] : todas[0]!.map(([b, nota]) => [b, nota - 12])
    for (const [b, nota] of grave) tocarGrave(nota, t + b * batida)
    pulsar(vez, t, batida, grave)
    // na dominante, o ré do pedal fica a meio tom do dó sustenido: ele cede até ela passar
    if (dominante(vez.acorde)) {
      pedalCede.gain.setTargetAtTime(0.25, t, 0.3)
      pedalCede.gain.setTargetAtTime(1, fim, 0.5)
    }
  }

  /** O coro passa para a vez no instante `t`: o conjunto calado a canta, e os dois se fundem. */
  function trocar(vez: Vez, t: number) {
    const novo = 1 - ativo
    afinar(novo, vez, Math.max(agora(), t - 0.02))
    conjuntos[ativo]!.gain.setTargetAtTime(0, t, CORO.sai)
    conjuntos[novo]!.gain.setTargetAtTime(1, t, CORO.entra)
    ornar(novo, vez, t, batidaAgora())
    afinarRuidos(vez.acorde, t)
    ativo = novo
    lembrar(t, vez.acorde)
  }

  /**
   * A vez seguinte: a virada deste compasso, se a seção dele vira, ou o próximo compasso, na seção em
   * que a página está (a seção só muda no começo de um compasso).
   */
  function avancar(): Vez {
    if (metade === 0 && vezDe(posicao, 0, secao).batidas < BATIDAS) metade = 1
    else {
      posicao = (posicao + 1) % CHAO.length
      metade = 0
      secao = secaoDe(progresso)
    }
    return vezDe(posicao, metade, secao)
  }

  // ---------- os efeitos ----------
  function onda(pan: number, forca = 1, quando = agora()) {
    const pico = VOLUME.onda * forca
    if (!(pico > 0)) return
    const t = Math.max(quando, agora())
    // A espiral de dois buracos negros antes da fusão: faltando τ para ela, a frequência é
    // proporcional a τ^(-3/8), e a amplitude, à frequência elevada a 2/3. O chirp é o último trecho
    // dela, até τ de 4 ms, e termina numa nota do acorde. Depois da fusão, o buraco negro novo vibra um
    // instante, um pouco mais agudo (na nota seguinte do acorde), e se aquieta: o zumbido. As duas
    // partes vão numa curva só, em pontos à mesma distância no tempo: um evento depois da curva podia
    // cair dentro dela quando o navegador a começa mais tarde do que o pedido (com o instante pedido já
    // passado no relógio do áudio), e isso é erro.
    const acorde = acordeEm(t)
    const alvos = notasEntre(acorde, ONDA.de, ONDA.ate)
    const nota = alvos[Math.floor(Math.random() * alvos.length)] ?? 69
    const ate = freq(nota)
    const acima = notasEntre(acorde, ate * 1.04, ate * 1.7)[0]
    const vibra = acima === undefined ? 1.12 : freq(acima) / ate
    const duracao = ONDA.espiral + ONDA.zumbido
    const minimo = 0.004
    const cai = Math.log(pico / 0.0001)
    const pontos = 96
    const frequencias = new Float32Array(pontos)
    const amplitudes = new Float32Array(pontos)
    for (let k = 0; k < pontos; k++) {
      const s = (k / (pontos - 1)) * duracao
      if (s <= ONDA.espiral) {
        const f = ate * ((minimo + ONDA.espiral - s) / minimo) ** (-3 / 8)
        frequencias[k] = f
        // (sobe do zero nos primeiros 8 ms: sem estalo no começo)
        amplitudes[k] = pico * (f / ate) ** (2 / 3) * Math.min(1, s / 0.008)
      } else {
        const depois = s - ONDA.espiral
        frequencias[k] = ate * (1 + (vibra - 1) * Math.min(1, depois / 0.03))
        amplitudes[k] = pico * Math.exp((-cai * depois) / ONDA.zumbido)
      }
    }
    const voz = ctx.createOscillator()
    voz.type = 'triangle'
    voz.frequency.setValueCurveAtTime(frequencias, t, duracao)
    const soltar = deslocar(voz.detune)
    const ganho = ctx.createGain()
    ganho.gain.value = 0
    ganho.gain.setValueCurveAtTime(amplitudes, t, duracao)
    const macio = ctx.createBiquadFilter()
    macio.type = 'lowpass'
    macio.frequency.value = 2200
    voz.connect(macio).connect(ganho)
    voz.start(t)
    despachar(ganho, pan, ECO.onda, [voz], t + duracao + 0.02, soltar)
  }

  // O tique: um sino pequeno, de parciais da série (sem nada fora do acorde), numa nota do acorde. A
  // cada tique, a nota seguinte, para cima: passando por uma lista de links, sai um arpejo.
  let degrau = 0
  let ultimoToque = -Infinity
  function toque(quando = agora()) {
    const t = Math.max(quando, agora())
    if (t - ultimoToque > TOQUE.recomeca) degrau = 0
    ultimoToque = t
    const notas = notasEntre(acordeEm(t), TOQUE.de, TOQUE.ate)
    const nota = notas[degrau % Math.max(1, notas.length)] ?? 86
    degrau++
    const f = freq(nota)
    const ganho = ctx.createGain()
    const fontes: OscillatorNode[] = []
    const tons: AudioParam[] = []
    for (const [multiplo, quanto, dura] of [
      [1, 1, 0.09],
      [2, 0.22, 0.05],
      [3, 0.08, 0.03],
    ] as const) {
      const voz = ctx.createOscillator()
      voz.frequency.value = f * multiplo
      tons.push(voz.detune)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(VOLUME.toque * quanto, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dura)
      voz.connect(g).connect(ganho)
      voz.start(t)
      fontes.push(voz)
    }
    despachar(ganho, (Math.random() * 2 - 1) * 0.2, ECO.toque, fontes, t + 0.1, deslocar(...tons))
  }

  function tema(escuro: boolean, quando = agora()) {
    const t0 = Math.max(quando, agora())
    // o soprano e o contralto do acorde, uma oitava acima: descendo para o escuro, subindo para o claro
    const vozesAgora = acordeEm(t0).vozes
    const notas = escuro ? [vozesAgora[3] + 12, vozesAgora[2] + 12] : [vozesAgora[2] + 12, vozesAgora[3] + 12]
    notas.forEach((nota, i) => {
      const t = t0 + i * 0.09
      const ganho = ctx.createGain()
      ganho.gain.setValueAtTime(0, t)
      ganho.gain.linearRampToValueAtTime(VOLUME.tema, t + 0.01)
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      const voz = ctx.createOscillator()
      voz.frequency.value = freq(nota)
      // e uma oitava abaixo, mais baixa, para dar corpo
      const oitava = ctx.createOscillator()
      oitava.type = 'triangle'
      oitava.frequency.value = freq(nota - 12)
      const g = ctx.createGain()
      g.gain.value = 0.4
      voz.connect(ganho)
      oitava.connect(g).connect(ganho)
      voz.start(t)
      oitava.start(t)
      despachar(ganho, i === 0 ? -0.15 : 0.15, ECO.tema, [voz, oitava], t + 0.62, deslocar(voz.detune, oitava.detune))
    })
  }

  /** O ponto de luz que acende no escuro: um tom de vidro, agudo e quieto, na quinta e na tônica do pouso, com um batimento lento. */
  function luz(t0: number, duracao: number) {
    const ganho = ctx.createGain()
    ganho.gain.setValueAtTime(0, t0)
    ganho.gain.linearRampToValueAtTime(VOLUME.luz, t0 + 0.08 * duracao)
    ganho.gain.setTargetAtTime(0, t0 + 0.3 * duracao, 0.12 * duracao)
    const fontes: OscillatorNode[] = []
    const tons: AudioParam[] = []
    for (const [nota, desafino, quanto] of [
      [81, 0, 1],
      [81, 8, 0.8],
      [86, 0, 0.35],
    ] as const) {
      const voz = ctx.createOscillator()
      voz.frequency.value = freq(nota)
      voz.detune.value = desafino
      tons.push(voz.detune)
      const g = ctx.createGain()
      g.gain.value = quanto
      voz.connect(g).connect(ganho)
      voz.start(t0)
      fontes.push(voz)
    }
    despachar(ganho, 0, ECO.luz, fontes, t0 + duracao, deslocar(...tons))
  }

  /**
   * O site vindo lá do fundo: um sopro afinado nas notas do pouso, que clareia no ritmo em que ele se
   * aproxima (a mesma conta dos rastros da entrada, veja vistaDaEntrada em entrada.ts) e se acalma
   * antes de ele chegar.
   */
  function sopro(t0: number, duracao: number) {
    const pontos = 64
    const claro = new Float32Array(pontos)
    const ganhos = new Float32Array(pontos)
    for (let k = 0; k < pontos; k++) {
      const u = k / (pontos - 1)
      const perto = 4 * u * (1 - u)
      claro[k] = 300 * 16 ** suave(0, 0.85, u)
      ganhos[k] = VOLUME.sopro * perto ** 1.3 * suave(0.03, 0.15, u) * (1 - suave(0.62, 0.86, u))
    }
    const fonte = ctx.createBufferSource()
    fonte.buffer = branco
    fonte.loop = true
    const clarear = ctx.createBiquadFilter()
    clarear.type = 'lowpass'
    clarear.frequency.setValueCurveAtTime(claro, t0, duracao)
    const ganho = ctx.createGain()
    ganho.gain.value = 0
    ganho.gain.setValueCurveAtTime(ganhos, t0, duracao)
    const tons: AudioParam[] = []
    for (const nota of [62, 69, 74, 77, 81, 86]) {
      const filtro = ctx.createBiquadFilter()
      filtro.type = 'bandpass'
      filtro.frequency.value = freq(nota)
      filtro.Q.value = 16
      tons.push(filtro.detune)
      fonte.connect(filtro).connect(clarear)
    }
    clarear.connect(ganho)
    fonte.start(t0, Math.random() * branco.duration)
    despachar(ganho, 0, ECO.sopro, [fonte], t0 + duracao, deslocar(...tons))
  }

  /** O site pousa: o acorde da tônica, que se abre e se apaga devagar, e um baque grave de leve, do ré ao ré de baixo. */
  function pouso(t: number, forca: number, comBaque: boolean) {
    const notas: [number, number, number][] = [
      [50, 1, 0],
      [57, 0.75, -0.3],
      [62, 0.6, 0.3],
      [65, 0.45, -0.45],
      [69, 0.35, 0.45],
    ]
    for (const [nota, quanto, pan] of notas) {
      const ganho = ctx.createGain()
      ganho.gain.setValueAtTime(0, t)
      ganho.gain.linearRampToValueAtTime(VOLUME.acorde * quanto * forca, t + 0.05)
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
      const voz = ctx.createOscillator()
      voz.frequency.value = freq(nota)
      voz.connect(ganho)
      voz.start(t)
      despachar(ganho, pan, ECO.acorde, [voz], t + 3.25, deslocar(voz.detune))
    }
    if (!comBaque) return
    const baque = ctx.createOscillator()
    baque.frequency.setValueAtTime(freq(PEDAL[0]![0]), t)
    baque.frequency.exponentialRampToValueAtTime(freq(SUB), t + 0.2)
    const ganho = ctx.createGain()
    ganho.gain.setValueAtTime(0, t)
    ganho.gain.linearRampToValueAtTime(VOLUME.baque * forca, t + 0.008)
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    baque.connect(ganho)
    baque.start(t)
    despachar(ganho, 0, 0, [baque], t + 0.5, deslocar(baque.detune))
  }

  const seguir = {
    vivo: seguidor(vivo.gain),
    lado: seguidor(lado.pan),
    coro: seguidor(coro.gain),
    escuro: seguidor(escuro.frequency),
    formantes: formantes.map((filtro) => seguidor(filtro.frequency)),
    pesos: partes.map((doConjunto) => doConjunto.map((parte) => seguidor(parte.gain))),
    fundoSeco: seguidor(fundoSeco.gain),
    grave: seguidor(grave.gain),
    pulso: seguidor(pulso.gain),
    pulsoTom: seguidor(pulsoTom.frequency),
    pedal: seguidor(pedal.gain),
    pedalGrave: seguidor(pedalGanhos[0]!.gain),
    sub: seguidor(sub.gain),
    vermelho: seguidor(vermelho.offset),
    succao: seguidor(succao.gain),
    jato: seguidor(jato.gain),
    ronco: seguidor(ronco.gain),
    roncoGrave: seguidor(roncoGrave.frequency),
    tremura: seguidor(tremura.gain),
    tremura2: seguidor(tremura2.gain),
    corrente: seguidor(corrente.gain),
    correnteAr: seguidor(correnteAr.frequency),
  }

  return {
    ajustar(e) {
      const queda = e.animado ? e.mergulho : 0
      const perto = e.perto
      const lido = e.progresso
      progresso = lido
      seguir.vivo(1 - suave(SILENCIO.de, SILENCIO.ate, e.mergulho), 0.08)
      // no mergulho ele vem para o meio da tela
      seguir.lado(limitar(e.lado, -1, 1) * 0.7 * (1 - suave(0, 0.45, queda)), 0.3)
      // A música cresce ao longo da página: o coro e as camadas que entram (o grave fundo, o descante e
      // o pulso), tudo mais um pouco no começo da queda. O pedal e o ré mais grave crescem com o buraco
      // negro, e o ré grave do pedal, quase calado na página, vem na queda.
      const cresce = 1 + 0.25 * suave(0, 0.5, queda)
      const fundo = suave(ENTRA.grave[0], ENTRA.grave[1], lido)
      const pulsa = suave(ENTRA.pulso[0], ENTRA.pulso[1], lido)
      seguir.coro(VOLUME.coro * misturar(NO_TOPO.coro, 1, lido) * cresce, 0.6)
      seguir.grave(VOLUME.grave * fundo * cresce, 0.8)
      seguir.pulso(VOLUME.pulso * compensa * pulsa * cresce, 0.6)
      seguir.pulsoTom(misturar(PULSO.filtro[0], PULSO.filtro[1], suave(ENTRA.pulso[0], 1, lido)), 0.8)
      seguir.pedal(VOLUME.pedal * misturar(NO_TOPO.pedal, 1, perto) * (1 + 0.4 * suave(0, 0.6, queda)), 0.6)
      seguir.pedalGrave(PEDAL[0]![2] * misturar(GRAVE_DO_PEDAL, 1, suave(0.1, 0.6, queda)), 0.8)
      seguir.sub(VOLUME.sub * misturar(NO_TOPO.sub, 1, perto ** 2) * (1 + 0.8 * suave(0, 0.8, queda)), 0.5)
      // a vogal se abre, o coro clareia e chega mais perto (mais direto, menos eco), e o descante entra
      const abre = limitar(0.1 + 0.75 * lido + 0.15 * suave(0, 0.5, queda))
      seguir.formantes.forEach((ir, i) => ir(misturar(VOGAL.fechada[i]!, VOGAL.aberta[i]!, abre), 0.8))
      seguir.escuro(misturar(BRILHO[0], BRILHO[1], lido), 0.8)
      seguir.fundoSeco(misturar(FUNDO.seco[0], FUNDO.seco[1], lido), 0.8)
      const descante = suave(ENTRA.descante[0], ENTRA.descante[1], lido)
      seguir.pesos.forEach((doConjunto) =>
        doConjunto.forEach((ir, v) => {
          const [topo, fim] = CORO.peso[v]!
          ir((v === 4 ? fim * descante : misturar(topo, fim, lido)) * compensa, 0.8)
        }),
      )
      // o desvio para o vermelho, só no mergulho: tudo desce de tom junto, e a música fica mais lenta
      desvio = DESVIO.mergulho * suave(0, 0.95, queda) ** 1.5
      seguir.vermelho(desvio, 0.25)
      seguir.succao(VOLUME.succao * e.descendo, 0.1)
      seguir.jato(VOLUME.jato * e.subindo, 0.1)
      seguir.ronco(VOLUME.ronco * suave(0.04, 0.9, queda) ** 1.6, 0.15)
      seguir.roncoGrave(90 + 650 * queda ** 1.4, 0.15)
      const treme = 0.4 * suave(0.55, 0.9, queda)
      seguir.tremura(treme, 0.2)
      seguir.tremura2(treme * 0.8, 0.2)
      seguir.corrente(VOLUME.corrente * suave(0.08, 0.8, queda) * (0.45 + 0.55 * e.rapidez), 0.12)
      seguir.correnteAr(800 + 3200 * queda * (0.5 + 0.5 * e.rapidez), 0.12)
    },

    reger() {
      const t = agora()
      // (o contexto pode ter parado, com a aba escondida ou o som desligado)
      if (proxima < t + 0.05) proxima = t + 0.05
      while (proxima < t + ADIANTE) {
        const vez = avancar()
        trocar(vez, proxima)
        proxima += vez.batidas * batidaAgora()
      }
    },

    ligar(pan) {
      const t = agora()
      geral.gain.cancelScheduledValues(t)
      geral.gain.setTargetAtTime(VOLUME.geral, t, 0.03)
      // o coro vem do silêncio, devagar
      volta.gain.cancelScheduledValues(t)
      volta.gain.setValueAtTime(volta.gain.value, t)
      volta.gain.setTargetAtTime(1, t, 0.8)
      if (pan !== undefined) onda(pan, 1, t + 0.02)
    },

    desligar() {
      const t = agora()
      geral.gain.cancelScheduledValues(t)
      geral.gain.setTargetAtTime(0, t, 0.06)
    },

    onda,
    toque,
    tema,

    voltar(comeco, duracao, soFade) {
      const t = agora()
      const t0 = Math.max(comeco, t)
      // O silêncio do fim do mergulho fica até o ponto de luz acender, e o fundo volta enquanto o site
      // chega (a página já está no topo, e o estado, como lá).
      volta.gain.cancelScheduledValues(t)
      volta.gain.setValueAtTime(0, t)
      volta.gain.setValueAtTime(0, t0 + (soFade ? 0 : 0.12 * duracao))
      volta.gain.linearRampToValueAtTime(1, t0 + (soFade ? 1 : 0.95) * duracao)
      // A harmonia recomeça, com tudo ainda calado: um conjunto do coro já com o acorde suspenso, que
      // entra com a luz, e o outro com o ré menor, que entra quando o site pousa (sem o suspenso, com o
      // movimento reduzido, direto no ré menor).
      const pousa = soFade ? t0 : t0 + 0.84 * duracao
      // (as trocas que já estavam agendadas para depois de agora não acontecem mais)
      trocas = trocas.filter((troca) => troca.t <= t)
      for (const conjunto of conjuntos) {
        conjunto.gain.cancelScheduledValues(t)
        conjunto.gain.setValueAtTime(0, t)
      }
      for (const osc of [...vozes.flat(2), graveVoz, ...pulsoVozes]) osc.frequency.cancelScheduledValues(t)
      for (const filtro of [...filtrosDaSuccao, ...filtrosDoJato, ...filtrosDaCorrente]) filtro.frequency.cancelScheduledValues(t)
      graveRespira.gain.cancelScheduledValues(t)
      graveRespira.gain.setValueAtTime(1, t)
      pulsoBatida.gain.cancelScheduledValues(t)
      pulsoBatida.gain.setValueAtTime(PULSO.repouso, t)
      pedalCede.gain.cancelScheduledValues(t)
      pedalCede.gain.setValueAtTime(1, t)
      // a música recomeça do topo, na câmara (o tempo da volta já não tem o vermelho)
      progresso = 0
      secao = 0
      posicao = TONICA
      metade = 0
      const suspensa = vezDe(SUSPENSO, 0, 0)
      const tonica = vezDe(TONICA, 0, 0)
      const comSuspenso = ativo
      const comTonica = 1 - ativo
      afinar(comSuspenso, suspensa, t)
      afinar(comTonica, tonica, t)
      notaDoGrave = suspensa.acorde.vozes[0] - 12
      graveVoz.frequency.setValueAtTime(freq(notaDoGrave), t)
      if (!soFade) {
        conjuntos[comSuspenso]!.gain.setTargetAtTime(1, t0, 0.6)
        conjuntos[comSuspenso]!.gain.setTargetAtTime(0, pousa, 1.2)
        afinarRuidos(suspensa.acorde, t)
        lembrar(t0, suspensa.acorde)
      }
      conjuntos[comTonica]!.gain.setTargetAtTime(1, pousa, 0.5)
      ornar(comTonica, tonica, pousa, BATIDA)
      afinarRuidos(tonica.acorde, pousa)
      lembrar(pousa, tonica.acorde)
      ativo = comTonica
      proxima = pousa + tonica.batidas * BATIDA
      if (soFade) {
        pouso(t0, 0.7, false)
        return
      }
      // o coro chega mais agudo, a luz vindo na nossa direção, e assenta no tom de sempre
      azul.offset.cancelScheduledValues(t)
      azul.offset.setValueAtTime(0, t)
      azul.offset.setValueAtTime(DESVIO.azul, t0)
      azul.offset.setTargetAtTime(0, t0 + 0.3 * duracao, 0.22 * duracao)
      luz(t0, duracao)
      sopro(t0, duracao)
      pouso(pousa, 1, true)
    },
  }
}
