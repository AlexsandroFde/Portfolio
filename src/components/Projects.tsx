import { useMemo, useState } from 'react'
import { profile } from '../data/profile.ts'
import { areas, projects, type Area, type Project } from '../data/projects.ts'
import { useT, type Texto, type Traduzivel } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { cx } from '../lib/cx.ts'
import { ArrowUpRight, Lock } from './icons.tsx'
import { ProjectVideo } from './ProjectVideo.tsx'
import { Reveal } from './Reveal.tsx'
import { Section } from './Section.tsx'

type Filter = 'todos' | Area

const areaLabel = Object.fromEntries(areas.map((area) => [area.id, area.label])) as Record<Area, Texto>

/** Destaques na ordem definida em `featured`; o resto vai para a lista compacta. */
const featured = projects
  .filter((project) => project.featured !== undefined)
  .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0))
const others = projects.filter((project) => project.featured === undefined)

function select(filter: Filter): readonly Project[] {
  return filter === 'todos' ? others : others.filter((project) => project.area === filter)
}

// só as áreas que têm algum projeto na lista
const filters = [{ id: 'todos' as Filter, label: ui.projetos.todos }, ...areas]
  .map((option) => ({ ...option, count: select(option.id).length }))
  .filter((option) => option.count > 0)

const repoUrl = (project: Project) =>
  project.repo ? `${profile.github.href}/${project.repo}` : undefined

/** Ano e o ícone de link (repositório público) ou de cadeado (privado). */
function Meta({ year, href }: { year: number; href?: string }) {
  const t = useT()

  return (
    <span className="flex items-center gap-2.5">
      <span className="font-mono text-xs tabular-nums text-muted">{year}</span>
      {href ? (
        <ArrowUpRight className="size-4 text-subtle transition-[transform,color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      ) : (
        <span title={t(ui.projetos.privado)}>
          <Lock className="size-4 text-faint" />
          <span className="sr-only">{t(ui.projetos.privado)}</span>
        </span>
      )}
    </span>
  )
}

/** Nome do projeto; com repositório, o link cobre o cartão ou a linha inteira. */
function Title({ project, href, className }: { project: Project; href?: string; className: string }) {
  const t = useT()

  return (
    <h4 className={className}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm transition-colors after:absolute after:inset-0 group-hover:text-accent"
        >
          {t(project.name)}
          <span className="sr-only"> {t(ui.projetos.abreRepositorio)}</span>
        </a>
      ) : (
        t(project.name)
      )}
    </h4>
  )
}

function Stack({ items, className }: { items: readonly Traduzivel[]; className?: string }) {
  const t = useT()

  return (
    <ul
      className={cx('label flex flex-wrap gap-x-3 gap-y-1 text-subtle', className)}
      aria-label={t(ui.projetos.tecnologias)}
    >
      {items.map((tech) => (
        <li key={t(tech)}>{t(tech)}</li>
      ))}
    </ul>
  )
}

function FeaturedCard({ project, index }: { project: Project; index: number }) {
  const t = useT()
  const href = repoUrl(project)

  return (
    <Reveal
      as="li"
      delay={Math.min(index, 6) * 60}
      className={cx(
        'group relative isolate flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/40 transition-colors duration-300',
        href && 'hover:border-line-strong',
        // com vídeo: largura toda no tablet; no desktop, metade da largura e a altura de dois cartões
        project.video && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
      )}
    >
      {project.video && <ProjectVideo video={project.video} className="border-b border-line" />}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="label text-subtle">{t(areaLabel[project.area])}</span>
          <Meta year={project.year} href={href} />
        </div>
        <Title
          project={project}
          href={href}
          className="mt-3 text-xl font-medium leading-snug tracking-[-0.02em]"
        />
        <p className="mt-2 text-pretty text-[0.9375rem] leading-relaxed text-muted">
          {t(project.description)}
        </p>
        <Stack items={project.stack} className="mt-auto pt-5" />
      </div>
    </Reveal>
  )
}

