// Mede a fluidez das animações do site, de um jeito que dá para repetir: abre o build (o mesmo que o
// `npm run preview` serve) num Chrome ou Edge instalado e, em cada combinação de tela (desktop e
// celular) e de CPU (sem limitação e 4 ou 6 vezes mais lenta), percorre a página:
//
//   - constante: do topo ao fim do conteúdo, numa velocidade fixa;
//   - rajadas: do topo, trancos rápidos com pausas entre eles;
//   - mergulho: do fim do conteúdo até a volta ao topo, com a entrada do site;
//   - parado: alguns segundos parado nos projetos, com os vídeos tocando;
//   - barra e semBarra (só quando pedidas em --fases): três trechos de rolagem com a barra de
//     endereço do celular sumindo e voltando no meio (a janela muda de altura), e o mesmo sem ela;
//   - logo (só quando pedida em --fases): a página aberta de novo e, assim que o buraco negro
//     aparece, do topo ao fim do conteúdo como na constante, sem esperar as fotos dos blocos (a
//     absorção as faz com pressa pelo caminho, como para quem rola logo que a página abre).
//
// A rolagem vem da roda do mouse sintetizada pelo próprio navegador (Input.synthesizeScrollGesture),
// numa velocidade que não depende da página: com a CPU mais lenta, a roda continua no mesmo ritmo. O
// toque não entra: o Chrome sem janela não sintetiza o gesto do dedo, e os toques avulsos esperam a
// página a cada evento (a velocidade deixaria de ser a pedida). A velocidade que a página de fato
// atingiu também é registrada.
//
// Para cada fase, registra:
//   - o intervalo entre quadros da página (requestAnimationFrame): p50, p95, p99 e quantos passam de
//     16,7 ms e de 33,3 ms;
//   - as tarefas longas (longtask) e os quadros longos (long-animation-frame);
//   - quanto a thread principal ficou ocupada (a soma das tarefas dela no trace);
//   - por quadro da thread principal, o tempo de estilo, layout e pintura (PrePaint, Paint e
//     Layerize), e os layouts e estilos forçados pelo JavaScript, com as funções que os forçaram;
//   - os quadros do compositor (os que chegam à tela): apresentados, perdidos e com conteúdo ainda
//     sem rasterizar (uma fatia sem desenho apareceria assim);
//   - o intervalo entre quadros do motor do buraco negro (o worker);
//   - quanto a GPU e a rasterização ficaram ocupadas;
//   - se o modo lento foi ativado (o buraco negro parado no alto da página, sem absorção).
//
// Uso (depois de `npm run build`):
//   npm run medir
//   npm run medir -- --rotulo depois-do-x --cpu 1,6 --telas celular --fases constante,rajadas
//   npm run medir -- --css "header { backdrop-filter: none !important }"
//
// Opções: --rotulo (nome do arquivo em medicoes/), --cpu (lista), --telas (desktop, celular),
// --fases (constante, rajadas, mergulho, parado, barra, semBarra, logo), --velocidade (px/s da fase constante), --pagina
// (caminho dentro do site, por exemplo en/), --css (regras injetadas antes da página, para comparar
// uma mudança sem mexer no código), --raiz (a pasta de outro checkout do projeto, já com o build, para
// comparar com uma versão anterior), --porta e --escala (a escala da tela emulada, no lugar da de cada
// tela: com escala diferente de 1, a roda sintética chega ao JavaScript dividida pela escala, mas o
// navegador rola a distância inteira, e uma rolagem feita pelo JavaScript, como a rolagem suave, anda
// menos que a do navegador com o mesmo gesto).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'

const raiz = fileURLToPath(new URL('..', import.meta.url))

const TELAS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1.25, isMobile: false, hasTouch: false },
  celular: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
}

