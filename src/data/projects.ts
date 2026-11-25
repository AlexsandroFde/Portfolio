import type { Texto, Traduzivel } from '../i18n/idioma.ts'
import bekaPoster from '../assets/projects/beka/conversa.webp'
import bekaPosterPequeno from '../assets/projects/beka/conversa-640.webp'
import bekaVideo from '../assets/projects/beka/conversa.mp4'
import deepcorePoster from '../assets/projects/deepcore/trailer.webp'
import deepcorePosterPequeno from '../assets/projects/deepcore/trailer-640.webp'
import deepcoreVideo from '../assets/projects/deepcore/trailer.mp4'
import manaMindPoster from '../assets/projects/manamind/pomodoro.webp'
import manaMindPosterPequeno from '../assets/projects/manamind/pomodoro-640.webp'
import manaMindVideo from '../assets/projects/manamind/pomodoro.mp4'
import nossoCantinhoPoster from '../assets/projects/nosso-cantinho/pet.webp'
import nossoCantinhoPosterPequeno from '../assets/projects/nosso-cantinho/pet-640.webp'
import nossoCantinhoVideo from '../assets/projects/nosso-cantinho/pet.mp4'
import transcriberPoster from '../assets/projects/transcriber/transcricao.webp'
import transcriberPosterPequeno from '../assets/projects/transcriber/transcricao-640.webp'
import transcriberVideo from '../assets/projects/transcriber/transcricao.mp4'
import videoCutterPoster from '../assets/projects/video-cutter/cortes.webp'
import videoCutterPosterPequeno from '../assets/projects/video-cutter/cortes-640.webp'
import videoCutterVideo from '../assets/projects/video-cutter/cortes.mp4'

export type Area = 'web' | 'mobile' | 'jogos' | 'dados' | 'sistemas'

export const areas: ReadonlyArray<{ id: Area; label: Texto }> = [
  { id: 'web', label: { pt: 'Web', en: 'Web' } },
  { id: 'mobile', label: { pt: 'Mobile', en: 'Mobile' } },
  { id: 'jogos', label: { pt: 'Jogos', en: 'Games' } },
  { id: 'dados', label: { pt: 'Dados & Automação', en: 'Data & Automation' } },
  { id: 'sistemas', label: { pt: 'Fundamentos', en: 'Fundamentals' } },
]

/** O que toda demonstração tem, seja imagem ou vídeo. */
interface MediaBase {
  /** O que ela mostra, para quem não a vê (leitores de tela). */
  alt: Texto
  /** A legenda, embaixo dela na página do projeto. */
  caption: Texto
  /** Tamanho do original (px): o espaço dela fica reservado antes de ela carregar. */
  width: number
  height: number
}

/** Uma imagem: a versão inteira (até 1600 px de largura) e uma de 640 px, para telas estreitas e miniaturas. */
export interface ImageMedia extends MediaBase {
  kind: 'image'
  src: string
  srcSmall: string
}

/**
 * Um vídeo curto (MP4 sem som), que toca em loop como um GIF, com o quadro mostrado antes de ele
 * carregar (e para quem prefere menos movimento), também em 640 px.
 */
export interface VideoMedia extends MediaBase {
  kind: 'video'
  src: string
  poster: string
  posterSmall: string
}

/** Uma demonstração de um projeto. Um tipo novo entra aqui e ganha quem o mostre (veja ProjectMedia.tsx). */
export type ProjectMedia = ImageMedia | VideoMedia

/**
 * Uma parte da página de um projeto: um título, com parágrafos, itens ou os dois, e as
 * demonstrações que ilustram aquele texto. Quem decide como elas se arrumam ao lado do texto (ou
 * numa faixa embaixo dele) é a página, pelo número e pelo formato delas (veja diagramacao.ts).
 */
export interface ProjectSection {
  title: Texto
  paragraphs?: readonly Texto[]
  items?: readonly Texto[]
  /** As demonstrações desta parte, na ordem em que aparecem. */
  media?: readonly ProjectMedia[]
}