function ProjectRow({ project, index }: { project: Project; index: number }) {
  const t = useT()
  const href = repoUrl(project)

  return (
    <Reveal
      as="li"
      delay={Math.min(index, 8) * 40}
      className={cx(
        'group relative isolate border-b border-line',
        // realce da linha inteira ao passar o mouse nos projetos com link
        href &&
          'before:absolute before:-inset-x-3 before:inset-y-0 before:-z-10 before:rounded-xl before:bg-surface before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 sm:before:-inset-x-4',
      )}
    >
      {/* celular: nome e ano / resumo / tecnologias. desktop: nome e ano / resumo e tecnologias */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1.5 py-4 md:py-5">
        <Title
          project={project}
          href={href}
          className="col-start-1 row-start-1 text-base font-medium leading-snug tracking-[-0.01em] md:text-lg"
        />
        <span className="col-start-2 row-start-1 justify-self-end">
          <Meta year={project.year} href={href} />
        </span>
        <p className="col-span-2 row-start-2 text-pretty text-[0.9375rem] leading-relaxed text-muted md:col-span-1">
          {t(project.summary)}
        </p>
        <Stack
          items={project.stack}
          className="col-span-2 row-start-3 md:col-span-1 md:col-start-2 md:row-start-2 md:justify-end"
        />
      </div>
    </Reveal>
  )
}

export function Projects() {
  const t = useT()
  const [filter, setFilter] = useState<Filter>('todos')
  const visible = useMemo(() => select(filter), [filter])

  const showcase = (
    <>
      <Reveal as="div">
        <h3 className="label mb-6 text-subtle">{t(ui.projetos.destaques)}</h3>
      </Reveal>
      {/* desktop: duas colunas; os cartões com vídeo ocupam duas linhas e os outros se encaixam ao lado */}
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-flow-dense">
        {featured.map((project, index) => (
          <FeaturedCard key={t(project.name)} project={project} index={index} />
        ))}
      </ul>

      {/* grid-cols-1 e min-w-0: a linha de filtros que rola para o lado não pode alargar a coluna */}
      <div className="mt-20 grid grid-cols-1 gap-x-8 gap-y-6 md:mt-24 md:grid-cols-12">
        <div className="min-w-0 md:col-span-3">
          {/* cabeçalho fixo no mesmo estilo das seções: a grade de destaques ocupa a largura toda e
              não deixa o título "Projetos" ficar fixo, então ele reaparece aqui como contexto */}
          <Reveal className="md:sticky md:top-28">
            <p className="label text-accent" aria-hidden="true">
              02 · {t(ui.nav.projetos)}
            </p>
            <h3 className="mt-3 text-xl font-medium tracking-[-0.03em] md:text-2xl">
              {t(ui.projetos.outros)}
            </h3>
            {/* celular: pílulas numa linha que rola para o lado; desktop: lista vertical */}
            <div
              role="group"
              aria-label={t(ui.projetos.filtrar)}
              className="print-hidden -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:mt-5 md:flex-col md:items-stretch md:gap-0.5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className="group/filtro inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line px-3.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg md:h-auto md:justify-between md:rounded-md md:border-0 md:px-0 md:py-1.5 md:aria-pressed:bg-transparent md:aria-pressed:text-fg"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="hidden size-1.5 rounded-full bg-accent opacity-0 transition-opacity group-aria-pressed/filtro:opacity-100 md:inline-block"
                    />
                    {t(item.label)}
                  </span>
                  <span className="font-mono text-[0.6875rem] tabular-nums text-subtle group-aria-pressed/filtro:text-bg/70 md:group-aria-pressed/filtro:text-subtle">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="min-w-0 md:col-span-9">
          {/* A chave recria a lista a cada filtro, reiniciando a animação de entrada. */}
          <ol key={filter} className="border-t border-line">
            {visible.map((project, index) => (
              <ProjectRow key={t(project.name)} project={project} index={index} />
            ))}
          </ol>

          <p className="sr-only" role="status">
            {visible.length} {t(visible.length === 1 ? ui.projetos.exibido : ui.projetos.exibidos)}
          </p>

          <Reveal as="p" className="print-hidden mt-8 text-sm text-muted">
            {t(ui.projetos.maisRepositorios)}{' '}
            <a
              href={profile.github.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              GitHub
              <ArrowUpRight className="size-3.5" />
            </a>
          </Reveal>
        </div>
      </div>
    </>
  )

  return (
    <Section id="projetos" index="02" title={t(ui.nav.projetos)} after={showcase}>
      <Reveal
        as="p"
        className="max-w-3xl text-balance text-2xl font-medium leading-[1.3] tracking-[-0.02em] sm:text-[1.75rem]"
      >
        {t(ui.projetos.chamada)}
      </Reveal>
    </Section>
  )
}