/** As rajadas: trancos de DISTANCIA px a VELOCIDADE px/s, com PAUSA ms entre eles, até QUANTAS. */
const RAJADA = { distancia: 900, velocidade: 5000, pausa: 350, quantas: 14 }
/** Quanto esperar (ms) depois de o efeito aparecer, para a absorção e as fotos ficarem prontas. */
const ASSENTAR = 4000
/** Quanto tempo (ms) parado nos projetos. */
const PARADO = 4000

/** As categorias do trace: os eventos da linha do tempo, dos quadros, as pilhas dos layouts forçados e o motor. */
const CATEGORIAS = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'blink',
]

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
]

function lerOpcoes(argv) {
  const opcoes = {
    rotulo: 'linha-de-base',
    cpu: [1, 4, 6],
    telas: ['desktop', 'celular'],
    fases: ['constante', 'rajadas', 'mergulho', 'parado'],
    velocidade: 1500,
    pagina: '',
    css: '',
    raiz,
    porta: 4321,
    escala: 0,
  }
  for (let i = 0; i < argv.length; i++) {
    const nome = argv[i]?.replace(/^--/, '')
    const valor = argv[i + 1] ?? ''
    if (!nome || !(nome in opcoes)) continue
    i++
    if (nome === 'cpu') opcoes.cpu = valor.split(',').map(Number)
    else if (nome === 'telas' || nome === 'fases') opcoes[nome] = valor.split(',').filter(Boolean)
    else if (nome === 'velocidade' || nome === 'porta' || nome === 'escala') opcoes[nome] = Number(valor)
    else opcoes[nome] = valor
  }
  return opcoes
}

const espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

/** O p-ésimo percentil (0 a 100) de uma lista já ordenada. */
const percentil = (ordenada, p) => (ordenada.length ? ordenada[Math.min(ordenada.length - 1, Math.floor((p / 100) * ordenada.length))] : 0)
const arredondar = (v, casas = 1) => Math.round(v * 10 ** casas) / 10 ** casas

/** Os intervalos (ms) entre instantes seguidos, e o resumo deles. */
function resumirIntervalos(instantes) {
  const intervalos = instantes.slice(1).map((t, i) => t - (instantes[i] ?? t))
  const ordenados = [...intervalos].sort((a, b) => a - b)
  return {
    quadros: intervalos.length,
    p50: arredondar(percentil(ordenados, 50)),
    p95: arredondar(percentil(ordenados, 95)),
    p99: arredondar(percentil(ordenados, 99)),
    maior: arredondar(ordenados.at(-1) ?? 0),
    acima16: intervalos.filter((v) => v > 16.7).length,
    acima33: intervalos.filter((v) => v > 33.3).length,
  }
}

/**
 * O que roda na página antes dela: um laço de requestAnimationFrame que anota cada quadro, os
 * observadores de tarefas e quadros longos, das pinturas e os marcos do buraco negro.
 */
function instalarMedidor() {
  const medida = { quadros: [], longas: [], quadrosLongos: [], marcos: {} }
  window.__medida = medida
  const marcar = (nome) => {
    if (!(nome in medida.marcos)) medida.marcos[nome] = performance.now()
  }
  const anotar = (agora) => {
    medida.quadros.push(agora)
    const fundo = document.querySelector('.buraco-negro')
    if (fundo?.hasAttribute('data-ativo')) marcar('buracoNegroAtivo')
    if (fundo?.hasAttribute('data-preso')) marcar('modoLento')
    if (document.querySelector('[data-copias-buraco-negro]')) marcar('absorcaoComecou')
    requestAnimationFrame(anotar)
  }
  requestAnimationFrame(anotar)
  const observar = (tipo, guardar) => {
    try {
      new PerformanceObserver((lista) => lista.getEntries().forEach(guardar)).observe({ type: tipo, buffered: true })
    } catch {
      // tipo que este navegador não conhece
    }
  }
  observar('longtask', (e) => medida.longas.push([e.startTime, e.duration]))
  observar('long-animation-frame', (e) =>
    medida.quadrosLongos.push([
      e.startTime,
      e.duration,
      e.blockingDuration,
      (e.scripts ?? [])
        .map((s) => s.sourceFunctionName || s.invoker)
        .slice(0, 3)
        .join(' | '),
    ]),
  )
  observar('paint', (e) => e.name === 'first-contentful-paint' && (medida.marcos.primeiraPintura = e.startTime))
  observar('largest-contentful-paint', (e) => (medida.marcos.maiorPintura = e.startTime))
}

