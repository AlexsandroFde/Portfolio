import type { CSSProperties } from 'react'
import profile320 from '../assets/profile-320.webp'
import profile480 from '../assets/profile-480.webp'
import profile640 from '../assets/profile-640.webp'
import profile960 from '../assets/profile-960.webp'
import { facts, intro, profile } from '../data/profile.ts'
import { useT } from '../i18n/idioma.ts'
import { ui } from '../i18n/interface.ts'
import { botaoPrimario, botaoSecundario } from '../lib/estilos.ts'
import { ArrowDown } from './icons.tsx'
import { Reveal } from './Reveal.tsx'

/** Posição do elemento na entrada escalonada (ver `.enter` no index.css). */
const step = (i: number) => ({ '--i': i }) as CSSProperties

export function Hero() {
  const t = useT()

  return (
    <section id="topo" className="relative isolate overflow-hidden pt-28 sm:pt-36 md:pt-40">
      <div className="hero-grid" aria-hidden="true" />

      <div className="wrap grid gap-x-8 gap-y-8 md:grid-cols-12 md:items-end">
        {/* Retrato: miniatura no celular, cartão à direita a partir do tablet. */}
        <figure
          className="enter w-32 sm:w-36 md:col-span-4 md:col-start-9 md:row-start-1 md:w-auto lg:pl-6"
          style={step(1)}
        >
          <div className="crop-marks">
            <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-surface md:aspect-[4/5] md:rounded-[1.25rem]">
              <img
                src={profile640}
                srcSet={`${profile320} 320w, ${profile480} 480w, ${profile640} 640w, ${profile960} 960w`}
                sizes="(min-width: 64rem) 21rem, (min-width: 48rem) 31vw, 9rem"
                width={960}
                height={1280}
                alt={`${t(ui.hero.retrato)} ${profile.name}`}
                fetchPriority="high"
                decoding="async"
                className="size-full origin-[50%_40%] scale-[1.12] object-cover object-[50%_30%]"
              />
            </div>
          </div>
          <figcaption className="label mt-4 hidden flex-wrap justify-between gap-x-4 gap-y-1 whitespace-nowrap text-subtle md:flex">
            <span>{t(profile.location)}</span>
            <span>{t(profile.coordinates)}</span>
          </figcaption>
        </figure>

        <div className="md:col-span-8 md:col-start-1 md:row-start-1">
          <p className="enter label flex items-center gap-2.5 text-muted" style={step(0)}>
            <span className="status-dot" aria-hidden="true" />
            {t(profile.status)}
          </p>

          <h1 className="mt-6 text-[clamp(2.5rem,11.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.045em] md:text-[clamp(3.25rem,7.2vw,5.75rem)]">
            <span className="enter block" style={step(1)}>
              {profile.firstName}
            </span>{' '}
            <span className="enter block text-faint" style={step(2)}>
              {profile.lastName}
            </span>
          </h1>

          <p
            className="enter mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted sm:text-xl"
            style={step(3)}
          >
            <span className="text-fg">{t(profile.role)}.</span> {t(intro)}
          </p>

          <div className="enter print-hidden mt-10 flex flex-wrap gap-3" style={step(4)}>
            <a href="#projetos" className={botaoPrimario}>
              {t(ui.hero.verProjetos)}
              <ArrowDown className="size-4" />
            </a>
            <a href="#contato" className={botaoSecundario}>
              {t(ui.hero.contato)}
            </a>
          </div>
        </div>
      </div>

      <Reveal as="dl" className="wrap mt-16 grid grid-cols-2 md:mt-24 md:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label.pt} className="border-t border-line py-5 pr-6">
            <dt className="label text-subtle">{t(fact.label)}</dt>
            <dd className="mt-2 text-sm leading-snug">{t(fact.value)}</dd>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
