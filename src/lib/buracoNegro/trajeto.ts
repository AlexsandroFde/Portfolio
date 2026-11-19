// O trajeto do buraco negro: onde ele está, de que tamanho e de que ângulo é visto, em cada posição
// da rolagem. Ele não depende do tempo nem do que acontece na página, só da rolagem e do tamanho da
// tela: por isso é calculado de antemão, uma posição para cada pixel de rolagem (veja tabelar), e a
// animação só lê a tabela. A thread principal usa o caminho ao longo da página (a absorção mira nele);
// o motor que desenha o buraco negro (veja motor.ts) usa a tabela inteira, mergulho incluído.
//
// Nada aqui toca na página: o mesmo código roda na thread principal e no worker do motor.

/**
 * No topo da página, o buraco negro fica no canto de cima à direita, logo abaixo do cabeçalho, com o
 * centro um pouco para dentro da tela (em frações do raio da sombra): aparece cerca de um terço
 * dele, e o resto do site fica livre. Ao longo da página ele anda pelo alto da tela até o meio dela
 * e cresce (veja alvoEm), e o mergulho, depois do fim, continua dali.
 */
export const CANTO = { x: 0.45, y: 0.45 }
/**
 * Quantas vezes o buraco negro cresce do topo ao fim da página, cada vez mais perto, com a parte de
 * baixo parada na mesma altura (veja alvoEm).
 */
export const ZOOM_PAGINA = 3
/**
 * Ângulo da câmera acima do plano do disco, e a rotação da imagem na tela. Quase de lado, como em
 * Interstellar: o disco vira uma faixa fina na altura do centro, cruzando a frente da sombra, e a
 * luz da parte de trás dele dá a volta na sombra por cima e por baixo, em arcos. A faixa do disco
 * fica na altura da faixa de absorção, e o conteúdo vai até ela de lado, sem descer pela página.
 */
export const INCLINACAO = (18 * Math.PI) / 180
export const GIRO = 0
/**
 * O ponto mais baixo do buraco negro, em raios da sombra abaixo do centro: a borda de baixo do arco
 * de luz que contorna a sombra por baixo, medida no desenho com esta inclinação. É ele que fica
 * parado na mesma altura enquanto o buraco negro cresce ao longo da página (veja alvoEm).
 */
export const BASE = 1.5
/** Quanto a câmera ainda sobe do começo ao fim da página (rad): o disco se abre um pouco. */
export const SUBIDA = 0.02
/**
 * Sentido da rotação do disco: o lado esquerdo vem na direção da câmera e brilha mais. No canto da
 * tela é a ponta que fica à vista.
 */
export const SENTIDO = -1
/** A malha sobe a pouco mais da metade da velocidade da página: fica entre o conteúdo e o buraco negro. */
export const PARALAXE_MALHA = 0.55
/**
 * O mergulho, depois do fim da página (veja mergulho.ts), em frações do trecho dele: o buraco negro
 * desce do alto até o meio da tela em `chegada` e cresce cada vez mais rápido (o progresso elevado a
 * `aceleracao`) até a sombra cobrir a tela toda em `cobre`. Enquanto ele cresce, o meio da tela
 * passa a mirar `mira` raios acima do centro dele: a faixa do disco que cruza a sombra sai de vista
 * por baixo, e só sobra o preto (veja raioQueCobre). `folga` é a margem no tamanho final.
 */
export const MERGULHO = { chegada: 0.45, aceleracao: 1.4, cobre: 0.92, mira: 0.38, folga: 1.08 }
/**
 * Onde passa a borda de cima da faixa do disco que cruza a frente da sombra, abaixo do centro, em
 * raios da sombra: a borda de dentro do disco (3 raios de Schwarzschild; a sombra tem 3√3/2), vista
 * pela câmera mais baixa que o ponteiro deixa.
 */
