# Portfólio de Alexsandro Ferreira da Silva

Portfólio e currículo online, em português e em inglês: apresentação, projetos, trajetória, habilidades e contato, com o currículo também em PDF.

**Acesse:** [alexsandrofde.github.io/Portfolio](https://alexsandrofde.github.io/Portfolio/) · em inglês: [alexsandrofde.github.io/Portfolio/en](https://alexsandrofde.github.io/Portfolio/en/)

## Tecnologias

- **React 19** e **TypeScript**
- **Vite 8** para desenvolvimento e build
- **Tailwind CSS 4** para os estilos, com tema claro e escuro
- **Pré-renderização estática**: o HTML publicado de cada página (português, inglês e a de erro) já contém todo o conteúdo e o React apenas o hidrata, o que ajuda no carregamento e na indexação
- **Currículo em PDF** gerado no build, impresso pelo Chrome ou Edge via `puppeteer-core`
- **GitHub Actions** para o deploy automático no GitHub Pages

## Rodando localmente

Requer Node.js 22.12 ou superior.

```bash
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173/Portfolio/ (inglês em /Portfolio/en/)
npm run build     # gera o site e o currículo em PDF em dist/
npm run preview   # serve o build em http://localhost:4173/Portfolio/
npm run lint      # análise estática
```

## Onde editar o conteúdo

Todo o conteúdo fica em arquivos de dados, separados dos componentes:

| Conteúdo                                                           | Arquivo                        |
| ------------------------------------------------------------------ | ------------------------------ |
| Nome, contatos (e-mail, WhatsApp, GitHub, LinkedIn) e apresentação | `src/data/profile.ts`          |
| Currículo em PDF                                                   | `src/data/curriculo.ts`        |
| Projetos (e quais aparecem como destaque)                          | `src/data/projects.ts`         |
| Vídeos dos projetos                                                | `src/assets/projects/`         |
| Formação, experiências e atividades                                | `src/data/journey.ts`          |
| Habilidades e cursos                                               | `src/data/skills.ts`           |
| Textos fixos da interface (menu, botões etc.)                      | `src/i18n/interface.ts`        |
| Página de erro 404                                                 | `src/components/NotFound.tsx`  |
| Cores, fontes e animações                                          | `src/index.css`                |
| Título, descrição e prévia de compartilhamento                     | `index.html` e `en/index.html` |

Os projetos com `featured` aparecem como cartões em **Destaques**, na ordem desse número; os demais vão para a lista **Outros projetos**, que tem os filtros por área. Cada projeto tem um `summary` (uma frase, usada na lista) e uma `description` (o texto completo dos cartões). Um projeto sem o campo `repo` é exibido como repositório privado (com cadeado, sem link).

### Português e inglês

O site tem duas versões com o mesmo conteúdo: a principal, em português, e a em inglês, em `/en/`. Nos arquivos de dados, cada texto é um par com as duas línguas:

```ts
summary: {
  pt: 'Personalização de canecas com prévia em tempo real',
  en: 'Mug customization with a real-time preview',
},
```

Nomes próprios e tecnologias, que são iguais nos dois idiomas, podem ser um texto só (`name: 'Beka'`). O TypeScript avisa se faltar uma das línguas. No cabeçalho, o link **EN**/**PT** leva para a mesma seção na outra versão. O título, a descrição e a prévia de compartilhamento de cada versão ficam em `index.html` e `en/index.html`.

### Currículo em PDF

O site tem links para o currículo em PDF: no topo da página e em **Contato**. São dois arquivos, um por idioma, gerados a cada build a partir de `src/data/curriculo.ts`: `Curriculo-Alexsandro-Ferreira-da-Silva.pdf` e `Resume-Alexsandro-Ferreira-da-Silva.pdf`. Nome, e-mail e links vêm de `profile.ts`, e os cursos e competências comportamentais vêm de `skills.ts`. O visual fica em `src/curriculo/`.

O formato foi pensado para os sistemas de triagem de RH (ATS): uma coluna, texto selecionável, seções com nomes usuais e datas no formato MM/AAAA. Para conferir o que esses sistemas leem, extraia o texto do PDF (por exemplo, com `pdftotext`).

O PDF é impresso por um Chrome ou Edge instalado na máquina, que o build encontra sozinho. Se não encontrar, defina `CHROME_PATH` com o caminho do navegador. No deploy, o GitHub Actions usa o Chrome que já vem no runner. O PDF não existe no `npm run dev`. Para vê-lo localmente, use `npm run build` e `npm run preview`.

### Vídeos dos projetos

Um projeto pode ter um vídeo curto (campo `video` em `src/data/projects.ts`): um MP4 sem som, em 16:9, que toca em loop como um GIF. Ele só é baixado quando aparece na tela, pausa ao sair dela, tem botão de pausar e não toca sozinho para quem ativou "reduzir movimento" no sistema. Para manter o site leve, vale exportar em 1280x720, 30 fps e uns 15 segundos (H.264, CRF entre 26 e 28), junto com um quadro em WebP para o pôster.

### Página de erro

O GitHub Pages mostra o `404.html` para qualquer endereço que não existe no site. A página segue o visual do site, fica em português com o essencial também em inglês e leva de volta ao início ou à versão em inglês.

### Trocar a foto de perfil

O site usa versões otimizadas da foto (`src/assets/profile-*.webp`), geradas a partir do arquivo original em `assets/`. Para usar outra foto:

```bash
npm run images -- assets/nova-foto.png
```

Depois, faça o commit dos arquivos gerados em `src/assets/`. As imagens de prévia usadas ao compartilhar o link (`public/og.jpg` e, em inglês, `public/og-en.jpg`) são arquivos estáticos à parte.

## Deploy

O deploy é automático: a cada push na branch `main`, o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) instala as dependências, gera o site e publica a pasta `dist/` no GitHub Pages.

**Configuração necessária (uma única vez):** no repositório, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions** em **Source**. Sem isso o Pages continua publicando os arquivos da branch diretamente, e não o site gerado.

O andamento de cada publicação pode ser acompanhado na aba **Actions** do repositório, onde também é possível disparar o deploy manualmente.

## Estrutura

```
├── .github/workflows/deploy.yml   # build e deploy no GitHub Pages
├── assets/                        # fotos originais (não vão para o site)
├── public/                        # arquivos copiados como estão (favicon, prévias de compartilhamento)
├── scripts/
│   ├── curriculo.mjs              # imprime o currículo em PDF
│   ├── optimize-images.mjs        # gera as versões otimizadas da foto
│   └── prerender.mjs              # insere o HTML de cada página em dist/ e gera o PDF
├── src/
│   ├── assets/                    # imagens e vídeos otimizados usados pelo site
│   ├── components/                # seções e componentes da página
│   ├── curriculo/                 # modelo e estilo do currículo em PDF
│   ├── data/                      # conteúdo do portfólio e do currículo
│   ├── i18n/                      # idiomas e textos fixos da interface
│   ├── hooks/ e lib/              # utilitários
│   ├── index.css                  # tema e estilos globais
│   ├── main.tsx                   # entrada no navegador (português e inglês)
│   ├── main-404.tsx               # entrada da página de erro
│   └── entry-server.tsx           # entrada usada na pré-renderização
├── index.html                     # página principal (português)
├── en/index.html                  # versão em inglês
├── 404.html                       # página de erro
└── vite.config.ts
```
