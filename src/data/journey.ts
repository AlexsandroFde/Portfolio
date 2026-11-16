import type { Texto, Traduzivel } from '../i18n/idioma.ts'

export interface JourneyItem {
  period: Traduzivel
  title: Traduzivel
  detail: Texto
  description: Texto
  /** Site da instituição (opcional): o título vira um link. */
  href?: string
}

export const education: readonly JourneyItem[] = [
  {
    period: { pt: '2021.2 – 2026.1', en: '2021 – 2026' },
    title: { pt: 'Bacharelado em Engenharia de Computação', en: "Bachelor's in Computer Engineering" },
    detail: {
      pt: 'IFCE · Campus Fortaleza · Concluído em 2026.1',
      en: 'IFCE · Fortaleza campus · Graduated in 2026',
    },
    description: {
      pt: 'Principais disciplinas: Estrutura de Dados, Programação Orientada a Objetos, Banco de Dados, Pesquisa e Ordenação, Microcontroladores e Microprocessadores.',
      en: 'Main courses: Data Structures, Object-Oriented Programming, Databases, Searching and Sorting, Microcontrollers and Microprocessors.',
    },
  },
]

/** Mais recentes primeiro. */
export const activities: readonly JourneyItem[] = [
  {
    period: { pt: 'Mai 2025 – atual', en: 'May 2025 – present' },
    title: 'Instituto Iracema',
    detail: { pt: 'Desenvolvedor de Software · Sala Braille', en: 'Software Developer · Sala Braille' },
    description: {
      pt: 'Desenvolvo o aplicativo Sala Braille, parte de um ecossistema de alfabetização em braille para estudantes cegos em escolas inclusivas, que também reúne equipamentos físicos como SlateBraille, NoteBraille e BrailleBoard. O aplicativo oferece aulas remotas e acompanha o progresso de cada estudante.',
      en: "I develop the Sala Braille app, part of a braille literacy ecosystem for blind students in inclusive schools that also includes physical devices such as SlateBraille, NoteBraille and BrailleBoard. The app offers remote lessons and tracks each student's progress.",
    },
    href: 'https://institutoiracema.org.br/pt',
  },
  {
    period: 'Nov 2024',
    title: 'ENICIT',
    detail: { pt: 'Apresentação de pesquisa', en: 'Research presentation' },
    description: {
      pt: 'Apresentei uma pesquisa sobre o uso de redes neurais convolucionais (CNNs) no apoio à heteroidentificação racial com imagens faciais. Expliquei a metodologia de Transfer Learning, os resultados estatísticos e as implicações técnicas e sociais da solução.',
      en: 'I presented research on using convolutional neural networks (CNNs) to support racial hetero-identification from facial images. I explained the Transfer Learning methodology, the statistical results and the technical and social implications of the solution.',
    },
  },
  {
    period: { pt: 'Mai 2024', en: 'May 2024' },
    title: { pt: 'Desenvolvedor freelancer', en: 'Freelance Developer' },
    detail: { pt: 'Site para um lava a jato', en: 'Website for a car wash' },
    description: {
      pt: 'Desenvolvi o site de um lava a jato com soluções personalizadas, contribuindo para a presença digital do cliente.',
      en: "I built a car wash's website with custom solutions, strengthening the client's online presence.",
    },
  },
  {
    period: 'Nov 2022',
    title: { pt: 'Feira do Conhecimento', en: 'Knowledge Fair' },
    detail: { pt: 'Expositor', en: 'Exhibitor' },
    description: {
      pt: 'Apresentei e supervisionei projetos, trocando e assimilando ideias inovadoras.',
      en: 'I presented and supervised projects, exchanging and absorbing innovative ideas.',
    },
  },
  {
    period: { pt: 'Out 2022', en: 'Oct 2022' },
    title: 'Techstars Startup Weekend Fortaleza',
    detail: { pt: '1º lugar', en: '1st place' },
    description: {
      pt: 'Integrei o time fundador de uma startup. Participei das palestras de apoio ao desenvolvimento do projeto, coletamos dados, aprimoramos a ideia e preparei o pitch que levou a nossa equipe ao 1º lugar do evento.',
      en: "I was part of a startup's founding team. I attended the talks that supported the project's development, we collected data and refined the idea, and I prepared the pitch that took our team to 1st place.",
    },
  },
]
