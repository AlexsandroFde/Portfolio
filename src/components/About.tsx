import { about, marcos, projetosDesenvolvidos } from '../data/profile.ts'
import { skillGroups } from '../data/skills.ts'
import { useT, type Texto, type Traduzivel } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { Reveal } from './Reveal.tsx'
import { Section } from './Section.tsx'

const numeros: ReadonlyArray<{ valor: Traduzivel; rotulo: Texto }> = [
  projetosDesenvolvidos,
  // contado a partir de skills.ts: muda sozinho quando a lista de linguagens muda
  {
    valor: String(skillGroups.find((grupo) => grupo.id === 'linguagens')?.items.length ?? 0),
    rotulo: ui.sobre.linguagens,
  },
  ...marcos,
]

export function About() {
  const t = useT()

  return (
    <Section id="sobre" index="01" title={t(ui.nav.sobre)}>
      <Reveal
        as="p"
        className="max-w-3xl text-balance text-2xl font-medium leading-[1.3] tracking-[-0.02em] sm:text-[1.75rem]"
      >
        {t(about.lead)}
      </Reveal>

      <div className="mt-10 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        {about.paragraphs.map((paragraph, index) => (
          <Reveal
            as="p"
            key={paragraph.pt}
            delay={index * 80}
            className="text-pretty leading-relaxed text-muted"
          >
            {t(paragraph)}
          </Reveal>
        ))}
      </div>

      <Reveal
        as="dl"
        delay={160}
        className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 md:grid-cols-4"
      >
        {numeros.map((numero) => (
          // o rótulo vem antes no HTML (dt/dd), mas aparece embaixo do número
          <div key={numero.rotulo.pt} className="flex flex-col-reverse justify-end gap-2">
            <dt className="text-pretty text-sm leading-snug text-muted">{t(numero.rotulo)}</dt>
            <dd className="text-[2rem] font-medium leading-none tracking-[-0.04em] tabular-nums md:text-4xl">
              {t(numero.valor)}
            </dd>
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
