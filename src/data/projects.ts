import type { Texto, Traduzivel } from '../i18n/idioma.ts'
import bekaPoster from '../assets/projects/beka.webp'
import bekaPosterPequeno from '../assets/projects/beka-640.webp'
import bekaVideo from '../assets/projects/beka.mp4'
import deepcorePoster from '../assets/projects/deepcore.webp'
import deepcorePosterPequeno from '../assets/projects/deepcore-640.webp'
import deepcoreVideo from '../assets/projects/deepcore.mp4'
import mugCustomizerPoster from '../assets/projects/mug-customizer.webp'
import mugCustomizerPosterPequeno from '../assets/projects/mug-customizer-640.webp'
import mugCustomizerVideo from '../assets/projects/mug-customizer.mp4'
import nossoCantinhoPoster from '../assets/projects/nosso-cantinho.webp'
import nossoCantinhoPosterPequeno from '../assets/projects/nosso-cantinho-640.webp'
import nossoCantinhoVideo from '../assets/projects/nosso-cantinho.mp4'
import videoCutterPoster from '../assets/projects/video-cutter.webp'
import videoCutterPosterPequeno from '../assets/projects/video-cutter-640.webp'
import videoCutterVideo from '../assets/projects/video-cutter.mp4'

export type Area = 'web' | 'mobile' | 'jogos' | 'dados' | 'sistemas'

export const areas: ReadonlyArray<{ id: Area; label: Texto }> = [
  { id: 'web', label: { pt: 'Web', en: 'Web' } },
  { id: 'mobile', label: { pt: 'Mobile', en: 'Mobile' } },
  { id: 'jogos', label: { pt: 'Jogos', en: 'Games' } },
  { id: 'dados', label: { pt: 'Dados & Automação', en: 'Data & Automation' } },
  { id: 'sistemas', label: { pt: 'Fundamentos', en: 'Fundamentals' } },
]

/** Vídeo curto do projeto (MP4 sem som, 16:9), exibido em loop como um GIF. */
export interface ProjectVideo {
  src: string
  /** Quadro mostrado antes de o vídeo carregar (e para quem prefere menos movimento), em 1280 px. */
  poster: string
  /** O mesmo quadro em 640 px, para telas estreitas. */
  posterPequeno: string
  /** O que o vídeo mostra, para leitores de tela. */
  description: Texto
}

export interface Project {
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
  /** Posição entre os destaques (1 = primeiro). */
  featured?: number
  video?: ProjectVideo
}

/**
 * Para adicionar um projeto, inclua um item nesta lista (com os textos em português e em inglês).
 * A ordem aqui é a ordem de exibição (mais recentes primeiro).
 */
export const projects: readonly Project[] = [
  {
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
    video: {
      src: bekaVideo,
      poster: bekaPoster,
      posterPequeno: bekaPosterPequeno,
      description: {
        pt: 'A Beka ao lado da janela de conversa, respondendo pela IA local a um oi e a um pedido de bom dia, lembrando que já é noite.',
        en: 'Beka next to the chat window, answering a hello and a good morning through the local AI and pointing out that it is already night.',
      },
    },
  },
  {
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
    stack: ['Python'],
    year: 2026,
    repo: 'Transcriber',
    featured: 5,
  },
  {
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
    video: {
      src: deepcoreVideo,
      poster: deepcorePoster,
      posterPequeno: deepcorePosterPequeno,
      description: {
        pt: 'Trechos do trailer do DeepCore: a base na superfície, escavação com laser, cavernas de lava e um chefe gigante atacando a estação.',
        en: 'Clips from the DeepCore trailer: the base on the surface, laser digging, lava caves and a giant boss attacking the station.',
      },
    },
  },
  {
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
    video: {
      src: nossoCantinhoVideo,
      poster: nossoCantinhoPoster,
      posterPequeno: nossoCantinhoPosterPequeno,
      description: {
        pt: 'O pet do casal: o dragãozinho no quarto, comendo uma maçã na cozinha e tomando banho de chuveiro com bolhas de sabão.',
        en: "The couple's pet: the little dragon in the bedroom, eating an apple in the kitchen and taking a shower with soap bubbles.",
      },
    },
  },
  {
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
    featured: 4,
    video: {
      src: mugCustomizerVideo,
      poster: mugCustomizerPoster,
      posterPequeno: mugCustomizerPosterPequeno,
      description: {
        pt: 'No tema escuro, a caneca em 3D recebe uma figurinha da Beka como estampa, gira, fica rosa com a alça vinho e tem a estampa ampliada.',
        en: 'In dark mode, the 3D mug gets a Beka sticker as its print, spins, turns pink with a burgundy handle and has the print enlarged.',
      },
    },
  },
  {
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
    video: {
      src: videoCutterVideo,
      poster: videoCutterPoster,
      posterPequeno: videoCutterPosterPequeno,
      description: {
        pt: 'Telas do app no celular, ampliadas: o trailer do DeepCore é dividido em quatro pedacinhos, um deles é desligado e os outros três são exportados.',
        en: "The app's screens on a phone, zoomed in: the DeepCore trailer is split into four short clips, one of them is switched off and the other three are exported.",
      },
    },
  },
  {
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
    featured: 7,
  },
  {
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
