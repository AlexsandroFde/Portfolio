import { activities, education, type JourneyItem } from '../data/journey.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { ArrowUpRight } from './icons.tsx'
import { Reveal } from './Reveal.tsx'
import { Section } from './Section.tsx'

function Timeline({ title, items }: { title: string; items: readonly JourneyItem[] }) {
  const t = useT()

  return (
    <div>
      <Reveal as="div">
        <h3 className="label pb-4 text-subtle">{title}</h3>
      </Reveal>
      <ol className="border-t border-line">
        {items.map((item, index) => (
          <Reveal
            as="li"
            key={`${t(item.period)}-${t(item.title)}`}
            delay={Math.min(index, 6) * 45}
            className="grid gap-x-6 gap-y-2 border-b border-line py-6 md:grid-cols-[9rem_minmax(0,1fr)] md:py-7"
          >
            <p className="label pt-1.5 text-muted">{t(item.period)}</p>
            <div>
              <h4 className="text-lg font-medium leading-snug tracking-[-0.02em] md:text-xl">
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 transition-colors hover:text-accent"
                  >
                    {t(item.title)}
                    <ArrowUpRight className="size-4 text-subtle transition-[transform,color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                    <span className="sr-only"> {t(ui.trajetoria.abreSite)}</span>
                  </a>
                ) : (
                  t(item.title)
                )}
              </h4>
              <p className="mt-1 text-sm text-subtle">{t(item.detail)}</p>
              <p className="mt-3 max-w-2xl text-pretty text-[0.9375rem] leading-relaxed text-muted">
                {t(item.description)}
              </p>
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  )
}

export function Journey() {
  const t = useT()

  return (
    <Section id="trajetoria" index="03" title={t(ui.nav.trajetoria)}>
      <div className="grid gap-14">
        <Timeline title={t(ui.trajetoria.formacao)} items={education} />
        <Timeline title={t(ui.trajetoria.experiencias)} items={activities} />
      </div>
    </Section>
  )
}
