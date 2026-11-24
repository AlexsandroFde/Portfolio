import { ui } from '../i18n/interface.ts'

/**
 * As seções da página, na ordem do menu. Os ids são iguais nas duas versões: o link do outro idioma
 * leva junto a seção que está na tela.
 */
export const secoes = [
  { id: 'sobre', label: ui.nav.sobre },
  { id: 'projetos', label: ui.nav.projetos },
  { id: 'trajetoria', label: ui.nav.trajetoria },
  { id: 'habilidades', label: ui.nav.habilidades },
  { id: 'contato', label: ui.nav.contato },
] as const

/** Os ids das seções, numa referência estável (para useActiveSection). */
export const idsDasSecoes = secoes.map((secao) => secao.id)
