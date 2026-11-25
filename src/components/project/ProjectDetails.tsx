import { useEffect, useState } from 'react'
import { profile } from '../../data/profile.ts'
import type { FeaturedProject, ProjectDetails as Details } from '../../data/projects.ts'
import { useT, type Texto } from '../../i18n/idioma.ts'
import { ui } from '../../i18n/interface.ts'
import { botaoPrimario } from '../../lib/estilos.ts'
import { ArrowUpRight, Lock } from '../icons.tsx'
import { diagramar } from './diagramacao.ts'
import { Figura } from './ProjectFigure.tsx'
import { ProjectSection } from './ProjectSection.tsx'

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

/**
 * A abertura: a prévia do cartão (a página continua de onde ele parou) e, ao lado, a apresentação,
 * as tecnologias e o caminho para o código. Ela vem do próprio projeto, então aparece na hora.
 */
function Abertura({ project, intro }: { project: FeaturedProject; intro: Texto }) {
  const t = useT()

  return (
    <div className="grid gap-y-8 lg:grid-cols-12 lg:items-center lg:gap-x-10">
      <Figura media={project.preview} sizes="(min-width: 64rem) 600px, 92vw" loading="eager" className="lg:col-span-7" />
      <div className="min-w-0 lg:col-span-5">
        <p className="text-pretty leading-relaxed text-fg sm:text-lg">{t(intro)}</p>
        <div className="mt-8 space-y-6 border-t border-line pt-6">
          <div>
            <h3 className="label text-subtle">{t(ui.projetos.tecnologias)}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {project.stack.map((tecnologia) => (
                <li key={t(tecnologia)} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
                  {t(tecnologia)}
                </li>
              ))}
            </ul>
          </div>
          <Codigo repo={project.repo} />
        </div>
      </div>
    </div>
  )
}

/** Enquanto o módulo do projeto chega: o lugar da primeira parte, com o texto e a demonstração ao lado. */
function Esqueleto() {
  const t = useT()

  return (
    <div role="status" className="grid animate-pulse gap-y-6 lg:grid-cols-12 lg:gap-x-10">
      <span className="sr-only">{t(ui.projeto.carregando)}</span>
      <div className="space-y-3 lg:col-span-5">
        <div className="h-3 w-8 rounded bg-line" />
        <div className="h-6 w-1/2 rounded bg-line" />
        <div className="h-4 w-full rounded bg-line" />
        <div className="h-4 w-5/6 rounded bg-line" />
      </div>
      <div className="aspect-video rounded-xl bg-line lg:col-span-7" />
    </div>
  )
}

/**
 * Cada parte com o arranjo dela (veja diagramacao.ts). As que têm demonstrações ao lado do texto
 * alternam o lado, começando pela direita, já que a abertura tem a prévia à esquerda.
 */
function partes(details: Details) {
  let aoLado = 0
  return details.sections.map((secao, i) => {
    const arranjo = diagramar(secao.media ?? [])
    const inverter = arranjo.tipo === 'lado' && aoLado++ % 2 === 1
    return { secao, arranjo, inverter, numero: i + 1 }
  })
}

/**
 * A página de um projeto em destaque, numa grade de 12 colunas: a abertura, as partes (cada texto
 * com as demonstrações dele, arrumadas pela diagramação) e uma observação no fim.
 */
export function ProjectDetails({ project }: { project: FeaturedProject }) {
  const t = useT()
  const carga = useDetalhes(project)
  const details = carga.estado === 'pronto' ? carga.details : null

  return (
    <div className="space-y-20 lg:space-y-28">
      <Abertura project={project} intro={details?.intro ?? project.description} />

      {details ? (
        partes(details).map(({ secao, arranjo, inverter, numero }) => (
          <ProjectSection key={secao.title.pt} secao={secao} numero={numero} arranjo={arranjo} inverter={inverter} />
        ))
      ) : carga.estado === 'falhou' ? (
        <p role="alert" className="rounded-xl border border-line p-5 text-sm text-muted">
          {t(ui.projeto.falhou)}
        </p>
      ) : (
        <Esqueleto />
      )}

      {details?.note && (
        <p className="max-w-2xl text-pretty border-t border-line pt-8 text-sm leading-relaxed text-subtle">{t(details.note)}</p>
      )}
    </div>
  )
}