/** A thread principal, os workers e a GPU no trace, e o que se mede em cada um. */
function analisarTrace(texto, duracao) {
  const { traceEvents: eventos } = JSON.parse(texto)
  const threads = new Map()
  const processos = new Map()
  for (const e of eventos) {
    if (e.ph !== 'M') continue
    if (e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args.name)
    if (e.name === 'process_name') processos.set(e.pid, e.args.name)
  }
  // A thread principal da página: a CrRendererMain que mais roda callbacks de requestAnimationFrame
  // (o worker do motor também roda os dele).
  const contagem = new Map()
  for (const e of eventos) {
    const k = `${e.pid}:${e.tid}`
    if (e.name === 'FrameRequestCallbackCollection::ExecuteFrameCallbacks' && threads.get(k) === 'CrRendererMain') contagem.set(k, (contagem.get(k) ?? 0) + 1)
  }
  const principal = [...contagem].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!principal) return null
  const pid = Number(principal.split(':')[0])
  const daPrincipal = eventos.filter((e) => `${e.pid}:${e.tid}` === principal && e.ph === 'X' && e.dur !== undefined)

  // Quadros da thread principal: de um callback de requestAnimationFrame ao seguinte. O que cai entre
  // eles é o trabalho de um quadro.
  const inicios = daPrincipal
    .filter((e) => e.name === 'FrameRequestCallbackCollection::ExecuteFrameCallbacks')
    .map((e) => e.ts)
    .sort((a, b) => a - b)
  const quadroDe = (ts) => {
    let baixo = 0
    let alto = inicios.length - 1
    while (baixo < alto) {
      const meio = (baixo + alto + 1) >> 1
      if ((inicios[meio] ?? 0) <= ts) baixo = meio
      else alto = meio - 1
    }
    return baixo
  }
  const tipos = { estilo: ['UpdateLayoutTree', 'RecalculateStyles'], layout: ['Layout'], pintura: ['PrePaint', 'Paint', 'Layerize'] }
  const porQuadro = Object.fromEntries(Object.keys(tipos).map((k) => [k, new Float64Array(Math.max(1, inicios.length))]))
  const forcados = { layouts: 0, estilos: 0, ms: 0, funcoes: new Map() }
  for (const e of daPrincipal) {
    for (const [tipo, nomes] of Object.entries(tipos)) {
      if (!nomes.includes(e.name)) continue
      porQuadro[tipo][quadroDe(e.ts)] += e.dur / 1000
      // Forçado pelo JavaScript: o trace traz a pilha de quem leu o layout ou o estilo antes da hora.
      const pilha = e.args?.beginData?.stackTrace
      if (tipo !== 'pintura' && pilha?.length) {
        if (tipo === 'layout') forcados.layouts++
        else forcados.estilos++
        forcados.ms += e.dur / 1000
        const quadroDaPilha = pilha.find((q) => q.url && !q.url.includes('node_modules')) ?? pilha[0]
        const chave = `${quadroDaPilha.functionName || '(anônima)'} ${(quadroDaPilha.url ?? '').split('/').pop()?.replace(/\?.*$/, '')}`
        forcados.funcoes.set(chave, (forcados.funcoes.get(chave) ?? 0) + 1)
      }
    }
  }
  // Quanto a thread principal ficou ocupada: a soma das tarefas dela (as de fora, sem as aninhadas).
  const tarefas = daPrincipal.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask').sort((a, b) => a.ts - b.ts)
  let ocupada = 0
  let fimDaTarefa = Number.NEGATIVE_INFINITY
  for (const e of tarefas) {
    if (e.ts >= fimDaTarefa) ocupada += e.dur / 1000
    fimDaTarefa = Math.max(fimDaTarefa, e.ts + e.dur)
  }

  const resumoPorQuadro = Object.fromEntries(
    Object.entries(porQuadro).map(([tipo, valores]) => {
      const ordenados = [...valores].sort((a, b) => a - b)
      const media = valores.reduce((a, b) => a + b, 0) / valores.length
      return [tipo, { media: arredondar(media, 2), p95: arredondar(percentil(ordenados, 95), 2) }]
    }),
  )

  // Quadros do compositor (os que chegam à tela), do processo da página.
  const compositor = { total: 0, apresentados: 0, parciais: 0, perdidos: 0, semRaster: 0 }
  for (const e of eventos) {
    if (e.name !== 'PipelineReporter' || e.pid !== pid || e.ph !== 'b') continue
    const relato = e.args?.frame_reporter
    if (!relato?.state || relato.state === 'STATE_NO_UPDATE_DESIRED') continue
    compositor.total++
    if (relato.state === 'STATE_PRESENTED_ALL') compositor.apresentados++
    else if (relato.state === 'STATE_PRESENTED_PARTIAL') compositor.parciais++
    else if (relato.state === 'STATE_DROPPED') compositor.perdidos++
    if (relato.checkerboarded_needs_raster || relato.checkerboarded_needs_record) compositor.semRaster++
  }

  // O motor do buraco negro: o worker que usa requestAnimationFrame.
  const quadrosDoMotor = new Map()
  for (const e of eventos) {
    if (e.pid !== pid || e.name !== 'WorkerAnimationFrameProvider::BeginFrame' || e.ph !== 'X') continue
    const k = `${e.pid}:${e.tid}`
    if (!quadrosDoMotor.has(k)) quadrosDoMotor.set(k, [])
    quadrosDoMotor.get(k).push(e.ts / 1000)
  }
  const motor = [...quadrosDoMotor.values()].sort((a, b) => b.length - a.length)[0] ?? []

  // Ocupação da GPU (as tarefas da thread principal do processo da GPU, sem contar as aninhadas) e da
  // rasterização (somada nas threads que rasterizam).
  const pidDaGpu = [...processos].find(([, nome]) => nome === 'GPU Process')?.[0]
  const tarefasDaGpu = eventos
    .filter((e) => e.pid === pidDaGpu && e.ph === 'X' && e.dur && e.name === 'GPUTask' && threads.get(`${e.pid}:${e.tid}`) === 'CrGpuMain')
    .sort((a, b) => a.ts - b.ts)
  let gpu = 0
  let ate = Number.NEGATIVE_INFINITY
  for (const e of tarefasDaGpu) {
    if (e.ts >= ate) gpu += e.dur / 1000
    ate = Math.max(ate, e.ts + e.dur)
  }
  let raster = 0
  for (const e of eventos) if (e.pid === pid && e.ph === 'X' && e.dur && e.name === 'RasterTask') raster += e.dur / 1000

  return {
    quadrosDaPrincipal: inicios.length,
    ocupada: arredondar((ocupada / (duracao * 1000)) * 100),
    porQuadro: resumoPorQuadro,
    forcados: {
      layouts: forcados.layouts,
      estilos: forcados.estilos,
      ms: arredondar(forcados.ms),
      funcoes: Object.fromEntries([...forcados.funcoes].sort((a, b) => b[1] - a[1]).slice(0, 6)),
    },
    compositor,
    motor: resumirIntervalos(motor.sort((a, b) => a - b)),
    gpuOcupada: arredondar((gpu / (duracao * 1000)) * 100),
    rasterMsPorSegundo: arredondar((raster / duracao) * 1000),
  }
}

