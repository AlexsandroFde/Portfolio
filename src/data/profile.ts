import type { Texto, Traduzivel } from '../i18n/idioma.ts'

// Os textos ficam em pares { pt, en }: o português vai para a página principal e o inglês para /en/.

export const profile = {
  name: 'Alexsandro Ferreira da Silva',
  shortName: 'Alexsandro Ferreira',
  firstName: 'Alexsandro',
  lastName: 'Ferreira da Silva',
  role: { pt: 'Desenvolvedor de Software', en: 'Software Developer' },
  status: { pt: 'Atualmente no Instituto Iracema', en: 'Currently at Instituto Iracema' },
  location: { pt: 'Fortaleza, CE', en: 'Fortaleza, Brazil' },
  coordinates: { pt: '3,73° S · 38,53° O', en: '3.73° S · 38.53° W' },
  timeZone: 'America/Fortaleza',
  email: 'alexsandrofdsilva@gmail.com',
  whatsapp: {
    label: '(85) 9 8895-9513',
    href: 'https://wa.me/558588959513',
  },
  github: {
    label: '@AlexsandroFde',
    href: 'https://github.com/AlexsandroFde',
  },
} as const

export const intro: Texto = {
  pt: 'Crio aplicações web, mobile e jogos, de interfaces em React e Flutter a automações em Python.',
  en: 'I build web and mobile apps and games, from React and Flutter interfaces to Python automation.',
}

/** Resumo rápido exibido logo abaixo da apresentação. */
export const facts: ReadonlyArray<{ label: Texto; value: Texto }> = [
  { label: { pt: 'Base', en: 'Based in' }, value: { pt: 'Fortaleza, CE, Brasil', en: 'Fortaleza, Brazil' } },
  {
    label: { pt: 'Formação', en: 'Education' },
    value: { pt: 'Eng. de Computação, IFCE (2026)', en: 'Computer Engineering, IFCE (2026)' },
  },
  {
    label: { pt: 'Foco', en: 'Focus' },
    value: { pt: 'Web, mobile, automação e jogos', en: 'Web, mobile, automation and games' },
  },
  {
    label: { pt: 'Stack principal', en: 'Main stack' },
    value: { pt: 'TypeScript, React, Flutter e Python', en: 'TypeScript, React, Flutter and Python' },
  },
]

export const about: { lead: Texto; paragraphs: readonly Texto[] } = {
  lead: {
    pt: 'Sou engenheiro de computação, formado pelo IFCE em 2026, e desenvolvo software para web, celular e desktop.',
    en: "I'm a computer engineer, graduated from IFCE in 2026, and I build software for the web, mobile and desktop.",
  },
  paragraphs: [
    {
      pt: 'Hoje trabalho no Instituto Iracema, no aplicativo Sala Braille, que apoia a alfabetização em braille de estudantes cegos em escolas inclusivas.',
      en: 'Today I work at Instituto Iracema on Sala Braille, an app that supports braille literacy for blind students in inclusive schools.',
    },
    {
      pt: 'Fora do trabalho, crio projetos próprios, de uma assistente com IA local a jogos e apps para celular. Gosto de aprender: quando o projeto pede uma tecnologia nova, encaro o estudo com entusiasmo.',
      en: 'Outside of work, I build my own projects, from an assistant powered by local AI to games and mobile apps. I love learning: when a project calls for a new technology, I dive into it with enthusiasm.',
    },
  ],
}

/**
 * Total de projetos, para a seção Sobre: os 37 repositórios do GitHub (públicos e privados), sem o
 * README do perfil e este portfólio, e sem contar os trabalhos profissionais que não estão lá.
 * Atualize quando quiser.
 */
export const projetosDesenvolvidos: { valor: Traduzivel; rotulo: Texto } = {
  valor: '+35',
  rotulo: { pt: 'projetos desenvolvidos', en: 'projects built' },
}

/** Outros números fixos da seção Sobre (o de linguagens é contado a partir de skills.ts). */
export const marcos: ReadonlyArray<{ valor: Traduzivel; rotulo: Texto }> = [
  {
    valor: '2026',
    rotulo: { pt: 'formado em Engenharia de Computação pelo IFCE', en: 'Computer Engineering degree from IFCE' },
  },
  {
    valor: { pt: '1º lugar', en: '1st place' },
    rotulo: { pt: 'no Techstars Startup Weekend Fortaleza', en: 'at Techstars Startup Weekend Fortaleza' },
  },
]
