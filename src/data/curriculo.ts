import type { Idioma, Texto, Traduzivel } from '../i18n/idioma.ts'

// Conteúdo do currículo em PDF, gerado no build (scripts/curriculo.mjs) em português e em inglês.
// Nome, e-mail e links vêm de profile.ts; cursos e competências comportamentais, de skills.ts.
// O texto segue o que os sistemas de triagem (ATS) leem melhor: seções com nomes usuais,
// datas no formato MM/AAAA e as tecnologias escritas por extenso.

/** Nome do arquivo publicado na raiz do site, em cada idioma. */
export const arquivoCurriculo: Texto = {
  pt: 'Curriculo-Alexsandro-Ferreira-da-Silva.pdf',
  en: 'Resume-Alexsandro-Ferreira-da-Silva.pdf',
}

/** Endereço do PDF no site, para os links. */
export const linkCurriculo = (idioma: Idioma) => `${import.meta.env.BASE_URL}${arquivoCurriculo[idioma]}`

export interface Cargo {
  titulo: Texto
  empresa: Texto
  local?: Texto
  periodo: Texto
  itens: readonly Texto[]
}

export interface Formacao {
  curso: Texto
  instituicao: Texto
  periodo: Texto
  detalhes: Texto
}

export interface ProjetoCurriculo {
  nome: Traduzivel
  stack: Traduzivel
  ano: number
  descricao: Texto
  /** Endereço do repositório público, quando houver. */
  repo?: string
}

export interface Evento {
  titulo: Texto
  data: string
  descricao: Texto
}

