import { About } from './components/About.tsx'
import { BlackHole } from './components/BlackHole.tsx'
import { Contact } from './components/Contact.tsx'
import { Dive } from './components/Dive.tsx'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { Hero } from './components/Hero.tsx'
import { Journey } from './components/Journey.tsx'
import { Projects } from './components/Projects.tsx'
import { Skills } from './components/Skills.tsx'
import { IdiomaContexto, type Idioma } from './i18n/idioma.ts'
import { ui } from './i18n/interface.ts'

export default function App({ idioma }: { idioma: Idioma }) {
  return (
    <IdiomaContexto value={idioma}>
      <a href="#conteudo" className="skip-link">
        {ui.pularConteudo[idioma]}
      </a>
      <BlackHole />
      <Header />
      <main id="conteudo">
        <Hero />
        <About />
        <Projects />
        <Journey />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <Dive />
    </IdiomaContexto>
  )
}
