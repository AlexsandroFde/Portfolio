# Portfólio de Alexsandro Ferreira da Silva

Portfólio e currículo online, em português e em inglês: apresentação, projetos, trajetória, habilidades e contato, com o currículo também em PDF.

**Acesse:** [alexsandrofde.github.io/Portfolio](https://alexsandrofde.github.io/Portfolio/) · em inglês: [alexsandrofde.github.io/Portfolio/en](https://alexsandrofde.github.io/Portfolio/en/)

## Tecnologias

- **React 19** e **TypeScript**
- **Vite 8** para desenvolvimento e build
- **Tailwind CSS 4** para os estilos, com tema claro e escuro
- **WebGL 2** para o buraco negro animado no fundo da página (shader próprio, sem bibliotecas)
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
| Buraco negro do fundo da página                                    | `src/lib/buracoNegro/`         |
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

### Buraco negro do fundo

No fundo da página há um buraco negro animado, desenhado em WebGL. O shader (`src/lib/buracoNegro/buracoNegro.frag`) traça os raios de luz na trajetória curva em volta do buraco negro: daí a sombra, o anel de luz e o disco de gás, que aparece dobrado por cima da sombra e passa na frente da metade de baixo dela. A malha quadriculada da apresentação também é desenhada por ele, curvada pela gravidade. No tema escuro o disco brilha na cor de destaque; no claro vira uma gravura em nanquim.

Ele fica no canto de cima à direita, logo abaixo do cabeçalho, com cerca de um terço à vista, como algo muito distante (a malha fica numa camada intermediária). Só o conteúdo que sobe até uma faixa estreita logo abaixo do cabeçalho é absorvido: a página é tratada como a continuação do plano do disco, e a parte de cima de cada bloco é puxada primeiro na direção dele (por isso o bloco se alonga, a "espaguetificação"). O que está perto do disco chega a ele; o que está longe anda só um trecho e se desfaz em filamentos de matéria, que o shader desenha entrando no disco, esquentando o gás e girando com ele. Um bloco alto, como um cartão de projeto, sobe inteiro: só a parte dele que entra na faixa se desfaz, e o resto só é puxado quando a borda de baixo chega perto, para o restante da página continuar legível. Quanto cada bloco já foi absorvido depende só de onde ele está na tela: rolando devagar o efeito é o mesmo, com a página parada o que estava no meio do caminho continua ali, e rolando para cima o conteúdo é cuspido de volta pelo mesmo caminho. Tudo muda de forma contínua com a rolagem, e o brilho do disco e os filamentos acompanham a velocidade com um pequeno atraso: assim a absorção corre fluida mesmo com a roda do mouse, que rola aos trancos. Os blocos são os que já têm animação de entrada (`Reveal` e `.enter`); a lógica fica em `src/lib/buracoNegro/absorcao.ts`.

Como o alto da tela passa a ser do buraco negro, os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o topo: o JavaScript calcula essa altura e a passa ao `scroll-padding-top` do `index.css` (a variável `--topo-livre`). Sem o efeito, vale a distância padrão.

O gás do disco gira com a velocidade de cada órbita (mais rápido perto do centro) sem que o desenho se enrole com o tempo: cada anel da textura gira inteiro e desliza sobre os vizinhos, e a rotação fecha um ciclo exato a cada três horas, mais ou menos.

Para ajustar: o quanto do buraco negro fica à vista é a constante `CANTO` e a altura da faixa de absorção é a função `faixa`, ambas em `src/lib/buracoNegro/index.ts`.

Para não pesar: o código do efeito só é baixado depois que a página carrega, a animação pausa com a aba escondida, a resolução cai sozinha em aparelhos que não dão conta, e quem ativou "reduzir movimento" no sistema (ou tem um aparelho lento demais) vê o buraco negro parado no alto da página, sem absorção. Sem WebGL 2, fica a malha em CSS de antes.

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
│   ├── lib/buracoNegro/           # buraco negro do fundo (WebGL)
│   ├── index.css                  # tema e estilos globais
│   ├── main.tsx                   # entrada no navegador (português e inglês)
│   ├── main-404.tsx               # entrada da página de erro
│   └── entry-server.tsx           # entrada usada na pré-renderização
├── index.html                     # página principal (português)
├── en/index.html                  # versão em inglês
├── 404.html                       # página de erro
└── vite.config.ts
```