export const curriculo = {
  titulo: { pt: 'Currículo', en: 'Resume' } as Texto,
  local: { pt: 'Fortaleza, CE, Brasil', en: 'Fortaleza, CE, Brazil' } as Texto,
  telefone: { pt: '(85) 98895-9513', en: '+55 85 98895-9513' } as Texto,
  /** O mesmo telefone no formato internacional, para o link do PDF. */
  telefoneLink: 'tel:+5585988959513',
  rotuloPortfolio: { pt: 'Portfólio', en: 'Portfolio' } as Texto,

  secoes: {
    resumo: { pt: 'Resumo profissional', en: 'Professional summary' },
    experiencia: { pt: 'Experiência profissional', en: 'Professional experience' },
    formacao: { pt: 'Formação acadêmica', en: 'Education' },
    competencias: { pt: 'Competências técnicas', en: 'Technical skills' },
    idiomas: { pt: 'Idiomas', en: 'Languages' },
    projetos: { pt: 'Projetos', en: 'Projects' },
    eventos: { pt: 'Pesquisa, eventos e premiações', en: 'Research, events and awards' },
    cursos: { pt: 'Cursos complementares', en: 'Courses' },
    comportamentais: { pt: 'Competências comportamentais', en: 'Soft skills' },
  } satisfies Record<string, Texto>,

  resumo: {
    pt: 'Desenvolvedor de Software formado em Engenharia de Computação pelo IFCE (2026). Atualmente no Instituto Iracema, desenvolvo o Sala Braille, aplicativo de tecnologia assistiva para a alfabetização em braille de estudantes cegos. Experiência em desenvolvimento web, mobile e desktop com TypeScript, JavaScript, React, Flutter, Node.js e Python. Mais de 35 projetos desenvolvidos, entre aplicações full-stack em tempo real, apps mobile, jogos e soluções com IA local. 1º lugar no Techstars Startup Weekend Fortaleza.',
    en: 'Software Developer with a degree in Computer Engineering from IFCE (2026). Currently at Instituto Iracema, developing Sala Braille, an assistive technology app for braille literacy for blind students. Experience in web, mobile and desktop development with TypeScript, JavaScript, React, Flutter, Node.js and Python. More than 35 projects built, including real-time full-stack applications, mobile apps, games and local AI solutions. 1st place at Techstars Startup Weekend Fortaleza.',
  } as Texto,

  experiencia: [
    {
      titulo: { pt: 'Desenvolvedor de Software', en: 'Software Developer' },
      empresa: { pt: 'Instituto Iracema', en: 'Instituto Iracema' },
      local: { pt: 'Fortaleza, CE', en: 'Fortaleza, CE, Brazil' },
      periodo: { pt: '05/2025 - Atual', en: '05/2025 - Present' },
      itens: [
        {
          pt: 'Desenvolvo o aplicativo Sala Braille, que apoia a alfabetização em braille de estudantes cegos em escolas inclusivas.',
          en: 'Develop the Sala Braille app, which supports braille literacy for blind students in inclusive schools.',
        },
        {
          pt: 'O aplicativo oferece aulas remotas e acompanha o progresso de cada estudante.',
          en: "The app offers remote lessons and tracks each student's progress.",
        },
        {
          pt: 'Faz parte de um ecossistema de tecnologia assistiva que também reúne equipamentos físicos de ensino, como SlateBraille, NoteBraille e BrailleBoard.',
          en: 'Part of an assistive technology ecosystem that also includes physical teaching devices such as SlateBraille, NoteBraille and BrailleBoard.',
        },
      ],
    },
    {
      titulo: { pt: 'Desenvolvedor Freelancer', en: 'Freelance Developer' },
      empresa: { pt: 'Autônomo', en: 'Self-employed' },
      periodo: { pt: '05/2024', en: '05/2024' },
      itens: [
        {
          pt: 'Desenvolvi o site de um lava a jato com soluções personalizadas, ampliando a presença digital do cliente.',
          en: "Built a car wash's website with custom solutions, expanding the client's online presence.",
        },
      ],
    },
  ] satisfies readonly Cargo[],

  formacao: [
    {
      curso: { pt: 'Bacharelado em Engenharia de Computação', en: "Bachelor's Degree in Computer Engineering" },
      instituicao: {
        pt: 'Instituto Federal de Educação, Ciência e Tecnologia do Ceará (IFCE), Campus Fortaleza',
        en: 'Federal Institute of Education, Science and Technology of Ceará (IFCE), Fortaleza campus',
      },
      periodo: { pt: '2021 - 2026 | Concluído em 2026.1', en: '2021 - 2026 | Graduated in 2026' },
      detalhes: {
        pt: 'Principais disciplinas: Estrutura de Dados, Programação Orientada a Objetos, Banco de Dados, Pesquisa e Ordenação, Microcontroladores e Microprocessadores.',
        en: 'Main courses: Data Structures, Object-Oriented Programming, Databases, Searching and Sorting, Microcontrollers and Microprocessors.',
      },
    },
  ] satisfies readonly Formacao[],

  competencias: [
    {
      grupo: { pt: 'Linguagens', en: 'Languages' },
      itens: 'TypeScript, JavaScript, Python, Dart, Java, C, Swift, GDScript',
    },
    {
      grupo: { pt: 'Web e back-end', en: 'Web and back end' },
      itens: { pt: 'React, Vue.js, Node.js, NestJS, Express, APIs REST', en: 'React, Vue.js, Node.js, NestJS, Express, REST APIs' },
    },
    { grupo: { pt: 'Mobile', en: 'Mobile' }, itens: 'Flutter, React Native, Android Studio' },
    { grupo: { pt: 'Desktop e jogos', en: 'Desktop and games' }, itens: 'Electron, Java Swing, Java RMI, Godot' },
    { grupo: { pt: 'Banco de dados e serviços', en: 'Databases and services' }, itens: 'MySQL, Firebase' },
    {
      grupo: { pt: 'IA e dados', en: 'AI and data' },
      itens: {
        pt: 'Ollama (LLMs locais), redes neurais convolucionais (CNNs), Transfer Learning, Matplotlib',
        en: 'Ollama (local LLMs), convolutional neural networks (CNNs), Transfer Learning, Matplotlib',
      },
    },
    { grupo: { pt: 'Hardware', en: 'Hardware' }, itens: 'Raspberry Pi, Arduino, Proteus' },
    { grupo: { pt: 'Ferramentas', en: 'Tools' }, itens: 'Git, GitHub, VS Code' },
  ] satisfies ReadonlyArray<{ grupo: Texto; itens: Traduzivel }>,

  idiomas: [
    { idioma: { pt: 'Português', en: 'Portuguese' }, nivel: { pt: 'nativo', en: 'native' } },
    { idioma: { pt: 'Inglês', en: 'English' }, nivel: { pt: 'intermediário', en: 'intermediate' } },
  ] satisfies ReadonlyArray<{ idioma: Texto; nivel: Texto }>,

  projetos: [
    {
      nome: 'Beka',
      stack: 'Electron, TypeScript, Ollama',
      ano: 2026,
      descricao: {
        pt: 'assistente virtual para desktop com IA local e personagem animada, com memória e personalidade próprias, que conversa e controla aplicações do computador.',
        en: 'desktop virtual assistant with local AI and an animated character, with her own memory and personality, that chats and controls apps on the computer.',
      },
    },
    {
      nome: 'Nosso Cantinho',
      stack: 'React, NestJS, TypeScript',
      ano: 2026,
      descricao: {
        pt: 'plataforma web full-stack de uso pessoal, com sincronização em tempo real, pet virtual e outras interações.',
        en: 'personal full-stack web platform with real-time sync, a virtual pet and other interactions.',
      },
    },
    {
      nome: 'DeepCore',
      stack: 'Godot, GDScript',
      ano: 2026,
      descricao: {
        pt: 'jogo roguelite 2D de mineração, sobrevivência e defesa de base, com escavação, exploração subterrânea, coleta de recursos e evolução de máquinas.',
        en: '2D roguelite game about mining, survival and base defense, with digging, underground exploration, resource gathering and machine upgrades.',
      },
    },
    {
      nome: 'Mug Customizer',
      stack: 'React, TypeScript',
      ano: 2026,
      descricao: {
        pt: 'personalizador de canecas com prévia 3D em tempo real, aplicação de estampas e ajuste de áreas de impressão e cores.',
        en: 'mug customizer with a real-time 3D preview, custom prints and adjustable print areas and colors.',
      },
      repo: 'https://github.com/AlexsandroFde/Mug_Customizer',
    },
    {
      nome: 'Transcriber',
      stack: 'Python',
      ano: 2026,
      descricao: {
        pt: 'transcrição de reuniões em português brasileiro, com identificação de participantes (diarização) e marcação das falas.',
        en: 'meeting transcription for Brazilian Portuguese, with participant identification (speaker diarization) and labeled lines.',
      },
      repo: 'https://github.com/AlexsandroFde/Transcriber',
    },
    {
      nome: 'Video Cutter',
      stack: 'Flutter, Dart',
      ano: 2026,
      descricao: {
        pt: 'app que divide vídeos locais e do YouTube em vários trechos e os exporta em lote, com corte rápido ou preciso e extração de áudio em MP3.',
        en: 'app that splits local and YouTube videos into several clips and exports them in batch, with fast or precise cuts and MP3 audio extraction.',
      },
      repo: 'https://github.com/AlexsandroFde/Video_Cutter',
    },
    {
      nome: 'G-LIT',
      stack: { pt: 'React, TypeScript, APIs REST', en: 'React, TypeScript, REST APIs' },
      ano: 2024,
      descricao: {
        pt: 'front-end completo do sistema de gestão do Laboratório de Inovação Tecnológica (LIT), com projetos, bolsistas e coordenadores, autenticação e permissões por tipo de usuário.',
        en: 'complete front end of the Technological Innovation Lab (LIT) management system, covering projects, research fellows and coordinators, with authentication and role-based permissions.',
      },
    },
  ] satisfies readonly ProjetoCurriculo[],

  outrosProjetos: {
    pt: 'Outros projetos: SMS (Java RMI, Swing), Meu Busão (Flutter, MySQL), TradeIt (Flutter, Firebase), V-Car (Node.js, Express), Portfólio do LIT (Vue.js), Sort Analytics (Python), Bot Discord (Python) e Math Tool Kit (C). Repositórios em',
    en: 'Other projects: SMS (Java RMI, Swing), Meu Busão (Flutter, MySQL), TradeIt (Flutter, Firebase), V-Car (Node.js, Express), LIT Portfolio (Vue.js), Sort Analytics (Python), Discord Bot (Python) and Math Tool Kit (C). Repositories at',
  } as Texto,

  eventos: [
    {
      titulo: { pt: 'Apresentação de pesquisa, ENICIT', en: 'Research presentation, ENICIT' },
      data: '11/2024',
      descricao: {
        pt: 'uso de redes neurais convolucionais (CNNs) com Transfer Learning no apoio à heteroidentificação racial a partir de imagens faciais, com resultados estatísticos e implicações técnicas e sociais.',
        en: 'convolutional neural networks (CNNs) with Transfer Learning to support racial hetero-identification from facial images, covering statistical results and technical and social implications.',
      },
    },
    {
      titulo: { pt: 'Expositor, Feira do Conhecimento', en: 'Exhibitor, Knowledge Fair' },
      data: '11/2022',
      descricao: { pt: 'apresentação e supervisão de projetos.', en: 'presented and supervised projects.' },
    },
    {
      titulo: { pt: '1º lugar, Techstars Startup Weekend Fortaleza', en: '1st place, Techstars Startup Weekend Fortaleza' },
      data: '10/2022',
      descricao: {
        pt: 'integrei o time fundador de uma startup, participei da coleta de dados e do aprimoramento da ideia e preparei o pitch que levou a equipe ao 1º lugar.',
        en: "part of a startup's founding team; helped collect data and refine the idea, and prepared the pitch that took the team to 1st place.",
      },
    },
  ] satisfies readonly Evento[],
}