/** Os marcos da página aberta agora (veja instalarMedidor). */
const lerMarcos = (pagina) => pagina.evaluate(() => window.__medida?.marcos ?? {})

/** Junta os marcos novos aos de antes, sem trocar os que já havia (a página pode ter aberto de novo). */
function juntarMarcos(marcos, novos) {
  for (const [nome, quando] of Object.entries(novos)) if (!(nome in marcos)) marcos[nome] = quando
}

/** Onde estão as partes da página que as fases usam (px de rolagem). */
function medirPagina() {
  const espaco = document.querySelector('.mergulho')
  const fimDoConteudo = espaco ? espaco.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight - innerHeight
  const video = document.querySelector('main video')
  const nosProjetos = video ? Math.max(0, video.getBoundingClientRect().top + window.scrollY - innerHeight * 0.4) : fimDoConteudo / 2
  return { fimDoConteudo, nosProjetos, alturaDaTela: innerHeight }
}

/** Vai até `alvo` na hora. */
async function irPara(pagina, alvo) {
  await pagina.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), alvo)
}

/**
 * Rola com a roda até `ate`, em gestos de `passo` px a `velocidade` px/s, até o prazo. Com a rolagem
 * suave (veja src/lib/buracoNegro/rolagemSuave.ts), a página continua andando depois do gesto: antes
 * de outro, espera ela parar, senão o destino passaria do ponto.
 */
