import { About } from './components/About.tsx'
import { BlackHole } from './components/BlackHole.tsx'
import { Contact } from './components/Contact.tsx'
import { Dive } from './components/Dive.tsx'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { Hero } from './components/Hero.tsx'
import { Journey } from './components/Journey.tsx'
import { LanguageToggle } from './components/LanguageToggle.tsx'
import { Projects } from './components/Projects.tsx'
import { Skills } from './components/Skills.tsx'
import { SoundToggle } from './components/SoundToggle.tsx'
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
      {/* O canto de baixo da tela: o link do outro idioma e o botão do som, juntos. No mergulho, o
          buraco negro engole o canto inteiro, e ele volta com o site (veja lib/buracoNegro/mergulho.ts).
          Logo depois do cabeçalho, para o teclado chegar a eles antes do conteúdo. */}
      <div data-flutuante="" className="flutuantes print-hidden">
        <LanguageToggle />
        <SoundToggle />
      </div>
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
