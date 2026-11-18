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

Ele fica no canto de cima à direita, logo abaixo do cabeçalho, com cerca de um terço à vista, como algo muito distante (a malha fica numa camada intermediária). Só o conteúdo que sobe até uma faixa estreita logo abaixo do cabeçalho é absorvido: cada linha dele que entra na faixa é puxada até o buraco negro, devagar no começo e cada vez mais rápido, ficando mais estreita e esmaecendo na mesma medida (inteira na borda da faixa, quase invisível perto do centro), e some de vez ao cruzar a borda da sombra: nada aparece dentro dela. As linhas de cima vão na frente e as de baixo ainda estão presas à página, então o conteúdo se alonga numa tira contínua que sai da página e entra no buraco negro (a "espaguetificação"). Um bloco alto, como um cartão de projeto, é engolido parte por parte: só o trecho dele que já está na faixa é puxado, e o resto continua no lugar até chegar a sua vez. Quanto cada bloco já foi absorvido depende só de onde ele está na tela, e o desenho de cada posição da rolagem é calculado de antemão: rolando devagar ou rápido, com a roda do mouse, o botão do meio, a barra ou o teclado, cada posição da página mostra sempre a mesma imagem, como um filme que a rolagem avança e volta. Com a página parada, o que estava no meio do caminho continua ali, e rolando para cima o conteúdo é cuspido de volta pelo mesmo caminho. Tudo muda de forma contínua com a rolagem. O disco reage ao sentido dela, e não à velocidade: enquanto a página desce ele esquenta e gira um pouco mais rápido, enquanto sobe saem os jatos, e ele acompanha com um pequeno atraso, sem pulsar a cada tranco da roda. Os blocos são os que já têm animação de entrada (`Reveal` e `.enter`); a lógica fica em `src/lib/buracoNegro/absorcao.ts`.

Como uma transformação CSS deforma um elemento inteiro de um jeito só, o trecho de cada bloco que está na faixa é desenhado por cópias dele, uma para cada fatia de uns 10 px (sempre um número inteiro de pixels da tela), cada uma recortada na sua fatia e deformada no seu trapézio; as bordas de fatias vizinhas coincidem, e a tira sai contínua. As cópias ficam numa camada fixa no alto da tela, sem foco, clique ou leitor de tela, por cima de uma cortina: um canvas que cobre a faixa com o fundo da página, o buraco negro e a malha (copiados do canvas do fundo a cada desenho). O bloco original não sai do lugar nem muda, nada nele depende da rolagem: ele só passa por trás da cortina, que o corta exatamente na beira da faixa. Quem move as cópias é o navegador, e não o JavaScript: cada uma tem uma animação presa à rolagem (`ScrollTimeline`, em `src/lib/buracoNegro/rolagem.ts`), com um quadro-chave para cada pixel da tela que a página rola enquanto a fatia atravessa a faixa, e cada quadro vale até o próximo, sem interpolação (entre duas perspectivas o navegador interpola mal, e o trapézio saía torto). A rolagem corre fora do JavaScript, que chega a ficar um quadro ou mais para trás dela; as animações correm junto com ela, na mesma etapa, e a tira não se descola do original na beira da cortina, por mais rápida que seja a rolagem. O esmaecimento é uma máscara da camada, que vai apagando o conteúdo conforme a altura, já que a altura de cada linha na faixa diz o quanto ela já foi puxada; abaixo da faixa a camada ainda desce três fatias, sem nada à vista, onde as cópias esperam a vez já desenhadas. As linhas soltas da página (a borda de cima das seções e das listas) também são absorvidas, como blocos de uma fatia só, e os títulos fixos das seções, que param dentro da faixa, ficam por cima da cortina.

Ao JavaScript resta preparar as cópias antes de a página chegar a elas e fazê-las acompanhar o original em tudo o que muda sem rolagem, para nada se partir entre ele e a tira: nos vídeos, cada cópia desenha numa tela, por cima dela, a parte do quadro atual que cai na sua fatia (com os cantos arredondados do cartão), a cada quadro novo, e todas ficam sempre no mesmo quadro que o original; o que fica na frente do vídeo, como o botão de pausa, vai em cópias à parte, por cima das telas; o mouse em cima muda as cópias junto, as animações andam no mesmo ritmo e, quando o React redesenha algo dentro do bloco (o ícone de um vídeo que pausou, por exemplo), as cópias são refeitas na hora (só as da frente do vídeo, se a mudança foi só ali). Um bloco com o foco do teclado passa para a frente da cortina e fica inteiro no lugar até o foco sair dele. Onde o navegador ainda não tem `ScrollTimeline`, o JavaScript leva as animações à rolagem a cada quadro: o desenho é o mesmo, mas rolando rápido ele pode chegar um quadro atrasado.

Como o alto da tela passa a ser do buraco negro, os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o topo: o JavaScript calcula essa altura e a passa ao `scroll-padding-top` do `index.css` (a variável `--topo-livre`). Sem o efeito, vale a distância padrão.

O gás do disco gira com a velocidade de cada órbita (mais rápido perto do centro) sem que o desenho se enrole com o tempo: cada anel da textura gira inteiro e desliza sobre os vizinhos, e a rotação fecha um ciclo exato a cada três horas, mais ou menos.

Para ajustar: o quanto do buraco negro fica à vista é a constante `CANTO`, a altura da faixa de absorção é a função `faixa` e o quanto da página fica preparado de antemão são `ANTECEDENCIA`, `FOLGA` e `AQUECER`, todas em `src/lib/buracoNegro/index.ts`.

Para não pesar: o código do efeito só é baixado depois que a página carrega, a animação pausa com a aba escondida e as cópias ficam prontas antes da hora, a maior parte com a página parada (rolando, cada quadro gasta no máximo meio milissegundo com as que ainda não vão aparecer). Os blocos que a rolagem está para trazer já têm guardadas, escondidas, todas as cópias que vão usar, e quando a página chega perto só falta prendê-las à rolagem; os que ela deixou para trás guardam poucas, e os que ficaram longe as perdem. As cópias guardadas saem do desenho (`content-visibility: hidden`), as de cada bloco ficam num grupo só delas na camada (assim o navegador não percorre todas a cada quadro), e as fatias de um bloco que atravessam a faixa com o puxão inteiro dividem os mesmos quadros-chave, calculados uma vez. As telas dos vídeos ficam fora do recorte de cada cópia (um recorte numa cópia deformada faria a placa de vídeo desenhar à parte, a cada quadro, tudo o que tem camada própria dentro dele, e com dezenas de cópias a página travava ao rolar devagar pelos projetos) e só recebem os quadros do vídeo quando estão perto de aparecer. O que sobra de custo: perto dos projetos, as cópias somam de alguns milhares a pouco mais de dez mil elementos à página e, rolando rápido, o JavaScript fica mais ocupado (o buraco negro e os vídeos podem andar aos trancos; a rolagem e a tira, não), e rolando rápido demais o navegador pode ainda não ter desenhado alguma cópia, deixando um trecho da faixa vazio por um instante. A resolução cai sozinha em aparelhos que não dão conta, e quem ativou "reduzir movimento" no sistema (ou tem um aparelho lento demais) vê o buraco negro parado no alto da página, sem absorção. Para decidir que o aparelho não dá conta, conta o quadro típico de cada segundo (a mediana), e não a média: engasgos isolados, como os de um ou dois segundos que o Windows às vezes tem ao reorganizar a composição da tela quando um vídeo começa a tocar, não desligam o efeito. Sem WebGL 2, fica a malha em CSS de antes.

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
