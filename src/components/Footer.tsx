import { useSyncExternalStore } from 'react'
import { profile } from '../data/profile.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { ArrowUp } from './icons.tsx'

const subscribe = () => () => {}

/**
 * Ano atual. O HTML pré-renderizado usa o ano em que o site foi gerado; no
 * navegador vale o ano corrente, caso o site fique um tempo sem novo deploy.
 */
function useCurrentYear(): number {
  return useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => __BUILD_YEAR__,
  )
}

/** Rodapé. `topo` mostra o link "Voltar ao topo" (dispensável em páginas curtas, como a de erro). */
export function Footer({ topo = true }: { topo?: boolean }) {
  const t = useT()
  const year = useCurrentYear()

  return (
    <footer className="border-t border-line">
      <div className="wrap flex flex-col gap-3 py-8 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {profile.name}
        </p>
        <p className="text-subtle">{t(ui.rodape.feitoCom)}</p>
        {topo && (
          <a
            href="#topo"
            className="print-hidden inline-flex items-center gap-1.5 transition-colors hover:text-fg"
          >
            {t(ui.rodape.voltarTopo)}
            <ArrowUp className="size-3.5" />
          </a>
        )}
      </div>
    </footer>
  )
}
