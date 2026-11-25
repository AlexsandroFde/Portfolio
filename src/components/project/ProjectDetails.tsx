import { useEffect, useState } from 'react'
import { profile } from '../../data/profile.ts'
import type { FeaturedProject, ProjectDetails as Details, ProjectSection } from '../../data/projects.ts'
import { useT } from '../../i18n/idioma.ts'
import { ui } from '../../i18n/interface.ts'
import { botaoPrimario } from '../../lib/estilos.ts'
import { ArrowUpRight, Lock } from '../icons.tsx'
import { ProjectGallery } from './ProjectGallery.tsx'

type Carga = { estado: 'carregando' } | { estado: 'pronto'; details: Details } | { estado: 'falhou' }

const CARREGANDO: Carga = { estado: 'carregando' }

/**
 * A página do projeto, do módulo dele (veja `details`, em projects.ts). A carga fica junto do projeto
 * de que veio: com outro projeto, ela volta a ser "carregando" até o módulo dele chegar.
 */
function useDetalhes(project: FeaturedProject): Carga {
  const [carga, setCarga] = useState<{ de: FeaturedProject; carga: Carga } | null>(null)

  useEffect(() => {
    let atual = true
    project.details().then(
      (details) => atual && setCarga({ de: project, carga: { estado: 'pronto', details } }),
      () => atual && setCarga({ de: project, carga: { estado: 'falhou' } }),
    )
    return () => {
      atual = false
    }
  }, [project])

  return carga?.de === project ? carga.carga : CARREGANDO
}

function Secao({ secao }: { secao: ProjectSection }) {
  const t = useT()

  return (
    <section>
      <h3 className="label text-accent">{t(secao.title)}</h3>
      {secao.paragraphs?.map((paragrafo) => (
        <p key={paragrafo.pt} className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-muted">
          {t(paragrafo)}
        </p>
      ))}
      {secao.items && (
        <ul className="mt-3 space-y-2">
          {secao.items.map((item) => (
            <li
              key={item.pt}
              className="relative pl-4 text-pretty text-[0.9375rem] leading-relaxed text-muted before:absolute before:left-0 before:top-[0.6em] before:size-1.5 before:rounded-full before:bg-accent"
            >
              {t(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Onde está o código: o botão para o repositório no GitHub ou o aviso de que ele é privado. */
function Codigo({ repo }: { repo?: string }) {
  const t = useT()

  if (!repo) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-subtle">
        <Lock className="size-4" />
        {t(ui.projeto.codigoPrivado)}
      </p>
    )
  }
  return (
    <a href={`${profile.github.href}/${repo}`} target="_blank" rel="noreferrer" className={botaoPrimario}>
      {t(ui.projeto.verCodigo)}
      <ArrowUpRight className="size-4" />
      <span className="sr-only"> {t(ui.projetos.abreRepositorio)}</span>
    </a>
  )
}

/** Enquanto o módulo do projeto chega: o lugar da galeria e do texto, já no tamanho. */
function Esqueleto() {
  const t = useT()

  return (
    <div role="status" className="animate-pulse">
      <span className="sr-only">{t(ui.projeto.carregando)}</span>
      <div className="aspect-video rounded-xl bg-surface" />
      <div className="mt-4 h-4 w-2/3 rounded bg-surface" />
    </div>
  )
}

/**
 * A página de um projeto em destaque: as demonstrações (fixas no alto da coluna, no computador) e,
 * ao lado, a apresentação, as partes do texto, as tecnologias e o caminho para o código.
 */
export function ProjectDetails({ project }: { project: FeaturedProject }) {
  const t = useT()
  const carga = useDetalhes(project)
  const details = carga.estado === 'pronto' ? carga.details : null

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
        {details ? (
          // a prévia do cartão abre a galeria: a página continua de onde o cartão parou
          <ProjectGallery media={[project.preview, ...details.media]} />
        ) : carga.estado === 'falhou' ? (
          <p role="alert" className="rounded-xl border border-line p-5 text-sm text-muted">
            {t(ui.projeto.falhou)}
          </p>
        ) : (
          <Esqueleto />
        )}
      </div>

      <div className="min-w-0 space-y-8">
        <p className="text-pretty leading-relaxed sm:text-lg">{t(details?.intro ?? project.description)}</p>
        {details?.sections.map((secao) => <Secao key={secao.title.pt} secao={secao} />)}

        <section>
          <h3 className="label text-accent">{t(ui.projetos.tecnologias)}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.stack.map((tecnologia) => (
              <li key={t(tecnologia)} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
                {t(tecnologia)}
              </li>
            ))}
          </ul>
        </section>

        {details?.note && (
          <p className="text-pretty border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-subtle">{t(details.note)}</p>
        )}

        <Codigo repo={project.repo} />
      </div>
    </div>
  )
}
