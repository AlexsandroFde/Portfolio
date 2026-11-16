import { Fragment, type ReactNode } from 'react'
import geistMono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?inline'
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?inline'
import { curriculo } from '../data/curriculo.ts'
import { profile } from '../data/profile.ts'
import { courses, skillGroups } from '../data/skills.ts'
import type { Idioma, Traduzivel } from '../i18n/idioma.ts'
import estilos from './curriculo.css?raw'

// Documento do currículo, renderizado só no build e impresso em PDF (scripts/curriculo.mjs).
// Não faz parte do site: nada aqui vai para o JavaScript do navegador.

// Endereço público do site (o mesmo da prévia de compartilhamento), para o link do portfólio.
const site = String(import.meta.env.VITE_SITE_URL || 'https://alexsandrofde.github.io/Portfolio').replace(/\/+$/, '')

// As fontes vão embutidas no HTML, para o PDF não depender de arquivos externos.
const fontes = `
@font-face { font-family: 'Geist'; font-weight: 100 900; src: url(${geist}) format('woff2'); }
@font-face { font-family: 'Geist Mono'; font-weight: 100 900; src: url(${geistMono}) format('woff2'); }
`

/** Endereço como aparece no papel, sem "https://" nem "www.". */
const semProtocolo = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')

/** Itens de uma linha separados por " | " (o separador fica mais claro, mas é texto comum). */
function Linha({ itens }: { itens: ReactNode[] }) {
  return itens.map((item, index) => (
    <Fragment key={index}>
      {index > 0 && <span className="sep"> | </span>}
      {item}
    </Fragment>
  ))
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2>{titulo}</h2>
      {children}
    </section>
  )
}

export function Curriculo({ idioma }: { idioma: Idioma }) {
  const t = (texto: Traduzivel) => (typeof texto === 'string' ? texto : texto[idioma])
  const secoes = curriculo.secoes
  const portfolio = idioma === 'en' ? `${site}/en/` : `${site}/`

  // "Trabalho em equipe, comunicação eficaz ... e aprendizagem rápida."
  const interpessoais = (skillGroups.find((grupo) => grupo.id === 'interpessoais')?.items ?? []).map(
    (item, index) => {
      const texto = t(item)
      return index === 0 ? texto : texto.charAt(0).toLowerCase() + texto.slice(1)
    },
  )
  const listaInterpessoais = new Intl.ListFormat(idioma === 'en' ? 'en' : 'pt-BR', {
    type: 'conjunction',
  }).format(interpessoais)

  return (
    <html lang={idioma === 'en' ? 'en' : 'pt-BR'}>
      <head>
        <meta charSet="utf-8" />
        <title>{`${profile.name} | ${t(curriculo.titulo)}`}</title>
        <meta name="author" content={profile.name} />
        <style dangerouslySetInnerHTML={{ __html: fontes + estilos }} />
      </head>
      <body>
        <header>
          <h1>{profile.name}</h1>
          <p className="cargo">{t(profile.role)}</p>
          <p className="contatos">
            <Linha
              itens={[
                t(curriculo.local),
                <a key="telefone" href={curriculo.telefoneLink}>
                  {t(curriculo.telefone)}
                </a>,
                <a key="email" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>,
              ]}
            />
          </p>
          <p className="contatos">
            <Linha
              itens={[profile.linkedin.href, profile.github.href].map((url) => (
                <a key={url} href={url}>
                  {semProtocolo(url)}
                </a>
              ))}
            />
          </p>
          <p className="contatos">
            {t(curriculo.rotuloPortfolio)}: <a href={portfolio}>{semProtocolo(portfolio)}</a>
          </p>
        </header>

        <Secao titulo={t(secoes.resumo)}>
          <p>{t(curriculo.resumo)}</p>
        </Secao>

        <Secao titulo={t(secoes.experiencia)}>
          {curriculo.experiencia.map((cargo) => (
            <div className="item" key={cargo.titulo.pt}>
              <h3>{t(cargo.titulo)}</h3>
              <p className="meta">
                <Linha
                  itens={[t(cargo.empresa), cargo.local && t(cargo.local), t(cargo.periodo)].filter(Boolean)}
                />
              </p>
              <ul>
                {cargo.itens.map((item) => (
                  <li key={item.pt}>{t(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </Secao>

        <Secao titulo={t(secoes.formacao)}>
          {curriculo.formacao.map((formacao) => (
            <div className="item" key={formacao.curso.pt}>
              <h3>{t(formacao.curso)}</h3>
              <p className="meta">
                {t(formacao.instituicao)}
                <br />
                {t(formacao.periodo)}
              </p>
              <p className="detalhes">{t(formacao.detalhes)}</p>
            </div>
          ))}
        </Secao>

        <Secao titulo={t(secoes.competencias)}>
          <ul className="linhas">
            {curriculo.competencias.map((grupo) => (
              <li key={grupo.grupo.pt}>
                <strong>{t(grupo.grupo)}:</strong> {t(grupo.itens)}
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo={t(secoes.idiomas)}>
          <ul className="linhas">
            {curriculo.idiomas.map((item) => (
              <li key={item.idioma.pt}>
                <strong>{t(item.idioma)}:</strong> {t(item.nivel)}
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo={t(secoes.projetos)}>
          <ul>
            {curriculo.projetos.map((projeto) => (
              <li key={t(projeto.nome)}>
                <strong>{t(projeto.nome)}</strong> ({t(projeto.stack)} | {projeto.ano}): {t(projeto.descricao)}
                {projeto.repo && (
                  <>
                    {' '}
                    <a href={projeto.repo}>{semProtocolo(projeto.repo)}</a>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p>
            {t(curriculo.outrosProjetos)} <a href={profile.github.href}>{semProtocolo(profile.github.href)}</a>.
          </p>
        </Secao>

        <Secao titulo={t(secoes.eventos)}>
          <ul>
            {curriculo.eventos.map((evento) => (
              <li key={evento.titulo.pt}>
                <strong>{t(evento.titulo)}</strong> ({evento.data}): {t(evento.descricao)}
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo={t(secoes.cursos)}>
          <ul>
            {courses.map((curso) => (
              <li key={curso.pt}>{t(curso)}</li>
            ))}
          </ul>
        </Secao>

        <Secao titulo={t(secoes.comportamentais)}>
          <p>{listaInterpessoais}.</p>
        </Secao>
      </body>
    </html>
  )
}