async function rolarAte(cdp, pagina, centro, { ate, velocidade, passo = 1200, prazo }) {
  const comeco = Date.now()
  let s = await pagina.evaluate(() => window.scrollY)
  while (s < ate - 2 && Date.now() - comeco < prazo) {
    const distancia = Math.min(passo, ate - s)
    await cdp.send('Input.synthesizeScrollGesture', { ...centro, xDistance: 0, yDistance: -distancia, speed: velocidade, gestureSourceType: 'mouse', preventFling: true })
    const depois = await esperarParar(pagina)
    if (depois <= s + 1) await espera(100)
    s = depois
  }
  return s
}

/** Espera a página parar de rolar (até uns 6 s) e devolve onde ela parou. */
async function esperarParar(pagina) {
  let antes = await pagina.evaluate(() => window.scrollY)
  for (let i = 0; i < 60; i++) {
    await espera(100)
    const agora = await pagina.evaluate(() => window.scrollY)
    if (Math.abs(agora - antes) < 1) return agora
    antes = agora
  }
  return antes
}

const FASES = {
  async constante({ cdp, pagina, centro, medidas, opcoes }) {
    // um gesto só, do topo ao fim
    const ate = medidas.fimDoConteudo
    return rolarAte(cdp, pagina, centro, { ate, velocidade: opcoes.velocidade, passo: ate, prazo: (ate / opcoes.velocidade) * 4000 + 15000 })
  },

  async rajadas({ cdp, pagina, centro, medidas }) {
    let s = 0
    for (let i = 0; i < RAJADA.quantas && s < medidas.fimDoConteudo - RAJADA.distancia; i++) {
      await cdp.send('Input.synthesizeScrollGesture', {
        ...centro,
        xDistance: 0,
        yDistance: -RAJADA.distancia,
        speed: RAJADA.velocidade,
        gestureSourceType: 'mouse',
        preventFling: true,
      })
      await espera(RAJADA.pausa)
      s = await pagina.evaluate(() => window.scrollY)
    }
    return s
  },

  async mergulho({ cdp, pagina, centro, medidas, opcoes }) {
    // do fim do conteúdo até a volta ao topo, e a entrada do site
    let s = await pagina.evaluate(() => window.scrollY)
    const comeco = Date.now()
    let maior = s
    while (Date.now() - comeco < 40000) {
      await cdp.send('Input.synthesizeScrollGesture', { ...centro, xDistance: 0, yDistance: -1200, speed: opcoes.velocidade, gestureSourceType: 'mouse', preventFling: true })
      s = await pagina.evaluate(() => window.scrollY)
      maior = Math.max(maior, s)
      if (maior > medidas.fimDoConteudo && s < maior - 1000) break
      if (s >= maior - 1) await espera(50)
    }
    await espera(2600)
    return maior
  },

  async parado({ medidas }) {
    await espera(PARADO)
    return medidas.nosProjetos
  },

  // A barra do navegador no celular: ao rolar, ela se esconde e a tela fica BARRA px mais alta, e volta
  // depois (a janela muda de altura e dispara resize, como num celular de verdade). Três trechos de
  // rolagem, com a barra sumindo depois do primeiro e voltando depois do segundo.
  barra: (contexto) => rolarComBarra(contexto, true),
  // o mesmo caminho, sem a barra mudar (para comparar)
  semBarra: (contexto) => rolarComBarra(contexto, false),

  // do topo ao fim, como na constante, mas logo depois de a página abrir (veja abrirDeNovo)
  logo: (contexto) => FASES.constante(contexto),
}

