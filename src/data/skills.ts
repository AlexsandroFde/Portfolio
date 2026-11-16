import type { Texto, Traduzivel } from '../i18n/idioma.ts'

export interface SkillGroup {
  id: 'linguagens' | 'frameworks' | 'ferramentas' | 'interpessoais'
  label: Texto
  items: readonly Traduzivel[]
}

export const skillGroups: readonly SkillGroup[] = [
  {
    id: 'linguagens',
    label: { pt: 'Linguagens', en: 'Languages' },
    items: ['TypeScript', 'JavaScript', 'Python', 'Dart', 'Java', 'C', 'Swift', 'GDScript'],
  },
  {
    id: 'frameworks',
    label: { pt: 'Frameworks', en: 'Frameworks' },
    items: ['React', 'React Native', 'Vue.js', 'Flutter', 'NestJS', 'Node.js', 'Electron', 'Godot'],
  },
  {
    id: 'ferramentas',
    label: { pt: 'Ferramentas', en: 'Tools' },
    items: [
      'Git & GitHub',
      'MySQL',
      'Firebase',
      'Ollama',
      'VS Code',
      'Android Studio',
      'Raspberry Pi',
      'Arduino',
      'Proteus',
    ],
  },
  {
    id: 'interpessoais',
    label: { pt: 'Interpessoais', en: 'Soft skills' },
    items: [
      { pt: 'Trabalho em equipe', en: 'Teamwork' },
      { pt: 'Comunicação eficaz', en: 'Effective communication' },
      { pt: 'Resolução de problemas', en: 'Problem solving' },
      { pt: 'Gestão de projetos', en: 'Project management' },
      { pt: 'Aprendizagem rápida', en: 'Fast learning' },
    ],
  },
]

/** Stack principal: aparece em destaque (pílula preenchida) em Habilidades. */
export const principais: ReadonlySet<string> = new Set(['TypeScript', 'Python', 'React', 'Flutter'])

export const courses: readonly Texto[] = [
  { pt: 'Criação de Apps Android/iOS/Web com Flutter', en: 'Building Android/iOS/Web Apps with Flutter' },
  {
    pt: 'React Native: Desenvolva APPs Nativas para Android e iOS',
    en: 'React Native: Build Native Apps for Android and iOS',
  },
  {
    pt: 'Java COMPLETO Programação Orientada a Objetos + Projetos',
    en: 'Complete Java: Object-Oriented Programming + Projects',
  },
  { pt: 'Introdução ao Desenvolvimento Android', en: 'Introduction to Android Development' },
  { pt: 'Python 3', en: 'Python 3' },
  { pt: 'Introdução à Programação', en: 'Introduction to Programming' },
]