const FAIXA_DO_DISCO = (3 / 2.598) * Math.sin(INCLINACAO - 0.04)

/** O buraco negro na tela (px CSS). */
export interface Alvo {
  x: number
  y: number
  /** Raio da sombra. */
  raio: number
}

/**
 * O caminho do buraco negro ao longo da página: com a página no topo ele está em `alvo`; até a
 * rolagem `ate`, anda pelo alto da tela, em linha reta e no mesmo ritmo, `dx` px para o lado,
 * crescendo até `zoom` vezes o tamanho, com o ponto mais baixo, `base` raios da sombra abaixo do
 * centro, sempre na mesma altura (veja alvoEm).
 */
export interface Caminho {
  alvo: Alvo
  caminho: { dx: number; ate: number; zoom: number; base: number }
}

/**
 * Onde o buraco negro está, e de que tamanho, com a página rolada até `s`. Ao longo dela ele anda
 * pelo alto da tela e cresce, cada vez mais perto, sempre no mesmo ritmo, com o ponto mais baixo
 * dele parado na mesma altura: o resto dele cresce para cima e para os lados.
 */
export function alvoEm({ alvo, caminho }: Caminho, s: number): Alvo {
  const t = Math.min(1, Math.max(0, s / Math.max(1, caminho.ate)))
  const raio = alvo.raio * caminho.zoom ** t
  const fundo = alvo.y + caminho.base * alvo.raio
  return { x: alvo.x + caminho.dx * t, y: fundo - caminho.base * raio, raio }
}

/** As medidas da tela e da página de que o trajeto depende (px CSS), tiradas na thread principal. */
export interface Palco {
  /** Largura do canvas. */
  largura: number
  /** Altura da tela grande (100lvh), que não muda com a barra do navegador (veja alturaDaTela, em index.ts). */
  alturaTela: number
  /** Até onde vai o cabeçalho fixo, a partir do alto da tela. */
  topo: number
  /** A rolagem em que o conteúdo acabou e começa o espaço do mergulho. */
  fimDoCaminho: number
  /** Altura da apresentação, onde a malha aparece no topo da página. */
  alturaHero: number
  /** Lado do quadrado da malha. */
  celula: number
  /** O trecho do mergulho (rolagem do começo e do fim), ou null sem ele. */
  mergulho: { inicio: number; fim: number } | null
  /** A maior rolagem possível. */
  rolagemMaxima: number
}

/** Raio da sombra no canto: grande o bastante para a parte que fica à vista não sumir. */
export function raioNoCanto(palco: Palco): number {
  return Math.min(92, Math.max(46, Math.max(palco.largura, palco.alturaTela) * 0.058))
}

/** O caminho ao longo da página, do canto até o meio do alto da tela (veja alvoEm). */
export function caminhoDaPagina(palco: Palco): Caminho {
  const raio = raioNoCanto(palco)
  const x = palco.largura - raio * CANTO.x
  return {
    alvo: { x, y: palco.topo + raio * CANTO.y, raio },
    caminho: { dx: palco.largura / 2 - x, ate: palco.fimDoCaminho, zoom: ZOOM_PAGINA, base: BASE },
  }
}

export const suave = (de: number, ate: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - de) / (ate - de)))
  return t * t * (3 - 2 * t)
}

/**
 * O raio da sombra com que ela cobre a tela inteira (meia largura `w` e meia altura `h`, px), com o
 * meio da tela mirando MERGULHO.mira raios acima do centro dela: os cantos de cima ficam dentro da
 * sombra, e a borda de baixo, acima da faixa do disco.
 */
function raioQueCobre(w: number, h: number): number {
  const c = MERGULHO.mira
  const pelaBorda = h / (c + FAIXA_DO_DISCO)
  const pelosCantos = (c * h + Math.sqrt(c * c * h * h + (1 - c * c) * (w * w + h * h))) / (1 - c * c)
  return MERGULHO.folga * Math.max(pelaBorda, pelosCantos)
}