/** As explicações e as demonstrações de um projeto em destaque: o que a página dele mostra. */
export interface ProjectDetails {
  /** A abertura, mais longa que a descrição do cartão, ao lado da prévia. */
  intro: Texto
  sections: readonly ProjectSection[]
  /** Uma observação no fim, como de onde vêm as imagens. */
  note?: Texto
}

interface ProjectBase {
  /** Identificador estável: a chave da lista e o endereço da página do projeto (#projeto/<id>). */
  id: string
  /** Nome do projeto. Um texto só quando é igual nos dois idiomas. */
  name: Traduzivel
  /** Uma frase curta, usada na lista "Outros projetos". */
  summary: Texto
  /** Texto completo, usado nos cartões de destaque. */
  description: Texto
  area: Area
  stack: readonly Traduzivel[]
  /** Ano de conclusão (ou da última atualização do repositório). */
  year: number
  /** Nome do repositório no GitHub. Sem ele, o projeto aparece como privado. */
  repo?: string
}

/** Um projeto da lista "Outros projetos": uma linha, com o link do repositório. */
export interface ListedProject extends ProjectBase {
  featured?: undefined
}

/**
 * Um projeto em destaque: um cartão com uma prévia, que abre a página dele, com as explicações e as
 * demonstrações (e, de lá, o repositório).
 */
export interface FeaturedProject extends ProjectBase {
  /** Posição entre os destaques (1 = primeiro). */
  featured: number
  /** O que o cartão mostra no alto. */
  preview: ProjectMedia
  /** A página do projeto, num módulo à parte (src/data/projectDetails), baixado só quando ele é aberto. */
  details: () => Promise<ProjectDetails>
}

export type Project = ListedProject | FeaturedProject

export const isFeatured = (project: Project): project is FeaturedProject => project.featured !== undefined

/**
 * Para adicionar um projeto, inclua um item nesta lista (com os textos em português e em inglês).
 * Um destaque precisa também de uma prévia e da página dele, em src/data/projectDetails.
 * A ordem aqui é a ordem de exibição (mais recentes primeiro).
 */
