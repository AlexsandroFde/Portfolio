import type { ReactNode } from 'react'
import { Reveal } from './Reveal.tsx'

interface SectionProps {
  id: string
  /** Número exibido acima do título, ex.: "01". */
  index: string
  title: string
  children: ReactNode
  /** Conteúdo que ocupa a largura toda, abaixo do título e do conteúdo principal. */
  after?: ReactNode
}

/** Seção padrão: título fixo à esquerda, conteúdo à direita. */
export function Section({ id, index, title, children, after }: SectionProps) {
  const headingId = `${id}-titulo`

  return (
    <section id={id} aria-labelledby={headingId} className="border-t border-line">
      <div className="wrap grid gap-x-8 gap-y-10 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-3">
          <Reveal as="header" className="md:sticky md:top-28">
            <p className="label text-accent" aria-hidden="true">
              {index}
            </p>
            <h2
              id={headingId}
              className="mt-3 text-3xl font-medium tracking-[-0.035em] md:text-[2rem]"
            >
              {title}
            </h2>
          </Reveal>
        </div>
        <div className="min-w-0 md:col-span-9">{children}</div>
        {after && <div className="min-w-0 md:col-span-12">{after}</div>}
      </div>
    </section>
  )
}