/** Quanto já se mergulhou com a página rolada até `s`: 0 até o começo do trecho, 1 no fim dele. */
export function progressoDoMergulho(palco: Palco, s: number): number {
  const trecho = palco.mergulho
  if (!trecho) return 0
  return Math.min(1, Math.max(0, (s - trecho.inicio) / Math.max(1, trecho.fim - trecho.inicio)))
}

/** O buraco negro numa posição da rolagem, sem o que vem do ponteiro. */
export interface Posicao extends Alvo {
  /** Quanto o buraco negro já cresceu no mergulho (1 fora dele). */
  zoom: number
  /** De 0 a 1: quanto a câmera já subiu ao longo da página (veja SUBIDA). */
  subida: number
}

/**
 * O buraco negro com a página rolada até `s`: ao longo da página, pelo alto da tela (o mesmo
 * caminho que a absorção segue); depois do fim dela, ele desce até o meio da tela e cresce até a
 * sombra cobri-la toda.
 */
export function posicaoEm(palco: Palco, s: number): Posicao {
  let { x, y, raio } = alvoEm(caminhoDaPagina(palco), s)
  let zoom = 1
  const p = progressoDoMergulho(palco, s)
  if (p > 0) {
    const meioX = palco.largura / 2
    const meioY = palco.alturaTela / 2
    zoom = Math.max(1, raioQueCobre(meioX, meioY) / raio) ** (Math.min(1, p / MERGULHO.cobre) ** MERGULHO.aceleracao)
    raio *= zoom
    const ida = suave(0, MERGULHO.chegada, p)
    const mira = MERGULHO.mira * suave(MERGULHO.chegada, MERGULHO.cobre, p)
    x += (meioX - x) * ida
    y += (meioY + mira * raio - y) * ida
  }
  // a câmera sobe um pouco ao longo da página (até o fim dela, onde começa o mergulho)
  return { x, y, raio, zoom, subida: Math.min(1, s / Math.max(1, palco.fimDoCaminho)) }
}

/** Quantos números a tabela guarda por posição (veja tabelar). */
const CAMPOS = 5

/** O trajeto inteiro, calculado de antemão: uma posição a cada pixel de rolagem (veja lerTabela). */
export interface Tabela {
  dados: Float32Array
  /** Quantas posições há na tabela (a última é a da maior rolagem). */
  posicoes: number
}

/**
 * Calcula de antemão o trajeto do buraco negro por toda a rolagem, do topo da página ao fim do
 * mergulho: uma posição para cada pixel CSS de rolagem. Entre dois pixels, a posição vai em linha
 * reta (veja lerTabela): o trajeto muda devagar e sem quinas, e a diferença fica bem abaixo de um
 * pixel da tela.
 */
export function tabelar(palco: Palco): Tabela {
  const posicoes = Math.max(2, Math.ceil(palco.rolagemMaxima) + 2)
  const dados = new Float32Array(posicoes * CAMPOS)
  for (let i = 0; i < posicoes; i++) {
    const { x, y, raio, zoom, subida } = posicaoEm(palco, i)
    dados.set([x, y, raio, zoom, subida], i * CAMPOS)
  }
  return { dados, posicoes }
}

/** A posição tabelada para a rolagem `s` (entre dois pixels de rolagem, em linha reta). */
export function lerTabela({ dados, posicoes }: Tabela, s: number): Posicao {
  const v = Math.min(posicoes - 1, Math.max(0, s))
  const i = Math.min(posicoes - 2, Math.floor(v))
  const f = v - i
  const a = i * CAMPOS
  const b = a + CAMPOS
  const em = (k: number) => (dados[a + k] ?? 0) + ((dados[b + k] ?? 0) - (dados[a + k] ?? 0)) * f
  return { x: em(0), y: em(1), raio: em(2), zoom: em(3), subida: em(4) }
}
