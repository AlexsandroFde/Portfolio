import type { CSSProperties } from 'react'
import { profile } from '../data/profile.ts'
import { caminhos } from '../i18n/idioma.ts'
import { botaoPrimario, botaoSecundario } from '../lib/estilos.ts'
import { Footer } from './Footer.tsx'
import { ArrowLeft, Monogram } from './icons.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

/** Posição do elemento na entrada escalonada (ver `.enter` no index.css). */
const step = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * Página de erro 404. O GitHub Pages a mostra para qualquer endereço inexistente, então ela não
 * sabe em que idioma a pessoa estava: o texto é em português, com o essencial também em inglês.
 * Segue o desenho da apresentação, com uma moldura vazia no lugar do retrato.
 */
export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      <header className="wrap flex h-16 flex-none items-center justify-between gap-4">
        <a
          href={caminhos.pt}
          className="flex items-center gap-3 text-[0.9375rem] font-medium tracking-tight"
        >
          <Monogram className="size-6" />
          <span>{profile.shortName}</span>
        </a>
        <ThemeToggle />
      </header>

      <main id="conteudo" className="relative isolate flex flex-1 items-center overflow-hidden">
        <div className="hero-grid" aria-hidden="true" />

        <div className="wrap grid gap-x-8 gap-y-10 py-16 md:grid-cols-12 md:items-end md:py-24">
          <div className="md:col-span-8">
            <p className="enter label text-accent" style={step(0)}>
              Erro 404
            </p>

            <h1 className="mt-6 text-[clamp(2.5rem,11.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.045em] md:text-[clamp(3.25rem,7.2vw,5.75rem)]">
              <span className="enter block" style={step(1)}>
                Página não
              </span>{' '}
              <span className="enter block text-faint" style={step(2)}>
                encontrada
              </span>
            </h1>

            <div className="enter mt-8 max-w-xl" style={step(3)}>
              <p className="text-pretty text-lg leading-relaxed text-muted sm:text-xl">
                O endereço que você abriu não existe ou mudou de lugar. Confira o link ou volte ao
                início.
              </p>
              <p lang="en" className="mt-3 text-pretty leading-relaxed text-subtle">
                Page not found: this address doesn't exist or has moved.
              </p>
            </div>

            <div className="enter mt-10 flex flex-wrap gap-3" style={step(4)}>
              <a href={caminhos.pt} className={botaoPrimario}>
                <ArrowLeft className="size-4" />
                Voltar ao início
              </a>
              <a href={caminhos.en} hrefLang="en" lang="en" className={botaoSecundario}>
                English version
              </a>
            </div>
          </div>

          {/* A moldura do retrato, vazia: só a partir do tablet, como um detalhe. */}
          <figure
            aria-hidden="true"
            className="enter hidden md:col-span-4 md:col-start-9 md:row-start-1 md:block lg:pl-6"
            style={step(2)}
          >
            <div className="crop-marks">
              <div className="grid aspect-[4/5] place-items-center rounded-[1.25rem] border border-dashed border-line-strong bg-surface/40">
                <span className="font-mono text-[clamp(3rem,7vw,5.5rem)] font-medium leading-none tracking-[-0.06em] text-faint">
                  404
                </span>
              </div>
            </div>
            <figcaption className="label mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 whitespace-nowrap text-subtle">
              <span>Endereço desconhecido</span>
              <span>0° · 0°</span>
            </figcaption>
          </figure>
        </div>
      </main>

      <Footer topo={false} />
    </div>
  )
}
