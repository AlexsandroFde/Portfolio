import type { Texto } from './idioma.ts'

const t = (pt: string, en: string): Texto => ({ pt, en })

/** Textos fixos da interface (os do conteúdo ficam em src/data). */
export const ui = {
  pularConteudo: t('Pular para o conteúdo', 'Skip to content'),
  secoes: t('Seções', 'Sections'),
  nav: {
    sobre: t('Sobre', 'About'),
    projetos: t('Projetos', 'Projects'),
    trajetoria: t('Trajetória', 'Background'),
    habilidades: t('Habilidades', 'Skills'),
    contato: t('Contato', 'Contact'),
  },
  tema: {
    rotulo: t('Alternar entre tema claro e escuro', 'Switch between light and dark theme'),
    titulo: t('Alternar tema', 'Switch theme'),
  },
  menu: {
    abrir: t('Abrir menu', 'Open menu'),
    fechar: t('Fechar menu', 'Close menu'),
  },
  // Link para a versão no outro idioma. O texto é escrito no idioma de destino
  // (na página em português, o link e a dica ficam em inglês, e vice-versa).
  outroIdioma: {
    sigla: t('EN', 'PT'),
    nome: t('English version', 'versão em português'),
    dica: t('Read this page in English', 'Ler esta página em português'),
  },
  hero: {
    retrato: t('Retrato de', 'Portrait of'),
    verProjetos: t('Ver projetos', 'View projects'),
    contato: t('Entrar em contato', 'Get in touch'),
  },
  sobre: {
    linguagens: t('linguagens de programação', 'programming languages'),
  },
  projetos: {
    chamada: t(
      'Uma seleção do que venho construindo: de plataformas web e aplicativos a jogos e ferramentas em Python.',
      "A selection of what I've been building, from web platforms and apps to games and Python tools.",
    ),
    destaques: t('Destaques', 'Featured'),
    outros: t('Outros projetos', 'Other projects'),
    filtrar: t('Filtrar outros projetos', 'Filter other projects'),
    todos: t('Todos', 'All'),
    tecnologias: t('Tecnologias', 'Technologies'),
    privado: t('Repositório privado', 'Private repository'),
    abreRepositorio: t('(abre o repositório no GitHub em nova aba)', '(opens the GitHub repository in a new tab)'),
    maisRepositorios: t('Mais repositórios no', 'More repositories on'),
    exibido: t('projeto exibido', 'project shown'),
    exibidos: t('projetos exibidos', 'projects shown'),
  },
  video: {
    pausar: t('Pausar vídeo', 'Pause video'),
    reproduzir: t('Reproduzir vídeo', 'Play video'),
    pausarCurto: t('Pausar', 'Pause'),
    reproduzirCurto: t('Reproduzir', 'Play'),
  },
  trajetoria: {
    formacao: t('Formação', 'Education'),
    experiencias: t('Experiências e atividades', 'Experience and activities'),
    abreSite: t('(abre o site em nova aba)', '(opens the website in a new tab)'),
  },
  habilidades: {
    legenda: t('Em destaque, a stack que mais uso no dia a dia.', 'Highlighted: the stack I use most, day to day.'),
    cursos: t('Cursos', 'Courses'),
    principal: t('(stack principal)', '(main stack)'),
  },
  contato: {
    titulo: t('Vamos conversar?', "Let's talk"),
    texto: t(
      'Quer conversar sobre um projeto, uma ideia ou uma oportunidade? O jeito mais rápido de falar comigo é por e-mail ou WhatsApp.',
      'Want to talk about a project, an idea or an opportunity? The fastest way to reach me is by email or WhatsApp.',
    ),
    copiar: t('Copiar', 'Copy'),
    copiado: t('Copiado!', 'Copied!'),
    copiarEmail: t('Copiar e-mail', 'Copy email'),
    emailCopiado: t('E-mail copiado', 'Email copied'),
    avisoCopiado: t('E-mail copiado para a área de transferência', 'Email copied to the clipboard'),
    local: t('Local', 'Location'),
  },
  rodape: {
    feitoCom: t('Feito com React, TypeScript e Tailwind CSS', 'Built with React, TypeScript and Tailwind CSS'),
    voltarTopo: t('Voltar ao topo', 'Back to top'),
  },
} as const
