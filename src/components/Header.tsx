import { useEffect, useState } from 'react'
import { profile } from '../data/profile.ts'
import { useActiveSection } from '../hooks/useActiveSection.ts'
import { caminhos, useIdioma, useT, type Idioma } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { botaoIcone } from '../lib/estilos.ts'
import { Close, Menu, Monogram } from './icons.tsx'
import { SoundToggle } from './SoundToggle.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

const links = [
  { id: 'sobre', label: ui.nav.sobre },
  { id: 'projetos', label: ui.nav.projetos },
  { id: 'trajetoria', label: ui.nav.trajetoria },
  { id: 'habilidades', label: ui.nav.habilidades },
  { id: 'contato', label: ui.nav.contato },
] as const

const sectionIds = links.map((link) => link.id)

const langAttr: Record<Idioma, string> = { pt: 'pt-BR', en: 'en' }

/**
 * Link "EN"/"PT" para a mesma página no outro idioma. Os ids das seções são
 * iguais nas duas versões, então o link leva junto a seção que está na tela.
 */
function OutroIdioma({ secao }: { secao: string | null }) {
  const idioma = useIdioma()
  const t = useT()
  const outro: Idioma = idioma === 'pt' ? 'en' : 'pt'

  return (
    <a
      href={`${caminhos[outro]}${secao ? `#${secao}` : ''}`}
      hrefLang={langAttr[outro]}
      lang={langAttr[outro]}
      title={t(ui.outroIdioma.dica)}
      className="label grid h-9 min-w-9 place-items-center rounded-full px-2 font-medium text-muted transition-colors hover:bg-surface hover:text-fg"
    >
      <span>
        {t(ui.outroIdioma.sigla)}
        <span className="sr-only"> {t(ui.outroIdioma.nome)}</span>
      </span>
    </a>
  )
}

export function Header() {
  const t = useT()
  const active = useActiveSection(sectionIds)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    // Ao passar para a largura de desktop, o menu móvel deixa de existir.
    const desktop = window.matchMedia('(min-width: 48rem)')
    const onChange = () => {
      if (desktop.matches) setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onChange)
    }
  }, [menuOpen])

  return (
    <header
      // Rolada, a página passa por trás do cabeçalho, desfocada. A marca fica num atributo: a foto do
      // topo do site, que o buraco negro mostra na volta ao topo, tira a marca do clone e mostra o
      // cabeçalho como ele é no topo (veja lib/buracoNegro/index.ts).
      data-rolado={scrolled ? '' : undefined}
      className={cx(
        'print-hidden fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300',
        // Com o menu aberto o fundo fica opaco, para o conteúdo não aparecer por trás.
        menuOpen
          ? 'border-line bg-bg'
          : 'border-transparent data-[rolado]:border-line data-[rolado]:bg-bg/80 data-[rolado]:backdrop-blur-lg',
      )}
    >
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <a
          href="#topo"
          className="flex items-center gap-3 text-[0.9375rem] font-medium tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          <Monogram className="size-6" />
          <span>{profile.shortName}</span>
        </a>

        <div className="flex items-center gap-1">
          <nav aria-label={t(ui.secoes)} className="mr-2 hidden items-center md:flex">
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={active === link.id ? 'true' : undefined}
                className="relative rounded-full px-3 py-1.5 text-sm text-muted transition-colors before:absolute before:left-0.5 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity hover:text-fg aria-[current]:text-fg aria-[current]:before:opacity-100"
              >
                {t(link.label)}
              </a>
            ))}
          </nav>

          <OutroIdioma secao={active} />
          {/* No celular estreito, o nome quebraria em duas linhas: o som fica no menu (abaixo). */}
          <div className="hidden sm:contents">
            <SoundToggle />
          </div>
          <ThemeToggle />

          <button
            type="button"
            className={cx(botaoIcone, 'md:hidden')}
            aria-expanded={menuOpen}
            aria-controls="menu-movel"
            aria-label={t(menuOpen ? ui.menu.fechar : ui.menu.abrir)}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <Close className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <nav
        id="menu-movel"
        aria-label={t(ui.secoes)}
        hidden={!menuOpen}
        className="wrap border-t border-line pb-6 pt-2 md:hidden"
      >
        <ul>
          {links.map((link, index) => (
            <li key={link.id} className="border-b border-line last:border-b-0">
              <a
                href={`#${link.id}`}
                className="flex items-baseline gap-4 py-4 text-2xl font-medium tracking-tight"
                onClick={() => setMenuOpen(false)}
              >
                <span className="label text-subtle" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {t(link.label)}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-4 sm:hidden">
          <span className="label text-subtle">{t(ui.som.rotulo)}</span>
          <SoundToggle />
        </div>
      </nav>
    </header>
  )
}
