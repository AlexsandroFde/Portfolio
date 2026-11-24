import { idsDasSecoes } from '../data/secoes.ts'
import { useActiveSection } from '../hooks/useActiveSection.ts'
import { caminhos, useIdioma, useT, type Idioma } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { botaoFlutuante } from '../lib/estilos.ts'

const langAttr: Record<Idioma, string> = { pt: 'pt-BR', en: 'en' }

/**
 * Link "EN"/"PT" para a mesma página no outro idioma, no canto de baixo da tela, ao lado do botão do
 * som. Os ids das seções são iguais nas duas versões, então o link leva junto a seção que está na
 * tela. Ele não depende de JavaScript: sem ele, leva ao começo da outra versão.
 */
export function LanguageToggle() {
  const idioma = useIdioma()
  const t = useT()
  const secao = useActiveSection(idsDasSecoes)
  const outro: Idioma = idioma === 'pt' ? 'en' : 'pt'

  return (
    <a
      href={`${caminhos[outro]}${secao ? `#${secao}` : ''}`}
      hrefLang={langAttr[outro]}
      lang={langAttr[outro]}
      title={t(ui.outroIdioma.dica)}
      className={cx(botaoFlutuante, 'label grid min-w-9 px-2 font-medium')}
    >
      <span>
        {t(ui.outroIdioma.sigla)}
        <span className="sr-only"> {t(ui.outroIdioma.nome)}</span>
      </span>
    </a>
  )
}