/** Quanto a barra de endereço de um celular ocupa (px CSS). */
const BARRA = 56

async function rolarComBarra({ cdp, pagina, centro, opcoes, tela }, comBarra) {
  const tamanho = TELAS[tela]
  for (let trecho = 0; trecho < 3; trecho++) {
    await cdp.send('Input.synthesizeScrollGesture', { ...centro, xDistance: 0, yDistance: -1200, speed: opcoes.velocidade, gestureSourceType: 'mouse', preventFling: true })
    if (comBarra && trecho < 2) await pagina.setViewport({ ...tamanho, height: tamanho.height + (trecho === 0 ? BARRA : 0) })
    await espera(400)
  }
  return pagina.evaluate(() => window.scrollY)
}

/** O que preparar antes de cada fase (fora da medição). */
const ANTES = {
  constante: doTopo,
  rajadas: doTopo,
  async mergulho({ pagina, medidas }) {
    await irPara(pagina, Math.max(0, medidas.fimDoConteudo - medidas.alturaDaTela))
    await espera(1500)
  },
  async parado({ pagina, medidas }) {
    await irPara(pagina, medidas.nosProjetos)
    await espera(2000)
  },
  barra: prepararBarra,
  semBarra: prepararBarra,
  logo: abrirDeNovo,
}

/**
 * A página aberta de novo, no topo, e a fase começa assim que o buraco negro aparece, sem esperar as
 * fotos dos blocos. As fases que vierem depois dela também não as esperam: peça-a sozinha ou por último.
 */
async function abrirDeNovo({ pagina, cpu }) {
  await irPara(pagina, 0)
  await pagina.reload({ waitUntil: 'load' })
  await pagina.waitForSelector('.buraco-negro[data-ativo]', { timeout: 30000 * cpu })
  await pagina.evaluate(() => window.scrollY === 0 || window.scrollTo({ top: 0, behavior: 'instant' }))
}

/** Do topo, com a absorção já pronta lá. */
async function doTopo({ pagina }) {
  await irPara(pagina, 0)
  await espera(1500)
}

/**
 * Do topo, e com o que tem a altura da tela grande (100lvh) na altura da tela sem a barra: o fundo do
 * buraco negro e a régua da tela (veja src/lib/buracoNegro/index.ts). Num celular, a tela grande não
 * muda com a barra; na emulação, mudaria junto com a janela.
 */
async function prepararBarra({ pagina, tela }) {
  await pagina.evaluate((altura) => {
    const estilo = document.createElement('style')
    estilo.textContent = `.buraco-negro, [data-regua-da-tela] { height: ${altura}px !important }`
    document.head.append(estilo)
  }, TELAS[tela].height + BARRA)
  await irPara(pagina, 0)
  await espera(1500)
}

