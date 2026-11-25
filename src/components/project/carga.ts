import type { FeaturedProject, ProjectDetails } from '../../data/projects.ts'

/** As páginas já baixadas: a que já veio abre com o texto todo, sem esperar (nem mostrar o esqueleto). */
const baixadas = new WeakMap<FeaturedProject, ProjectDetails>()

/** Baixa a página de um projeto (o módulo dela, veja `details`, em projects.ts) e a guarda. */
export function baixarDetalhes(project: FeaturedProject): Promise<ProjectDetails> {
  return project.details().then((details) => {
    baixadas.set(project, details)
    return details
  })
}

/** A página do projeto, se ela já veio. */
export const detalhesBaixados = (project: FeaturedProject): ProjectDetails | undefined => baixadas.get(project)
