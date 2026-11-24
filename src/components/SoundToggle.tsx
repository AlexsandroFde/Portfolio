import { useSyncExternalStore, type MouseEvent } from 'react'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { botaoIcone } from '../lib/estilos.ts'
import { alternarSom, estadoDoSom, ouvirSom, type EstadoDoSom } from '../lib/som/index.ts'
import { SoundOff, SoundOn } from './icons.tsx'

/** No HTML pré-renderizado, e até a página hidratar, o som está desligado. */
const desligadoNoServidor = (): EstadoDoSom => 'desligado'

/**
 * Botão dos efeitos sonoros (veja lib/som). O som começa desligado e só toca para quem o liga; ligado,
 * a onda do próprio clique é o primeiro som. O ícone mostra o que se ouve: com o som guardado como
 * ligado, mas ainda à espera do primeiro clique na página, ele aparece desligado.
 */
export function SoundToggle() {
  const t = useT()
  const tocando = useSyncExternalStore(ouvirSom, estadoDoSom, desligadoNoServidor) === 'tocando'

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    alternarSom(rect.left + rect.width / 2)
  }

  return (
    <button
      type="button"
      data-som=""
      onClick={onClick}
      className={botaoIcone}
      aria-pressed={tocando}
      aria-label={t(ui.som.rotulo)}
      title={t(tocando ? ui.som.desligar : ui.som.ligar)}
    >
      {tocando ? <SoundOn className="size-[1.125rem]" /> : <SoundOff className="size-[1.125rem]" />}
    </button>
  )
}