async function medirCombinacao(navegador, url, tela, cpu, opcoes) {
  const contexto = await navegador.createBrowserContext()
  const pagina = await contexto.newPage()
  await pagina.setViewport(TELAS[tela])
  const cdp = await pagina.createCDPSession()
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await pagina.evaluateOnNewDocument(instalarMedidor)
  if (opcoes.css) {
    await pagina.evaluateOnNewDocument((css) => {
      document.addEventListener('DOMContentLoaded', () => {
        const estilo = document.createElement('style')
        estilo.textContent = css
        document.head.append(estilo)
      })
    }, opcoes.css)
  }
  const centro = { x: Math.round(TELAS[tela].width / 2), y: Math.round(TELAS[tela].height * 0.6) }

  await pagina.goto(url, { waitUntil: 'load' })
  const ativou = await pagina
    .waitForSelector('.buraco-negro[data-ativo]', { timeout: 30000 * cpu })
    .then(() => true)
    .catch(() => false)
  await espera(ASSENTAR * (cpu > 1 ? 2 : 1))
  const medidas = await pagina.evaluate(medirPagina)

  const resultado = { tela, cpu, efeitoAtivo: ativou, fases: {} }
  /** Os marcos da página (veja instalarMedidor), juntados de todas as vezes que ela abriu. */
  const marcos = {}
  for (const fase of opcoes.fases) {
    if (!FASES[fase]) continue
    // (uma fase pode abrir a página de novo, e as marcas de antes iriam junto)
    juntarMarcos(marcos, await lerMarcos(pagina))
    await ANTES[fase]?.({ pagina, medidas, tela, cpu })
    const inicio = await pagina.evaluate(() => performance.now())
    const posicaoInicial = await pagina.evaluate(() => window.scrollY)
    await pagina.tracing.start({ categories: CATEGORIAS })
    const relogio = Date.now()
    const chegou = await FASES[fase]({ cdp, pagina, centro, medidas, opcoes, tela })
    const duracao = (Date.now() - relogio) / 1000
    const trace = await pagina.tracing.stop()
    // o buraco negro preso no alto da página (o modo lento) ou desligado no fim da fase
    const efeito = await pagina.evaluate(() => {
      const fundo = document.querySelector('.buraco-negro')
      return { ativo: !!fundo?.hasAttribute('data-ativo'), preso: !!fundo?.hasAttribute('data-preso') }
    })
    const fim = await pagina.evaluate(() => performance.now())
    const daPagina = await pagina.evaluate(
      (inicio, fim) => {
        const m = window.__medida
        const dentro = ([t]) => t >= inicio && t <= fim
        return {
          quadros: m.quadros.filter((t) => t >= inicio && t <= fim),
          longas: m.longas.filter(dentro),
          quadrosLongos: m.quadrosLongos.filter(dentro),
        }
      },
      inicio,
      fim,
    )
    const longas = daPagina.longas.map(([, d]) => d)
    resultado.fases[fase] = {
      duracao: arredondar(duracao),
      velocidadeAtingida: Math.round(Math.abs(chegou - posicaoInicial) / Math.max(0.001, duracao)),
      quadrosDaPagina: resumirIntervalos(daPagina.quadros),
      tarefasLongas: { quantas: longas.length, totalMs: Math.round(longas.reduce((a, b) => a + b, 0)), maiorMs: Math.round(Math.max(0, ...longas)) },
      efeito,
      quadrosLongos: {
        quantos: daPagina.quadrosLongos.length,
        bloqueioMs: Math.round(daPagina.quadrosLongos.reduce((a, [, , b]) => a + b, 0)),
        scripts: [...new Set(daPagina.quadrosLongos.map(([, , , s]) => s).filter(Boolean))].slice(0, 4),
      },
      trace: trace ? analisarTrace(new TextDecoder().decode(trace), duracao) : null,
    }
  }
  juntarMarcos(marcos, await lerMarcos(pagina))
  resultado.marcos = Object.fromEntries(Object.entries(marcos).map(([k, v]) => [k, Math.round(v)]))
  resultado.modoLento = 'modoLento' in marcos || Object.values(resultado.fases).some((f) => f.efeito.preso)
  await contexto.close()
  return resultado
}

