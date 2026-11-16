import { courses, principais, skillGroups } from '../data/skills.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { Reveal } from './Reveal.tsx'
import { Section } from './Section.tsx'

const row = 'grid gap-x-6 gap-y-3 border-b border-line py-6 md:grid-cols-[9rem_minmax(0,1fr)]'
const pilula = 'rounded-full border px-3 py-1 text-sm leading-6'

export function Skills() {
  const t = useT()

  return (
    <Section id="habilidades" index="04" title={t(ui.nav.habilidades)}>
      <Reveal as="p" className="mb-6 flex items-center gap-2.5 text-sm text-muted">
        <span aria-hidden="true" className="h-4 w-7 flex-none rounded-full bg-fg" />
        {t(ui.habilidades.legenda)}
      </Reveal>

      <dl className="border-t border-line">
        {skillGroups.map((group, index) => (
          <Reveal key={group.id} delay={index * 45} className={row}>
            <dt className="label pt-2 text-muted">{t(group.label)}</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const principal = typeof item === 'string' && principais.has(item)
                  return (
                    <li
                      key={t(item)}
                      className={cx(pilula, principal ? 'border-fg bg-fg font-medium text-bg' : 'border-line')}
                    >
                      {t(item)}
                      {principal && <span className="sr-only"> {t(ui.habilidades.principal)}</span>}
                    </li>
                  )
                })}
              </ul>
            </dd>
          </Reveal>
        ))}

        <Reveal delay={skillGroups.length * 45} className={row}>
          <dt className="label pt-1 text-muted">{t(ui.habilidades.cursos)}</dt>
          <dd>
            <ul className="grid gap-x-8 gap-y-2 text-[0.9375rem] leading-relaxed text-muted sm:grid-cols-2">
              {courses.map((course) => (
                <li key={course.pt}>{t(course)}</li>
              ))}
            </ul>
          </dd>
        </Reveal>
      </dl>
    </Section>
  )
}