export const projects: readonly Project[] = [
  {
    id: 'beka',
    name: 'Beka',
    summary: {
      pt: 'Assistente de desktop com IA local e uma personagem animada',
      en: 'Desktop assistant with local AI and an animated character',
    },
    description: {
      pt: 'Assistente virtual para desktop com IA local e uma personagem animada inspirada na minha noiva. Conversa, tem memória e personalidade próprias e controla aplicações do computador.',
      en: 'Desktop virtual assistant with local AI and an animated character inspired by my fiancée. She chats, has her own memory and personality, and controls apps on the computer.',
    },
    area: 'dados',
    stack: ['Electron', 'TypeScript', 'Ollama'],
    year: 2026,
    featured: 1,
    preview: {
      kind: 'video',
      src: bekaVideo,
      poster: bekaPoster,
      posterSmall: bekaPosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'A Beka ao lado da janela de conversa, respondendo pela IA local a um oi e a um pedido de bom dia, lembrando que já é noite.',
        en: 'Beka next to the chat window, answering a hello and a good morning through the local AI and pointing out that it is already night.',
      },
      caption: {
        pt: 'A conversa: a resposta vem da IA local, e o corpo reage antes da fala.',
        en: 'Chatting: the answer comes from the local AI, and her body reacts before she speaks.',
      },
    },
    details: () => import('./projectDetails/beka.ts').then((modulo) => modulo.default),
  },
  {
    id: 'transcriber',
    name: 'Transcriber',
    summary: {
      pt: 'Transcrição de reuniões em português, com identificação de quem fala',
      en: 'Meeting transcription in Portuguese, identifying who is speaking',
    },
    description: {
      pt: 'Transcritor de reuniões para áudios e vídeos em português brasileiro. Identifica participantes, marca as falas e preserva hesitações e repetições.',
      en: "Meeting transcriber for Brazilian Portuguese audio and video. It identifies participants, labels each speaker's lines and keeps hesitations and repetitions.",
    },
    area: 'dados',
    stack: ['Python', 'Whisper', 'pyannote', 'FastAPI'],
    year: 2026,
    repo: 'Transcriber',
    featured: 5,
    preview: {
      kind: 'video',
      src: transcriberVideo,
      poster: transcriberPoster,
      posterSmall: transcriberPosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'O aplicativo tocando a transcrição de uma reunião de teste, acelerada: a fala atual em destaque, o texto rolando sozinho até ela, cada fala com o horário e o participante e uma palavra incerta marcada em amarelo.',
        en: 'The app playing back the transcript of a test meeting, sped up: the current line highlighted, the text scrolling to it on its own, each line with its time and speaker and an uncertain word marked in yellow.',
      },
      caption: {
        pt: 'A transcrição tocando (acelerada), com a rolagem automática: a fala atual em destaque e, em amarelo, o que ficou incerto.',
        en: 'The transcript playing back (sped up) with auto-scroll: the current line highlighted and, in yellow, what remained uncertain.',
      },
    },
    details: () => import('./projectDetails/transcriber.ts').then((modulo) => modulo.default),
  },
  {
    id: 'deepcore',
    name: 'DeepCore',
    summary: {
      pt: 'Roguelite 2D de mineração, sobrevivência e defesa de base',
      en: '2D roguelite about mining, survival and base defense',
    },
    description: {
      pt: 'Roguelite 2D de mineração, sobrevivência e defesa de base. Combina escavação, exploração subterrânea, coleta de recursos e evolução de máquinas.',
      en: '2D roguelite about mining, survival and base defense. It combines digging, underground exploration, resource gathering and machine upgrades.',
    },
    area: 'jogos',
    stack: ['Godot', 'GDScript'],
    year: 2026,
    featured: 3,
    preview: {
      kind: 'video',
      src: deepcoreVideo,
      poster: deepcorePoster,
      posterSmall: deepcorePosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'Trechos do trailer do DeepCore: a base na superfície, escavação com laser, cavernas de lava e um chefe gigante atacando a estação.',
        en: 'Clips from the DeepCore trailer: the base on the surface, laser digging, lava caves and a giant boss attacking the station.',
      },
      caption: {
        pt: 'Trechos do trailer: a estação, a escavação, as cavernas de lava e um chefe.',
        en: 'Trailer clips: the station, digging, the lava caves and a boss.',
      },
    },
    details: () => import('./projectDetails/deepcore.ts').then((modulo) => modulo.default),
  },
  {
    id: 'nosso-cantinho',
    name: 'Nosso Cantinho',
    summary: {
      pt: 'Plataforma em tempo real para o casal, com um pet virtual',
      en: 'Real-time platform for a couple, with a virtual pet',
    },
    description: {
      pt: 'Plataforma full-stack criada para a minha noiva, com sincronização em tempo real. Reúne pet virtual e diversas outras interações românticas.',
      en: 'Full-stack platform built for my fiancée, with real-time sync. It brings together a virtual pet and many other romantic interactions.',
    },
    area: 'web',
    stack: ['React', 'NestJS', 'TypeScript'],
    year: 2026,
    featured: 2,
    preview: {
      kind: 'video',
      src: nossoCantinhoVideo,
      poster: nossoCantinhoPoster,
      posterSmall: nossoCantinhoPosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'O pet do casal: o dragãozinho no quarto, comendo uma maçã na cozinha e tomando banho de chuveiro com bolhas de sabão.',
        en: "The couple's pet: the little dragon in the bedroom, eating an apple in the kitchen and taking a shower with soap bubbles.",
      },
      caption: {
        pt: 'O pet do casal: o quarto, a cozinha e o banho, tudo desenhado em código.',
        en: "The couple's pet: the bedroom, the kitchen and bath time, all drawn in code.",
      },
    },
    details: () => import('./projectDetails/nossoCantinho.ts').then((modulo) => modulo.default),
  },
  {
    id: 'mug-customizer',
    name: 'Mug Customizer',
    summary: {
      pt: 'Personalização de canecas com prévia em tempo real',
      en: 'Mug customization with a real-time preview',
    },
    description: {
      pt: 'Personalizador de canecas: aplique estampas próprias, ajuste áreas de impressão e cores e veja o resultado em tempo real.',
      en: 'Mug customizer: apply your own prints, adjust print areas and colors, and see the result in real time.',
    },
    area: 'web',
    stack: ['React', 'TypeScript'],
    year: 2026,
    repo: 'Mug_Customizer',
  },
  {
    id: 'video-cutter',
    name: 'Video Cutter',
    summary: {
      pt: 'Corte de vídeos em vários trechos, com exportação em lote',
      en: 'Splits videos into several clips, with batch export',
    },
    description: {
      pt: 'Aplicativo para dividir vídeos em vários segmentos e exportá-los em lote. Aceita vídeos locais e do YouTube, com corte rápido ou preciso e extração de áudio em MP3.',
      en: 'App for splitting videos into several segments and exporting them in batch. It accepts local and YouTube videos, with fast or precise cuts and MP3 audio extraction.',
    },
    area: 'mobile',
    stack: ['Flutter', 'Dart'],
    year: 2026,
    repo: 'Video_Cutter',
    featured: 6,
    preview: {
      kind: 'video',
      src: videoCutterVideo,
      poster: videoCutterPoster,
      posterSmall: videoCutterPosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'Telas do app no celular, ampliadas: o trailer do DeepCore é dividido em quatro pedacinhos, um deles é desligado e os outros três são exportados.',
        en: "The app's screens on a phone, zoomed in: the DeepCore trailer is split into four short clips, one of them is switched off and the other three are exported.",
      },
      caption: {
        pt: 'Um vídeo dividido em quatro pedacinhos: um fica de fora e os outros três são exportados.',
        en: 'A video split into four short clips: one is left out and the other three are exported.',
      },
    },
    details: () => import('./projectDetails/videoCutter.ts').then((modulo) => modulo.default),
  },
  {
    id: 'sms',
    name: 'SMS',
    summary: {
      pt: 'Mensageiro instantâneo em Java RMI com interface Swing',
      en: 'Instant messenger in Java RMI with a Swing interface',
    },
    description: {
      pt: 'Mensageiro instantâneo com Java RMI e interface Swing: contatos, status online/offline, entrega em tempo real e filas para mensagens offline.',
      en: 'Instant messenger built with Java RMI and a Swing interface: contacts, online/offline status, real-time delivery and queues for offline messages.',
    },
    area: 'sistemas',
    stack: ['Java', 'RMI', 'Swing'],
    year: 2026,
    repo: 'SMS',
  },
  {
    id: 'manamind',
    name: 'ManaMind',
    summary: {
      pt: 'App de foco com Pomodoro, missões e um gacha de personagens (TCC)',
      en: 'Focus app with Pomodoro, missions and a character gacha (thesis)',
    },
    description: {
      pt: 'Meu TCC em Engenharia de Computação no IFCE: um app que transforma a disciplina numa jornada de recompensas, unindo a técnica Pomodoro, missões e um gacha de personagens colecionáveis.',
      en: 'My Computer Engineering thesis at IFCE: an app that turns discipline into a journey of rewards, combining the Pomodoro technique, missions and a gacha of collectible characters.',
    },
    area: 'mobile',
    stack: ['Flutter', 'Dart', 'Firebase', 'BLoC'],
    year: 2025,
    featured: 4,
    preview: {
      kind: 'video',
      src: manaMindVideo,
      poster: manaMindPoster,
      posterSmall: manaMindPosterPequeno,
      width: 1280,
      height: 720,
      alt: {
        pt: 'Gravação do ManaMind num celular. Na tela inicial, a pessoa aceita a missão e cria uma sessão de foco: escolhe a missão de estudar para Cálculo Numérico, a personagem Mao Mao e dois ciclos. Abre a sessão, liga chuva e lo-fi no ambiente sonoro, e o cronômetro corre acelerado pelos dois ciclos de 25 minutos e pela pausa de 5, com o alarme pedindo confirmação entre um e outro. No fim, ganha 50 manacoins, a missão fica concluída e o saldo da tela inicial sobe de 2670 para 2720.',
        en: 'Screen recording of ManaMind on a phone. On the home screen, the user accepts the mission and creates a focus session: they pick a study mission, the character Mao Mao and two cycles. They open the session, turn on rain and lo-fi in the soundscape, and the timer runs sped up through the two 25-minute cycles and the 5-minute break, with the alarm asking for confirmation between them. At the end they earn 50 manacoins, the mission is completed and the balance on the home screen goes from 2670 to 2720.',
      },
      caption: {
        pt: 'O pomodoro: a sessão criada a partir de uma missão, o ambiente sonoro, os ciclos (com o cronômetro acelerado) e as manacoins no fim.',
        en: 'The pomodoro: a session created from a mission, the soundscape, the cycles (with the timer sped up) and the manacoins at the end.',
      },
    },
    details: () => import('./projectDetails/manaMind.ts').then((modulo) => modulo.default),
  },
  {
    id: '3d-rendering',
    name: '3D Rendering',
    summary: {
      pt: 'Renderização 3D com projeção em perspectiva e rasterização',
      en: '3D rendering with perspective projection and rasterization',
    },
    description: {
      pt: 'Criação e visualização de objetos 3D com transformações geométricas, projeção em perspectiva e rasterização de cenas.',
      en: 'Creating and displaying 3D objects with geometric transformations, perspective projection and scene rasterization.',
    },
    area: 'sistemas',
    stack: ['Python', 'Matplotlib', 'PIL'],
    year: 2025,
    repo: '3D_Rendering',
  },
  {
    id: 'v-car',
    name: 'V-Car',
    summary: {
      pt: 'Gestão de clientes, pedidos e equipe de um lava a jato',
      en: 'Customer, order and staff management for a car wash',
    },
    description: {
      pt: 'Sistema de gestão para serviços de lavagem de veículos: cadastro de clientes, criação de pedidos, equipe de funcionários e histórico mensal.',
      en: 'Management system for car wash services: customer records, order creation, staff management and monthly history.',
    },
    area: 'web',
    stack: ['JavaScript', 'Node.js', 'Express'],
    year: 2024,
  },
  {
    id: 'g-lit',
    name: 'G-LIT',
    summary: {
      pt: 'Gestão de projetos, bolsistas e coordenadores do laboratório',
      en: "Management of the lab's projects, research fellows and coordinators",
    },
    description: {
      pt: 'Gestor do Laboratório de Inovação Tecnológica: front-end completo de um sistema de gerenciamento de projetos, bolsistas e coordenadores, com autenticação e permissões por tipo de usuário.',
      en: 'Manager for the Technological Innovation Lab (LIT): the complete front end of a system for managing projects, research fellows and coordinators, with authentication and role-based permissions.',
    },
    area: 'web',
    stack: ['React', 'TypeScript', { pt: 'APIs REST', en: 'REST APIs' }],
    year: 2024,
  },
  {
    id: 'portfolio-lit',
    name: { pt: 'Portfólio do LIT', en: 'LIT Portfolio' },
    summary: {
      pt: 'Site institucional do laboratório, integrado ao G-LIT',
      en: "The lab's institutional website, integrated with G-LIT",
    },
    description: {
      pt: 'Site institucional do laboratório, integrado ao back-end do G-LIT para exibir os projetos com filtros e ordenação por categoria ou responsável.',
      en: "The lab's institutional website, integrated with the G-LIT back end to show its projects with filters and sorting by category or lead.",
    },
    area: 'web',
    stack: ['Vue.js'],
    year: 2023,
  },
  {
    id: 'meu-busao',
    name: 'Meu Busão',
    summary: {
      pt: 'Compra e troca de assentos em viagens de ônibus',
      en: 'Buying and swapping seats on bus trips',
    },
    description: {
      pt: 'Gerenciamento de assentos em viagens de ônibus: cadastro de passageiros, compra e troca de assentos e criação de novas viagens.',
      en: 'Seat management for bus trips: passenger registration, buying and swapping seats and creating new trips.',
    },
    area: 'mobile',
    stack: ['Flutter', 'Dart', 'MySQL'],
    year: 2023,
    repo: 'Meu_Busao',
  },
  {
    id: 'math-tool-kit',
    name: 'Math Tool Kit',
    summary: {
      pt: 'Bases numéricas, sistemas lineares e raízes de equações',
      en: 'Number bases, linear systems and roots of equations',
    },
    description: {
      pt: 'Conversor de bases numéricas, resolução de sistemas lineares pelo método de Jordan e de equações algébricas de grau n com os métodos de Bolzano e da Bisseção.',
      en: 'Converts number bases, solves linear systems with the Gauss-Jordan method and finds roots of nth-degree algebraic equations with the Bolzano and bisection methods.',
    },
    area: 'sistemas',
    stack: ['C'],
    year: 2023,
    repo: 'Math_Tool_Kit',
  },
  {
    id: 'bot-discord',
    name: { pt: 'Bot Discord', en: 'Discord Bot' },
    summary: {
      pt: 'Bot de moderação e automação para servidores do Discord',
      en: 'Moderation and automation bot for Discord servers',
    },
    description: {
      pt: 'Bot de moderação e automação com discord.py: movimentação de usuários, limpeza e envio de mensagens, mute/desmute e bloqueio de mensagens.',
      en: 'Moderation and automation bot built with discord.py: moving users, clearing and sending messages, muting and unmuting, and blocking messages.',
    },
    area: 'dados',
    stack: ['Python', 'discord.py'],
    year: 2023,
    repo: 'Bot_Discord',
  },
  {
    id: 'automacao-tvs',
    name: { pt: 'Automação de TVs', en: 'TV Automation' },
    summary: {
      pt: 'Controle e agendamento de TVs com Raspberry Pi',
      en: 'TV control and scheduling with Raspberry Pi',
    },
    description: {
      pt: 'Scripts de automação para um sistema de TVs com Raspberry Pi: controle remoto, agendamento de exibição e monitoramento de status.',
      en: 'Automation scripts for a Raspberry Pi TV system: remote control, display scheduling and status monitoring.',
    },
    area: 'dados',
    stack: ['Python', 'Raspberry Pi'],
    year: 2023,
  },
  {
    id: 'sort-analytics',
    name: 'Sort Analytics',
    summary: {
      pt: 'Comparação de desempenho entre seis algoritmos de ordenação',
      en: 'Performance comparison of six sorting algorithms',
    },
    description: {
      pt: 'Análise de desempenho dos algoritmos de ordenação Quick, Merge, Counting, Radix, Bucket e Heap Sort, com visualização gráfica dos resultados.',
      en: 'Performance analysis of the Quick, Merge, Counting, Radix, Bucket and Heap Sort algorithms, with charts of the results.',
    },
    area: 'dados',
    stack: ['Python'],
    year: 2023,
    repo: 'Sort_Analytics',
  },
  {
    id: 'tradeit',
    name: 'TradeIt',
    summary: {
      pt: 'Troca de jogos entre usuários, com login via Firebase',
      en: 'Game trading between users, with Firebase sign-in',
    },
    description: {
      pt: 'Aplicativo para troca de jogos entre usuários: anúncios, solicitações de troca e comunicação entre os interessados, com login via Firebase.',
      en: 'App for trading games between users: listings, trade requests and messaging between interested users, with Firebase sign-in.',
    },
    area: 'mobile',
    stack: ['Flutter', 'Dart', 'Firebase'],
    year: 2022,
    repo: 'TradeIt',
  },
]