function imprimir(resultados) {
  const linhas = []
  for (const r of resultados) {
    for (const [fase, f] of Object.entries(r.fases)) {
      const t = f.trace
      linhas.push({
        tela: r.tela,
        cpu: `${r.cpu}x`,
        fase,
        'px/s': f.velocidadeAtingida,
        p50: f.quadrosDaPagina.p50,
        p95: f.quadrosDaPagina.p95,
        p99: f.quadrosDaPagina.p99,
        '>16,7': f.quadrosDaPagina.acima16,
        '>33': f.quadrosDaPagina.acima33,
        longas: f.tarefasLongas.quantas,
        'ocupada%': t?.ocupada ?? '-',
        'est+lay': t ? arredondar(t.porQuadro.estilo.media + t.porQuadro.layout.media, 2) : '-',
        pintura: t ? t.porQuadro.pintura.media : '-',
        forcados: t ? t.forcados.layouts + t.forcados.estilos : '-',
        'comp perd': t ? `${t.compositor.perdidos}/${t.compositor.total}` : '-',
        semRaster: t ? t.compositor.semRaster : '-',
        'motor p95': t ? t.motor.p95 : '-',
        'gpu%': t ? t.gpuOcupada : '-',
        // o efeito no fim da fase: preso no alto da página (o modo lento) ou desligado
        lento: f.efeito?.preso ? 'SIM' : f.efeito?.ativo === false ? 'desligado' : '',
      })
    }
  }
  console.table(linhas)
}

async function principal() {
  const opcoes = lerOpcoes(process.argv.slice(2))
  if (opcoes.escala > 0) for (const medidas of Object.values(TELAS)) medidas.deviceScaleFactor = opcoes.escala
  if (!existsSync(path.join(opcoes.raiz, 'dist/index.html'))) {
    console.error(`Não há build em ${path.join(opcoes.raiz, 'dist')}. Rode \`npm run build\` antes.`)
    process.exit(1)
  }
  const executavel = CANDIDATOS.find((caminho) => caminho && existsSync(caminho))
  if (!executavel) {
    console.error('Não encontrei Chrome nem Edge. Defina CHROME_PATH com o caminho do navegador.')
    process.exit(1)
  }
  const servidor = await preview({ root: opcoes.raiz, logLevel: 'silent', preview: { port: opcoes.porta, strictPort: true, open: false } })
  const base = servidor.resolvedUrls?.local[0]
  const url = new URL(opcoes.pagina, base).href
  const navegador = await puppeteer.launch({ executablePath: executavel, headless: true, args: process.env.CI ? ['--no-sandbox'] : [] })
  const resultados = []
  try {
    for (const tela of opcoes.telas) {
      for (const cpu of opcoes.cpu) {
        console.log(`medindo ${tela}, CPU ${cpu}x...`)
        resultados.push(await medirCombinacao(navegador, url, tela, cpu, opcoes))
      }
    }
  } finally {
    await navegador.close()
    await servidor.close()
  }
  imprimir(resultados)
  const pasta = path.join(raiz, 'medicoes')
  mkdirSync(pasta, { recursive: true })
  const arquivo = path.join(pasta, `${opcoes.rotulo}.json`)
  const versao = (await import('node:child_process')).execSync('git rev-parse --short HEAD', { cwd: opcoes.raiz }).toString().trim()
  writeFileSync(arquivo, JSON.stringify({ quando: new Date().toISOString(), commit: versao, navegador: executavel, opcoes, resultados }, null, 2))
  console.log(`resultados em ${path.relative(raiz, arquivo)}`)
}

await principal()
