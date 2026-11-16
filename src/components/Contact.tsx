import { useEffect, useRef, useState } from 'react'
import { linkCurriculo } from '../data/curriculo.ts'
import { profile } from '../data/profile.ts'
import { useClock } from '../hooks/useClock.ts'
import { useIdioma, useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { ArrowUpRight, Check, Copy } from './icons.tsx'
import { Reveal } from './Reveal.tsx'
import { Section } from './Section.tsx'

const channel =
  'group flex items-center justify-between gap-4 py-5 transition-colors hover:text-accent'

const arrow =
  'size-4 flex-none text-subtle transition-[transform,color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent'

/** Copia um texto; sem a API de área de transferência (contexto inseguro), usa o caminho antigo. */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const campo = document.createElement('textarea')
    campo.value = texto
    campo.setAttribute('readonly', '')
    campo.style.position = 'fixed'
    campo.style.opacity = '0'
    document.body.append(campo)
    campo.select()
    const ok = document.execCommand('copy')
    campo.remove()
    return ok
  }
}

/** Botão "Copiar" do e-mail, que vira "Copiado!" por dois segundos. */
function CopiarEmail() {
  const t = useT()
  const [copiado, setCopiado] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copiar = async () => {
    if (!(await copiarTexto(profile.email))) return
    setCopiado(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={copiar}
        aria-label={t(copiado ? ui.contato.emailCopiado : ui.contato.copiarEmail)}
        className="print-hidden inline-flex h-9 flex-none items-center gap-2 rounded-full border border-line-strong px-3.5 text-sm text-muted transition-colors hover:border-fg hover:text-fg"
      >
        {copiado ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
        {t(copiado ? ui.contato.copiado : ui.contato.copiar)}
      </button>
      <span className="sr-only" role="status">
        {copiado ? t(ui.contato.avisoCopiado) : ''}
      </span>
    </>
  )
}

export function Contact() {
  const t = useT()
  const idioma = useIdioma()
  const time = useClock(profile.timeZone, idioma)

  const canais = [
    { rotulo: 'WhatsApp', valor: profile.whatsapp.label, href: profile.whatsapp.href },
    { rotulo: 'LinkedIn', valor: profile.linkedin.label, href: profile.linkedin.href },
    { rotulo: 'GitHub', valor: profile.github.label, href: profile.github.href },
    { rotulo: t(ui.contato.curriculo), valor: t(ui.contato.versaoPdf), href: linkCurriculo(idioma), pdf: true },
  ]

  return (
    <Section id="contato" index="05" title={t(ui.nav.contato)}>
      <Reveal
        as="p"
        className="text-[clamp(2.25rem,6vw,4rem)] font-medium leading-none tracking-[-0.045em]"
      >
        {t(ui.contato.titulo)}
      </Reveal>

      <Reveal as="p" delay={60} className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
        {t(ui.contato.texto)}
      </Reveal>

      <Reveal delay={120} className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
        <a
          href={`mailto:${profile.email}`}
          className="group inline-flex max-w-full items-center gap-3 text-lg font-medium tracking-[-0.02em] sm:text-2xl md:text-3xl"
        >
          <span className="min-w-0 break-all underline decoration-line-strong decoration-1 underline-offset-8 transition-colors group-hover:decoration-accent">
            {profile.email}
          </span>
          <ArrowUpRight className="size-5 flex-none text-subtle transition-[transform,color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent sm:size-6" />
        </a>
        <CopiarEmail />
      </Reveal>

      {/* celular: uma coluna; tablet: duas; desktop: três (o "Local" ocupa duas colunas para fechar a grade) */}
      <Reveal
        as="ul"
        delay={180}
        className="mt-14 grid gap-x-8 border-t border-line sm:grid-cols-2 lg:grid-cols-3"
      >
        {canais.map((canal) => (
          <li key={canal.href} className="border-b border-line">
            <a
              href={canal.href}
              target="_blank"
              rel="noreferrer"
              type={canal.pdf ? 'application/pdf' : undefined}
              className={channel}
            >
              <span>
                <span className="label block text-subtle">{canal.rotulo}</span>
                <span className="mt-1.5 block text-[0.9375rem]">{canal.valor}</span>
                {canal.pdf && <span className="sr-only"> {t(ui.pdfNovaAba)}</span>}
              </span>
              <ArrowUpRight className={arrow} />
            </a>
          </li>
        ))}
        <li className="border-b border-line py-5 sm:col-span-2">
          <span className="label block text-subtle">{t(ui.contato.local)}</span>
          <span className="mt-1.5 block text-[0.9375rem]">
            {t(profile.location)}
            <span className="text-subtle"> · </span>
            <span className="tabular-nums">{time ?? '--:--'}</span>
            <span className="text-subtle"> (GMT−3)</span>
          </span>
        </li>
      </Reveal>
    </Section>
  )
}
