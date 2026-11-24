<div align="center">

# Portfólio de Alexsandro Ferreira da Silva

Site pessoal e currículo online, em português e em inglês,<br>
com um buraco negro em WebGL que engole o conteúdo enquanto a página rola.

<br>

[**Ver o site**](https://alexsandrofde.github.io/Portfolio/) &nbsp;·&nbsp;
[English version](https://alexsandrofde.github.io/Portfolio/en/) &nbsp;·&nbsp;
[Currículo em PDF](https://alexsandrofde.github.io/Portfolio/Curriculo-Alexsandro-Ferreira-da-Silva.pdf) &nbsp;·&nbsp;
[LinkedIn](https://www.linkedin.com/in/alexsandro-ferreira-da-silva-6914b6317)

<br>

[![Deploy](https://img.shields.io/github/actions/workflow/status/AlexsandroFde/Portfolio/deploy.yml?branch=main&style=flat-square&label=deploy&logo=githubactions&logoColor=7cb8dd&labelColor=0b0b0c)](https://github.com/AlexsandroFde/Portfolio/actions/workflows/deploy.yml)
![React 19](https://img.shields.io/badge/React-19-2d5473?style=flat-square&logo=react&logoColor=7cb8dd&labelColor=0b0b0c)
![TypeScript 7](https://img.shields.io/badge/TypeScript-7-2d5473?style=flat-square&logo=typescript&logoColor=7cb8dd&labelColor=0b0b0c)
![Vite 8](https://img.shields.io/badge/Vite-8-2d5473?style=flat-square&logo=vite&logoColor=7cb8dd&labelColor=0b0b0c)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-2d5473?style=flat-square&logo=tailwindcss&logoColor=7cb8dd&labelColor=0b0b0c)
![WebGL 2](https://img.shields.io/badge/WebGL-2-2d5473?style=flat-square&logo=webgl&logoColor=7cb8dd&labelColor=0b0b0c)

<br><br>

<a href="https://alexsandrofde.github.io/Portfolio/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/readme/topo-escuro.webp">
    <img src=".github/readme/topo-claro.webp" alt="O topo do portfólio: nome, apresentação, foto e o buraco negro no canto de cima à direita" width="100%">
  </picture>
</a>

<br><br>

[Sobre](#sobre) &nbsp;·&nbsp;
[Destaques](#destaques) &nbsp;·&nbsp;
[Tecnologias](#tecnologias) &nbsp;·&nbsp;
[Como rodar](#como-rodar) &nbsp;·&nbsp;
[Conteúdo](#onde-editar-o-conteúdo) &nbsp;·&nbsp;
[O buraco negro](#o-buraco-negro) &nbsp;·&nbsp;
[Desempenho](#desempenho) &nbsp;·&nbsp;
[Deploy](#deploy) &nbsp;·&nbsp;
[Estrutura](#estrutura-do-projeto)

</div>

<br>

## Sobre

Este repositório guarda o código do meu portfólio: o site onde apresento quem sou, os projetos que construí, minha trajetória e as tecnologias com que trabalho, em português e em inglês, com o currículo também em PDF.

O que dá identidade ao site é o fundo. No lugar de uma imagem parada, há um buraco negro desenhado em tempo real com WebGL, com shaders próprios e sem bibliotecas. Conforme a página rola, ele vai engolindo o conteúdo que sobe até ele; depois do rodapé, a rolagem continua e você cai dentro dele, até o topo do site reaparecer do outro lado. Cada parte foi pensada para o efeito correr liso também no celular e para respeitar quem prefere menos movimento.

## Destaques

- **Luz curvada pela gravidade.** O caminho da luz em volta do buraco negro segue a trajetória curva da relatividade geral (Schwarzschild), traçada uma vez em shaders próprios.
- **O conteúdo cai no buraco negro.** Cada bloco que sobe até o alto da tela é puxado para dentro dele e se estica numa tira contínua, a espaguetificação. Rolando para cima, ele volta pelo mesmo caminho.
- **Um mergulho depois do rodapé.** A página não acaba no fim: você cai no buraco negro, e o topo do site chega do outro lado, por uma janela redonda.
- **O cursor tem gravidade.** O mouse é uma pequena massa que curva a malha do fundo em volta dele, com a mesma lente do buraco negro.
- **Um clique faz ondas.** Cada clique, ou toque, solta uma onda gravitacional que corre pela malha, esticando e apertando o espaço por onde passa.
- **Uma música que cresce com a página.** Para quem liga o som, um coro sintetizado na hora, sem arquivos, começa só com as vozes, longe e escuro, e ganha um grave fundo, um descante e um pulso até o fim do conteúdo; no mergulho, tudo desce de tom e fica mais lento, cada clique soa como uma onda gravitacional de verdade, numa nota do acorde, e o horizonte cala tudo.
- **Fluido mesmo com a página ocupada.** O buraco negro é desenhado num Web Worker, e as fatias da absorção são movidas pelo próprio navegador, junto com a rolagem.
- **Bilíngue de ponta a ponta.** Português e inglês com o mesmo conteúdo, o TypeScript cobrando as duas línguas em cada texto e o HTML de cada versão pré-renderizado no build.
- **Currículo pronto para ATS.** O PDF é gerado a cada build a partir dos mesmos dados do site, numa coluna e com texto selecionável.
- **Cuidado com quem visita.** Com "reduzir movimento" ligado ou num aparelho lento, o buraco negro fica parado no alto da página; com economia de dados, os vídeos ficam no pôster até um toque.

## Tecnologias

| Camada    | Ferramentas                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Interface | React 19 e TypeScript 7                                                                              |
| Build     | Vite 8, com pré-renderização estática de cada página                                                 |
| Estilo    | Tailwind CSS 4, tema claro e escuro, fontes Geist e Geist Mono                                       |
| Gráficos  | WebGL 2 com shaders GLSL próprios, desenhado num Web Worker com `OffscreenCanvas`                    |
| Animação  | Animações presas à rolagem (`ViewTimeline` e `ScrollTimeline`) e View Transitions entre as páginas |
| Som       | Web Audio API, com tudo sintetizado na hora, sem arquivos de áudio nem bibliotecas                  |
| Currículo | PDF impresso pelo Chrome ou Edge com `puppeteer-core`                                                |
| Qualidade | Oxlint e um script próprio que mede a fluidez das animações                                          |
| Deploy    | GitHub Actions publicando no GitHub Pages                                                            |

O HTML publicado de cada página (português, inglês e a de erro) já contém todo o conteúdo, e o React apenas o hidrata. Isso ajuda no carregamento e na indexação, e o conteúdo continua legível mesmo sem JavaScript.

## Como rodar

Você vai precisar do **Node.js 22.12** ou mais recente. Para gerar o currículo em PDF, o build também usa um **Chrome** ou **Edge** instalado na máquina.

```bash
git clone https://github.com/AlexsandroFde/Portfolio.git
cd Portfolio
npm install
npm run dev
```

O site abre em `http://localhost:5173/Portfolio/`, e a versão em inglês em `http://localhost:5173/Portfolio/en/`.

| Comando                    | O que faz                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`              | Sobe o servidor de desenvolvimento                                       |
| `npm run build`            | Gera o site e o currículo em PDF em `dist/`                              |
| `npm run preview`          | Serve o build em `http://localhost:4173/Portfolio/`                      |
| `npm run lint`             | Roda a análise estática (Oxlint)                                         |
| `npm run medir`            | Mede a fluidez das animações no build ([como funciona](#medindo-a-fluidez)) |
| `npm run images -- <foto>` | Gera as versões otimizadas da foto de perfil                             |

## Onde editar o conteúdo

Todo o conteúdo fica em arquivos de dados, separados dos componentes. Para atualizar o site, quase sempre basta mexer em `src/data/`.

| Conteúdo                                                           | Arquivo                        |
| ------------------------------------------------------------------ | ------------------------------ |
| Nome, contatos (e-mail, WhatsApp, GitHub, LinkedIn) e apresentação | `src/data/profile.ts`          |
| Currículo em PDF                                                   | `src/data/curriculo.ts`        |
| Projetos (e quais aparecem como destaque)                          | `src/data/projects.ts`         |
| Vídeos dos projetos                                                | `src/assets/projects/`         |
| Formação, experiências e atividades                                | `src/data/journey.ts`          |
| Habilidades e cursos                                               | `src/data/skills.ts`           |
| Textos fixos da interface (menu, botões etc.)                      | `src/i18n/interface.ts`        |
| Seções do menu (a que o link do outro idioma leva junto)           | `src/data/secoes.ts`           |
| Página de erro 404                                                 | `src/components/NotFound.tsx`  |
| Cores, fontes e animações                                          | `src/index.css`                |
| Buraco negro do fundo da página                                    | `src/lib/buracoNegro/`         |
| Efeitos sonoros                                                    | `src/lib/som/`                 |
| Título, descrição e prévia de compartilhamento                     | `index.html` e `en/index.html` |

### Projetos

- Os projetos com `featured` aparecem como cartões em **Destaques**, na ordem desse número. Os demais vão para a lista **Outros projetos**, que tem filtros por área.
- Cada projeto tem um `summary`, uma frase usada na lista, e uma `description`, o texto completo dos cartões.
- Um projeto sem o campo `repo` aparece como repositório privado, com cadeado e sem link.

### Vídeos dos projetos

Um projeto pode ter um vídeo curto (campo `video`): um MP4 sem som, em 16:9, que toca em loop como um GIF. Para não pesar, ele só é baixado quando aparece na tela, pausa ao sair dela e tem botão de pausar.

O vídeo também não toca sozinho para quem ativou "reduzir movimento" no sistema, nem para quem pede economia de dados ao navegador (o modo econômico dele ou do sistema). Nesses casos ele fica no pôster até um toque no botão, e percorrer os projetos deixa de baixar os uns 4 MB dos vídeos.

> [!TIP]
> Para manter o site leve, exporte os vídeos em 1280x720, 30 fps e uns 15 segundos (H.264, CRF entre 26 e 28), junto com um quadro em WebP para o pôster.

### Português e inglês

O site tem duas versões com o mesmo conteúdo: a principal, em português, e a em inglês, em `/en/`. Nos arquivos de dados, cada texto é um par com as duas línguas:

```ts
summary: {
  pt: 'Personalização de canecas com prévia em tempo real',
  en: 'Mug customization with a real-time preview',
},
```

Nomes próprios e tecnologias, que são iguais nos dois idiomas, podem ser um texto só (`name: 'Beka'`), e o TypeScript avisa se faltar uma das línguas. O título, a descrição e a prévia de compartilhamento de cada versão ficam em `index.html` e `en/index.html`.

No canto de baixo da tela, ao lado do botão do som, o link **EN**/**PT** leva para a mesma seção na outra versão. A troca entre as versões (e a volta da página de erro para o início) usa a transição de página do navegador: a página de antes some enquanto a nova aparece, em 0,25 s, em vez de um corte seco para uma página ainda vazia. Com o movimento reduzido, a troca é direta.

> [!NOTE]
> O pedido da transição fica num `<style>` dentro de cada HTML (`index.html`, `en/index.html` e `404.html`), e não no CSS. Com ele só no arquivo CSS, o Chrome pulava a transição sempre que o CSS ou o JavaScript da página nova demorava um pouco a chegar (com 100 ms de atraso, em todas as trocas medidas). As animações dela ficam no `index.css`, separadas das da troca de tema pelo tipo da transição.

### Currículo em PDF

O site tem links para o currículo no topo da página e em **Contato**. São dois arquivos, um por idioma, gerados a cada build a partir de `src/data/curriculo.ts`:

- `Curriculo-Alexsandro-Ferreira-da-Silva.pdf`, em português;
- `Resume-Alexsandro-Ferreira-da-Silva.pdf`, em inglês.

Nome, e-mail e links vêm de `profile.ts`, e os cursos e as competências comportamentais vêm de `skills.ts`. O visual fica em `src/curriculo/`.

O formato foi pensado para os sistemas de triagem de RH (ATS): uma coluna, texto selecionável, seções com nomes usuais e datas no formato MM/AAAA. Para conferir o que esses sistemas leem, extraia o texto do PDF (com `pdftotext`, por exemplo).

> [!NOTE]
> O PDF é impresso por um Chrome ou Edge instalado na máquina, que o build encontra sozinho. Se ele não encontrar, defina `CHROME_PATH` com o caminho do navegador. No deploy, o GitHub Actions usa o Chrome que já vem no runner. O PDF não existe no `npm run dev`: para vê-lo localmente, use `npm run build` e `npm run preview`.

### Foto de perfil

O site usa versões otimizadas da foto (`src/assets/profile-*.webp`), geradas a partir do arquivo original em `assets/`. Para trocar a foto:

```bash
npm run images -- assets/nova-foto.png
```

Depois, faça o commit dos arquivos gerados em `src/assets/`. As imagens de prévia usadas ao compartilhar o link (`public/og.jpg` e, em inglês, `public/og-en.jpg`) são arquivos à parte.

### Página de erro

O GitHub Pages mostra o `404.html` para qualquer endereço que não existe no site. A página segue o visual do site, fica em português com o essencial também em inglês e leva de volta ao início ou à versão em inglês.

## O buraco negro

O fundo do site é um buraco negro desenhado em WebGL 2, com shaders próprios e sem bibliotecas. Ele acompanha a visita inteira:

1. **No topo**, fica no canto de cima à direita, logo abaixo do cabeçalho, com cerca de um terço à vista, como algo muito distante (a malha fica numa camada intermediária).
2. **Ao longo da página**, anda pelo alto da tela, cresce e engole o conteúdo que sobe até ele.
3. **Depois do rodapé**, a rolagem continua, e você cai dentro dele.
4. **Do outro lado**, o topo do site chega por uma janela redonda, e a página recomeça.

Quase tudo responde só à posição da rolagem. Rolando devagar ou rápido, com a roda do mouse, o botão do meio, o toque ou o teclado, cada posição da página mostra sempre a mesma imagem, como um filme que a rolagem avança e volta.

O código fica em [`src/lib/buracoNegro/`](src/lib/buracoNegro/), e os arquivos citados nesta seção sem o caminho completo estão nessa pasta.

### A luz e o disco

O caminho da luz em volta do buraco negro é traçado uma vez só, antes de ele aparecer. Para cada ponto da imagem, o shader `geodesicas.frag` segue o raio de luz de trás para a frente, na trajetória curva em volta do buraco negro, e guarda num mapa onde ele cruzou o disco de gás e quanto de névoa atravessou.

Desse mapa saem a sombra, o anel de luz e o disco, visto quase de lado, como em *Interstellar*: uma faixa fina passa na frente da sombra, enquanto a luz da parte de trás do disco, dobrada pela gravidade, contorna a sombra por cima e por baixo, em arcos. A parte de baixo do disco só aparece por baixo da de cima: o arco que contorna a sombra por baixo não continua subindo rente a ela, acima da faixa da frente.

A malha quadriculada da apresentação também é desenhada junto com ele (`composicao.frag`), curvada pela gravidade. No tema escuro, o disco brilha na cor de destaque; no claro, vira uma gravura em nanquim.

O gás gira com a velocidade de cada órbita, mais rápido perto do centro, sem que o desenho se enrole com o tempo: cada anel da textura gira inteiro e desliza sobre os vizinhos, e a rotação fecha um ciclo exato a cada três horas, mais ou menos. Girar não exige traçar raio nenhum: a cada quadro, `disco.frag` só põe o gás, na posição em que a rotação o deixou, sobre os pontos do disco que o mapa guarda, com o brilho de cada um (o efeito Doppler e o desvio gravitacional também vêm prontos do mapa).

O disco ainda reage ao sentido da rolagem, e não à velocidade: enquanto a página desce, ele esquenta e gira um pouco mais rápido; enquanto sobe, saem os jatos. Ele acompanha com um pequeno atraso, sem pulsar a cada tranco da roda.

### O cursor também tem gravidade

O mouse é uma pequena massa que curva a malha em volta dele, com a mesma lente do buraco negro, e a revela num círculo em qualquer ponto da página. No meio, a lente é amaciada e não tem sombra: a malha ali só aparece ampliada, e as linhas se curvam em volta dele.

A massa segue o ponteiro com um pouco de inércia (o que também esconde o atraso de o ponteiro chegar da thread principal), fica mais forte enquanto ele se mexe e mais fraca com ele parado, e some quando o mouse sai da janela e no começo do mergulho. No tema escuro, as linhas perto dela puxam para a cor de destaque, com um brilho fraco em volta; no claro, ficam no traço de nanquim.

Quem a desenha é o motor, no mesmo quadro do buraco negro: a página só manda a posição do ponteiro, e o cursor do sistema continua o de sempre. Só o mouse tem massa (um toque não), e com o movimento reduzido ela não aparece.

### Um clique solta uma onda gravitacional

Cada clique solta uma onda gravitacional do ponto em que o botão desceu: um anel que corre para fora, a uns 950 px por segundo, revela a malha por onde passa, na cor de destaque e com um fio de luz fraco na frente, e some depois de quase dois segundos, já do outro lado de uma tela grande.

A malha não ondula como água. Ao passar, a onda estica o espaço num sentido e o aperta no outro, alternando a cada crista, como as ondas gravitacionais de verdade (a polarização "+"): na horizontal e na vertical em relação ao clique, a malha anda para fora e para dentro; nas diagonais, de lado. Ela também enfraquece com a distância, a energia espalhada num anel cada vez maior.

- **No celular também.** Um toque solta a onda quando o dedo sai da tela sem ter arrastado: o dedo que rola a página não faz ondas.
- **Até quatro ao mesmo tempo.** Com cliques seguidos, a onda mais velha dá lugar à nova.
- **Só na página.** As ondas somem no começo do mergulho, como a massa do mouse, e não aparecem com o movimento reduzido nem com o buraco negro parado.

Como a massa do mouse, ela é desenhada pelo motor (`cena.glsl`): a página só manda a posição e o instante do clique, e cada pixel soma o deslocamento das ondas que passam por ele. Longe dos anéis, o shader nem faz a conta.

### A absorção

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/absorcao-escuro.webp">
  <img src=".github/readme/absorcao-claro.webp" alt="Dois cartões de projeto sendo puxados para o buraco negro no alto da tela, esticados numa tira contínua" width="100%">
</picture>

<br><br>

Ao longo da página, no mesmo ritmo da rolagem, o buraco negro anda pelo alto da tela até chegar ao meio dela no fim do conteúdo e cresce, cada vez mais perto, até três vezes o tamanho. O ponto mais baixo dele fica parado na mesma altura, e o resto cresce para cima e para os lados.

Só o conteúdo que sobe até uma faixa estreita logo abaixo do cabeçalho é absorvido. Cada linha que entra na faixa é puxada até o buraco negro, devagar no começo e cada vez mais rápido, ficando mais estreita e esmaecendo na mesma medida (inteira na borda da faixa, quase invisível perto do centro), até sumir de vez ao cruzar a borda da sombra: nada aparece dentro dela. As linhas de cima vão na frente e as de baixo ainda estão presas à página, então o conteúdo se alonga numa tira contínua que sai da página e entra no buraco negro, a *espaguetificação*.

- **Blocos altos são engolidos aos poucos.** Num cartão de projeto, só o trecho que já está na faixa é puxado; o resto continua no lugar até chegar a sua vez.
- **A tira não se parte.** Cada bloco mira o ponto em que o buraco negro está quando o meio do bloco cruza a faixa. Todas as fatias dele vão ao mesmo ponto e, como o buraco negro anda devagar, a tira chega lá já dentro da sombra.
- **A rolagem é o relógio.** Quanto cada bloco já foi absorvido depende só de onde ele está na tela, e o desenho de cada posição da rolagem é calculado de antemão. Com a página parada, o que estava no meio do caminho continua ali; rolando para cima, o conteúdo é cuspido de volta pelo mesmo caminho. Tudo muda de forma contínua com a rolagem.

Os blocos absorvidos são os que já têm animação de entrada (`Reveal` e `.enter`), e a lógica fica em `src/lib/buracoNegro/absorcao.ts`.

Como o alto da tela passa a ser do buraco negro, os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o topo: o JavaScript calcula essa altura e a passa ao `scroll-padding-top` do `index.css` (a variável `--topo-livre`). Sem o efeito, vale a distância padrão.

<details>
<summary><strong>Como a absorção é desenhada</strong></summary>

<br>

**Fatias.** Uma transformação CSS deforma um elemento inteiro de um jeito só. Por isso, o trecho de cada bloco que está na faixa é desenhado em fatias de uns 10 px (sempre um número inteiro de pixels da tela), cada uma deformada no seu trapézio. As bordas de fatias vizinhas coincidem, e a tira sai contínua.

**Fotos.** A absorção é toda pré-renderizada: cada bloco tem uma foto, feita uma vez, longe da faixa, e cada fatia é só um retângulo com o seu pedaço dela de fundo, sem nada dentro. A foto (`fotos.ts`) sai de um SVG com um clone do bloco num `foreignObject`, com as regras de estilo da página (as fontes e as imagens embutidas, porque um SVG usado como imagem não busca nada fora dele, e as media queries e as unidades da janela resolvidas pela própria página) e com o zoom da tela, para as bordas e o texto caírem nos mesmos pixels que os do original. O navegador desenha esse SVG numa tela, na resolução da tela e na mesma fração de pixel em que o bloco está na página, e a tela vira um PNG, decodificado uma vez e usado por todas as fatias do bloco. Numa janela de verdade, a foto bate praticamente pixel a pixel com o original.

**Cortina.** As fatias ficam numa camada fixa no alto da tela, sem foco, clique ou leitor de tela, por cima de uma cortina: um canvas que cobre a faixa com o fundo da página, o buraco negro e a malha (copiados do canvas do fundo a cada desenho). O bloco original não sai do lugar nem muda, e nada nele depende da rolagem: ele só passa por trás da cortina, que o corta exatamente na beira da faixa.

**Animações presas à rolagem.** Quem move as fatias é o navegador, e não o JavaScript. Cada fatia tem uma animação presa à rolagem (uma `ViewTimeline` ancorada no `main`, em `rolagem.ts`), com um quadro-chave para cada pixel da tela que a página rola enquanto a fatia atravessa a faixa. Cada quadro vale até o próximo, sem interpolação: entre duas perspectivas, o navegador interpola mal, e o trapézio saía torto. A rolagem corre fora do JavaScript, que chega a ficar um quadro ou mais para trás dela; as animações correm junto com ela, na mesma etapa, e a tira não se descola do original na beira da cortina, por mais rápida que seja a rolagem.

**Tampa.** O esmaecimento e o sumiço na sombra ficam por conta de uma tampa: um segundo canvas, por cima das fatias, com a mesma imagem da cortina, tanto mais opaca quanto mais o conteúdo já foi puxado naquela altura (a altura de cada linha na faixa diz o quanto ela já foi puxada) e inteira na sombra do buraco negro. Sobre a cortina, isso dá exatamente o que daria uma máscara nas fatias, sem o custo dela: com a máscara, o navegador desenhava todas as fatias à parte, a cada quadro, e só então as recortava. Quem desenha a tampa é o motor do buraco negro, no mesmo quadro da cortina, com a sombra onde ele a desenhou. As contas da faixa ficam em `faixa.ts`, para a página e o motor fazerem as mesmas.

**Fatias de prontidão.** As fatias esperam a vez logo acima da tela, fora dela, já desenhadas: dentro da tela, mesmo recortadas, cada fatia nova precisava estar desenhada antes de o quadro seguinte da página aparecer. No topo da página elas também ficam lá, e a absorção aparece no segundo pixel de rolagem, junto com a cortina e a tampa.

**Linhas e títulos.** As linhas soltas da página (a borda de cima das seções e das listas) também são absorvidas, como blocos de uma fatia só desenhados por um modelo da linha. Os títulos fixos das seções, que param dentro da faixa, ficam por cima da cortina e da tampa.

**Por que `ViewTimeline`.** Uma `ScrollTimeline` vai do topo à rolagem máxima, e a rolagem máxima muda com a página rolando (no celular, quando a barra do navegador some ou volta; e quando a página muda de altura). A cada mudança, o Chrome reenviava todas as animações ao compositor, com as centenas de quadros-chave de cada uma (no celular emulado, um quadro de uns 30 ms por mudança). A `ViewTimeline` ancorada no `main` acompanha a posição dele na tela e não depende da rolagem máxima. Os trechos são contados do topo dele, sem o recuo do `scroll-padding-top`, que ela descontaria por padrão. O mergulho, que fica depois do `main`, continua com a `ScrollTimeline`.

</details>

<details>
<summary><strong>O que fica com o JavaScript</strong></summary>

<br>

Ao JavaScript resta pôr as fatias no lugar antes de a página chegar a elas e refazer a foto quando o original muda sem rolagem, para nada se partir entre ele e a tira.

**Agenda das fotos.** As fotos são feitas com o tempo que sobra entre os quadros, das mais perto da faixa às mais longe, e uma foto velha continua valendo até a nova ficar pronta. A de um bloco que chega perto da faixa sem foto nenhuma não espera a página ficar ociosa: começa logo depois do quadro, e não dentro dele. Lá, medir o bloco depois de mexer nas fatias obrigava o navegador a refazer o layout na hora (rolando logo que a página abre, com a CPU 4 vezes mais lenta, o tempo em layouts forçados caiu quase pela metade).

**Vídeos.** Cada fatia que cruza um vídeo tem uma tela, por cima da foto, com a parte do quadro atual que cai nela (com os cantos arredondados do cartão). Quem desenha nessas telas é outro worker, o pintor (`pintor.ts`, ligado à página por `telas.ts`), que recebe cada quadro novo dos vídeos assim que ele existe. O que ele desenha vai para a tela sem esperar a thread principal e, rolando rápido, com a página para trás, os vídeos da tira continuam com todos os quadros. As telas passam de fatia em fatia, guardadas numa reserva (um canvas entregue a um worker não volta), e só as das fatias que estão na faixa recebem cada quadro. O que fica na frente do vídeo, como o botão de pausa, tem uma foto à parte, que o pintor desenha por cima de cada quadro. Sem worker, `OffscreenCanvas` ou `VideoFrame`, as fatias mostram o pôster do vídeo.

**Animações dentro dos blocos.** O que se anima sem parar dentro de um bloco (o ponto que pulsa ao lado do status) fica fora da foto, e a fatia que passa pelo meio dele leva uma cópia viva dele, no mesmo passo da animação do original.

**Mouse, tema e React.** O mouse em cima de um bloco, a troca de tema e o que o React redesenha dentro dele (o ícone de um vídeo que pausou, por exemplo) pedem foto nova, só a da frente do vídeo se a mudança foi só ali. Numa imagem não há mouse: os elementos com o mouse em cima são marcados no clone, e as regras de `:hover` passam a valer para a marca. Cada bloco guarda as fotos dos estados do mouse que já teve (até quatro): o mouse que sai de um bloco, ou volta a um estado já visto, troca a foto na hora, mesmo rolando.

**Quando refazer.** Refazer uma foto custa alguns milissegundos numa tarefa só (o navegador monta um documento para o SVG). Por isso, a foto nova espera as transições do original acabarem e, longe da faixa, a página parar de rolar; a de um bloco que está na faixa, à vista, não espera a rolagem.

**Foco do teclado.** Um bloco com o foco do teclado passa para a frente da cortina e da tampa e fica inteiro no lugar até o foco sair dele. O mesmo acontece, por um instante, com um bloco que chega à faixa antes de a foto dele ficar pronta.

</details>

### A rolagem suave

Enquanto a absorção age, a roda do mouse e o dedo passam por uma rolagem suave (`rolagemSuave.ts`), que limita a aceleração e a velocidade da página:

- **Roda do mouse.** A roda não move a página na hora: muda o destino dela, e a página anda até lá com a aceleração limitada (6 telas por segundo, a cada segundo) e sem passar de 3 telas por segundo, arrancando e freando aos poucos, por mais forte que seja o giro.
- **Dedo.** O dedo arrasta a página com ele, sem passar da mesma velocidade, e o embalo que ele deixa ao sair da tela perde velocidade aos poucos, também com a aceleração limitada.
- **Links da página.** Os links para outro ponto da página (o menu, o logo, os botões da apresentação), clicados com o mouse ou o dedo, também vão pela rolagem suave, com a mesma aceleração e até 8 telas por segundo. Com a velocidade da roda, voltar ao topo do fim da página levava uns 4 s; assim, leva uns 3 s. Eles param onde o navegador pararia, logo abaixo da faixa; o endereço muda como com o link, e o voltar do navegador funciona.
- **Teclado e busca.** O teclado (inclusive o Enter num link, que também leva para lá o ponto de partida do Tab) e a busca do navegador continuam com a rolagem do navegador, e a rolagem suave segue de onde eles deixam a página.

Quem move a página é o próprio laço de quadros da absorção, antes de preparar as fatias. Assim, a página nunca anda à frente do que a absorção vê, como acontecia com a rolagem do navegador, que corre fora do JavaScript e, rápida demais para um celular, levava o conteúdo à faixa antes de as fatias dele estarem prontas. Num quadro lento, a página anda menos, em vez de saltar.

> [!NOTE]
> Ligada, a rolagem suave tira do navegador a rolagem pelo dedo (`touch-action: pinch-zoom` no `html`; a pinça do zoom continua). No celular, a barra de endereço não some ao rolar e o puxar para recarregar não funciona. Quem prefere menos movimento, ou tem um aparelho lento demais para o efeito, fica com a rolagem do navegador.

### Tudo pronto de antemão

Tudo o que o buraco negro mostra é calculado de antemão, e a animação só lê o que já está pronto:

- **O mapa dos raios**, traçado em oito faixas, uma por quadro, antes de o buraco negro aparecer. Um mapa só serve a todos os tamanhos dele, do canto ao mergulho.
- **O trajeto** pela página e pelo mergulho: a posição, o tamanho e o ângulo da câmera para cada pixel de rolagem, tabelados em `trajeto.ts`.
- **A rotação do disco**, que é o gás deslizando sobre o mapa.

Quem desenha é um worker (`trabalhador.ts`, que roda `motor.ts`), com o canvas do fundo, a cortina, a tampa e a tela de cima transferidos para ele (`ponte.ts`). O laço de quadros dele corre fora da thread principal, e nada do que pesa nela (a absorção, os vídeos, o React) atrasa um quadro do buraco negro, que gira e anda no ritmo da tela, como a rolagem.

```mermaid
flowchart LR
    pagina["Thread principal<br/>absorção, fotos e rolagem suave"]
    navegador["Compositor do navegador<br/>rola a página e move as fatias"]
    motor["Worker do motor<br/>buraco negro, cortina e tampa"]
    pintor["Worker do pintor<br/>vídeos da tira"]
    pagina -- "animações presas à rolagem" --> navegador
    pagina -- "rolagem de cada quadro" --> motor
    pagina -- "quadros dos vídeos" --> pintor
```

A página só manda para o motor a rolagem de cada quadro seu, que, com a página pesada, pode chegar na metade do ritmo da tela. O motor desenha a rolagem de um instante antes, entre duas notícias que já tem, suavizada, e o buraco negro e a malha andam lisos, sem passar do ponto quando a rolagem para. Onde não há worker com `OffscreenCanvas`, o mesmo motor roda na thread principal.

### O mergulho

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/mergulho-escuro.webp">
  <img src=".github/readme/mergulho-claro.webp" alt="O mergulho: o buraco negro no meio da tela, com o disco torcido em redemoinho e rastros de poeira correndo para fora" width="100%">
</picture>

<br><br>

A página não acaba no rodapé: a rolagem continua por um espaço vazio (`src/components/Dive.tsx`), num laço sem fim. Na primeira tela dele, a página sai toda de vista; depois, no trecho do mergulho, você cai no buraco negro. Ele, que chegou ao meio do alto da tela já grande, desce até o meio dela e continua crescendo, cada vez mais rápido, inteiro à vista (os arcos de luz por cima e por baixo da sombra), até a sombra preencher a tela inteira. A malha cresce junto, em volta dele.

A vista é a de quem cai (`queda.frag`):

- o espaço em volta da sombra se torce num redemoinho, no sentido em que o disco gira, e a faixa do disco se enrosca nela;
- as coisas correm para fora a partir do meio da tela, em rastros que se alongam quanto mais depressa se cai e quanto mais rápida a rolagem;
- grãos de poeira passam por quem cai, em perspectiva, cada vez mais depressa;
- a luz se separa em cores nas bordas, como numa lente forte;
- a visão se fecha num túnel, escurecendo as bordas, e no tema escuro a luz de fora fica mais azul e mais forte;
- perto do horizonte, a vista treme;
- o cabeçalho é puxado para dentro e some, e o canto de baixo (o link do outro idioma e o botão do som), também: anda na direção do buraco negro, estica-se e some.

A cena é desenhada numa textura um pouco maior que a tela, e a queda só a lê em outros pontos: nenhum raio é traçado, e o mergulho custa no motor o mesmo que o resto da página. Perto do fim, a tela passa a mirar acima do centro da sombra, para a faixa do disco que a cruza sair por baixo e sobrar só o preto, e um véu preto preso à rolagem apaga o que sobra, cabeçalho incluído.

### A volta ao topo

Aí estamos dentro dele. A página volta ao topo e, no escuro, acende-se um ponto de luz no meio da tela. Ele se abre numa janela redonda, com a borda brilhando como o anel em volta da sombra, e por ela vem o topo do site, minúsculo, lá do fundo, ainda na vista de quem cai: a mesma da queda (`queda.frag`), só que sem o redemoinho e sem o tremor, e nada gira.

- Grãos de poeira passam correndo para fora, em perspectiva, enquanto o site ainda está longe.
- Tudo deixa rastros para fora, mais longos quanto mais depressa o site se aproxima.
- A luz do site fica mais azul no tema escuro.
- A visão, fechada num túnel no começo, se abre conforme ele chega.

O site vem arredondado, como pintado numa bola vista de frente: o meio dele ampliado e as beiras apertadas contra a borda da janela, com o buraco negro do canto curvado junto. Ao chegar, a bola se achata, os rastros somem e a janela passa dos cantos da tela.

O véu da página segura o preto até o motor avisar que a entrada já está na tela. Durante a entrada, a rolagem fica travada, para o embalo da roda ou do dedo não levar o topo embora, e de lá não há para onde subir. Como a absorção, o mergulho depende só da posição da rolagem, e rolando para cima ele volta atrás; só a entrada anda no tempo.

A lógica fica em `mergulho.ts` (o véu, a janela sem o motor, o cabeçalho e a volta ao topo), na função `posicaoEm` de `trajeto.ts` (o buraco negro) e em `entrada.ts` (a curva da entrada).

<details>
<summary><strong>Como a volta ao topo é desenhada</strong></summary>

<br>

**A foto do topo.** Quem desenha o site chegando é o motor, a partir de uma foto do topo do site (`fotografarTopo`, em `fotos.ts`): a tela como ela fica com a página no topo, com o cabeçalho e o que o conteúdo mostra ali. Ela é feita como as fotos da absorção, num SVG com os clones desenhado na resolução da tela, e entregue ao worker como uma imagem, sem cópia, onde vira uma textura com mipmaps (lida pequena lá no fundo sem virar chuvisco). O cabeçalho, que muda com a rolagem, sai na foto como ele é no topo, sem o fundo desfocado e sem a seção ativa no menu. A foto é feita com a página ociosa, logo que o efeito começa, e de novo quando o tema, o tamanho da tela ou as fontes mudam.

**Duas passadas.** `entrada.frag` faz a imagem (o site na bola, sobre a cena, a janela e o escuro em volta) numa textura, e a vista de quem cai a leva à tela.

**A tela de cima.** Durante a entrada, uma tela do motor cobre a página toda, cabeçalho incluído, com o mesmo quadro do canvas. A página fica parada no topo, por baixo dela, já desenhada, e o navegador não anima nada. O último quadro da entrada é a página como ela é, pixel por pixel, e a tela de cima esmaece em 0,16 s, deixando a página de verdade no lugar. Trocadas de uma vez, as letras piscariam: o texto da página é suavizado em cores, e o da foto, em cinza.

**Para não pesar.** Longe da janela, que passa a maior parte da entrada pequena, a cena e a foto nem são lidas; a primeira passada só cobre a tela; e, nos rastros da entrada, as cores não se separam como na queda (cada ponto do rastro é uma leitura da imagem, e não três; a borda da janela já tem as cores separadas).

**Sem a foto.** Quando a foto ainda não foi feita, ou onde o navegador não deixa ler a imagem do SVG (no Safari), o navegador traz o site, aumentando o cabeçalho e o conteúdo a partir do meio da tela, recortados à primeira tela, e o motor desenha a janela e o escuro atrás deles, os dois a partir do mesmo instante e pela mesma curva (`entrada.ts`). Nesse caso, o site só cresce, sem girar nem aparecer aos poucos: girado, o recorte à primeira tela deixava de ser um retângulo alinhado à tela, e uma opacidade animada no conteúdo inteiro também pesava (o navegador travava uns dois décimos de segundo na primeira entrada).

</details>

### O som

O site também tem som, desligado até alguém pedir. O botão fica no canto de baixo da tela, ao lado do link do outro idioma, discreto e sem fundo, e é uma onda: desligado, uma linha reta; tocando, ela ondula com a música que sai, cresce com o volume, pulsa com o pulso e salta com o chirp de cada clique. No mergulho, o buraco negro o engole junto com o cabeçalho, e ele volta com o site. A escolha fica guardada para a próxima visita. Nada é baixado para tocar: tudo é sintetizado na hora com a Web Audio API, a partir de osciladores, ruído e filtros, como o buraco negro sai dos shaders.

O fundo é um coro, no clima da versão lenta e com eco de *Choral Chambers*, de Christopher Larkin (da trilha de *Hollow Knight: Silksong*), que serviu de referência: ré menor, na mesma afinação dela, vozes escuras, acordes longos que se fundem uns nos outros e um eco de catedral. E, como ela, a música começa de um jeito e termina de outro: a faixa abre só com as vozes do meio, ganha um grave fundo e cresce até o fim, mais forte, mais clara e com notas que pulsam. Aqui, quem a faz crescer é a leitura. Os acordes, a ordem deles, as vozes e a melodia são próprios.

| Quando           | O que se ouve                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No topo          | Só o coro, longe e escuro, numa vogal fechada ("u"), quase parado: o soprano suspira dentro de cada acorde, sobre o zumbido do buraco negro, em ré                                                     |
| Nos projetos     | Entra um grave fundo, como um órgão, uma oitava abaixo do coro, e as vozes do meio começam a andar de um acorde para o outro                                                                           |
| No meio          | Um descante canta por cima, o baixo anda, a vogal se abre e o ciclo de acordes passa a terminar na dominante, que pede a volta ao ré menor                                                               |
| No fim           | Um pulso de cordas graves bate a cada batida (no contato, a cada meia batida), e por meio ciclo o chão vira o ré do buraco negro. A música está no ponto mais cheio, mais claro e mais perto             |
| Rolando          | Para baixo, o conteúdo é sugado num sussurro afinado nas notas do coro; para cima, os jatos brilham, nas mesmas notas, duas oitavas acima                                                              |
| Num clique       | A onda gravitacional soa como as que os detectores ouviram: um chirp, que uma voz do coro canta subindo cada vez mais depressa até a fusão e pousa numa nota do acorde, vindo do lado da tela em que se clicou |
| No mergulho      | A música inteira desce de tom e fica mais lenta até quase parar, o ronco cresce, o ar corre mais rápido e tudo treme perto do horizonte. Quando o véu fecha a tela, o som acaba de uma vez, e só o eco se perde no escuro |
| Na volta ao topo | Uma voz aguda acende com o ponto de luz, o site vem num sopro que sobe, e o coro volta mais agudo (o desvio para o azul), num acorde suspenso, que pousa no ré menor junto com o site: a música recomeça como no começo |
| No resto         | Uma nota curta do coro ao passar o mouse por links e botões, acima das outras vozes, que vira um arpejo numa lista, e duas notas cantadas na troca de tema: descendo para o escuro, subindo para o claro |

**Tudo em harmonia.** Todo som com nota toca uma nota do acorde que o coro canta naquele momento: o tique, o chirp, as notas do tema, o ponto de luz e o acorde do pouso. Até os ruídos (a sucção, os jatos, o ar da queda e o sopro da volta) passam por filtros afinados nessas notas. As vozes que andam passam por notas da escala, nunca a meio tom de outra voz, e o zumbido em ré cede quando a dominante traz o dó sustenido.

**Os efeitos, no coro.** Os efeitos com nota (o tique, o chirp, as notas do tema, o ponto de luz e o acorde do pouso) são cantados pelo próprio coro: vozes como as dele, dois osciladores dente de serra desafinados um contra o outro, com o vibrato do descante, pela mesma vogal e pelo mesmo brilho que ele tem naquela hora. A vogal dos efeitos é mais aberta, como a dos cantores nas notas agudas: com os formantes estreitos do coro, umas notas do tique soariam uns 10 dB mais baixas que outras; assim, ficam a uns 2 dB. Todos os efeitos soam na mesma catedral do fundo, com o eco na mesma medida, só um pouco mais perto, e crescem com a música: no topo, onde ela é quieta, soam a 60% do volume do fim. Os jatos ficaram uma oitava abaixo (três oitavas acima do coro, eram assobios por cima de tudo), e o baque do pouso segue seco, sem eco, para não embolar o grave.

| Medida                                                           | Antes                              | Agora                             |
| ---------------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| Brilho do tique (o centro do espectro; o do fundo, uns 450 Hz)    | 1645 Hz, com 48% acima de 1,5 kHz  | 720 Hz, com 1%                    |
| Quanto do som dos efeitos cantados vem do eco (no fundo, de 36 a 63%) | 6 a 10%                        | uns 40%                           |
| O chirp acima do fundo, no topo, no meio e no fim do conteúdo     | 15,8, 10,8 e 6,7 dB                | 8,6, 7,8 e 6,5 dB                 |
| O tique acima do fundo, no topo, no meio e no fim do conteúdo     | 4,4, -1 e -5,2 dB                  | 3,4, 2,4 e 1,7 dB                 |
| Brilho do som rolando para cima (com os jatos)                    | 914 Hz, com 22% acima de 1,5 kHz   | 520 Hz, com 2%                    |

**No mergulho, o tempo passa devagar.** O desvio para o vermelho baixa o tom de tudo junto (o coro, o grave, o pulso, os efeitos e os filtros), e por isso nada sai do acorde. Na mesma medida, ele deixa a música mais lenta: perto do horizonte o tempo passa devagar, como na dilatação do tempo, e as batidas se espaçam de verdade. No horizonte, ela para. Ao longo da página não há desvio: longe do horizonte, ele seria pequeno demais para se ouvir, e o que muda ali é a música.

O som acompanha o que se vê. Com o buraco negro parado no alto da página (movimento reduzido ou aparelho lento), a música ainda cresce com a leitura, mas o zumbido fica como no topo, sem a sucção, a queda e as ondas, e no fim da página o topo volta só com o acorde.

<details>
<summary><strong>Como o som é feito</strong></summary>

<br>

**Só para quem liga.** O navegador não deixa uma página tocar som antes de um clique ou de uma tecla, e um portfólio que faz barulho sem pedir incomoda. O botão começa desligado; ligado, o contexto de áudio é criado no próprio clique, e a onda dele é o primeiro som. Quem deixou o som ligado o ouve de novo na próxima visita, a partir do primeiro clique ou tecla (para o navegador, rolar a roda não é um gesto). O código dos sons só é baixado quando o som liga, ou logo no começo, quando a escolha guardada é de som ligado. Com a aba escondida, o som some e o áudio para; de volta à aba, ele volta do silêncio.

**O coro.** São dois conjuntos de cinco vozes (baixo, tenor, contralto, soprano e descante): um canta o acorde, e o outro espera calado o seguinte, que entra enquanto o primeiro some, sem emenda. Cada voz são dois osciladores dente de serra, desafinados um contra o outro, com vibrato, e todas passam pelos mesmos três formantes, os de uma vogal, que se abre ao longo da página e desce de tom junto com as notas no mergulho (como numa gravação tocada mais devagar). O pedal são dois senos em ré; o de baixo e um ré ainda mais grave, a gravidade, só crescem perto do buraco negro. O eco é o de uma catedral, gerado uma vez: ruído que decai em 6 s e escurece com o tempo, com os dois canais independentes, para o eco se abrir de um lado ao outro.

**Uma passacalha.** O chão da música é um ciclo de oito compassos que se repete do começo ao fim, i, VI, III, VII, i, iv, VI, VII em ré menor, um acorde por compasso, cada um com oito batidas de 1,1 s. O que muda ao longo da página é o que se canta sobre ele, como nas variações de uma passacalha. As seções (`SECOES`) são quatro, e cada uma só começa no início de um compasso:

- **A câmara** (o topo): só o coro, quase parado. O soprano faz uma bordadura dentro de cada acorde, e o contralto passa de uma nota à outra.
- **O chão** (a partir de 15% da página): o tenor e o contralto andam, por notas de passagem da escala nas últimas batidas, ou, quando a nota fica de um acorde para o outro, bordam a vizinha, um tom acima ou abaixo e nunca a meio tom de uma nota do acorde (aí soaria como erro, e não como enfeite).
- **O pleno** (a partir de 45%): o baixo também anda, e o último compasso vira na metade para a dominante, lá maior, com a escala de passagem levando o dó sustenido.
- **O horizonte** (a partir de 72%): o grave fundo fica no ré nos quatro primeiros compassos, e o pulso bate.

As camadas novas não esperam o compasso: entram aos poucos com a rolagem, cada uma no seu trecho da página (`ENTRA`). O grave fundo é um órgão de pedal (um oscilador com seis harmônicos, para se ouvir também em alto-falantes pequenos, que quase não tocam a fundamental), uma oitava abaixo do baixo do coro, e anda com ele. O descante, a quinta voz, desce do lá agudo e sobe de volta a ele ao longo do ciclo, mudando junto com o soprano. O pulso são cordas graves repetindo a nota do grave, uma oitava acima, a cada batida e, no fim, a cada meia batida, com a oitava de cima no contratempo. Quando um compasso termina, as vozes que vão por passo à nota seguinte já chegam a ela com o conjunto que sai, e as que saltam, saltam com o que entra: a nota de passagem não fica soando contra a seguinte. Ao longo da página, a vogal se abre, o filtro do coro clareia de 1,4 a 3,2 kHz, e o fundo vai mais direto para a saída, com menos eco: a música chega mais perto.

**A página não espera o som.** O áudio é feito numa thread própria do navegador. Da thread principal só saem alvos para ele seguir (os volumes, o tom, a vogal, os filtros), e só enquanto a rolagem anda: uns 9 µs por quadro. Os compassos são agendados dois segundos adiante, de meio em meio segundo, cada um com as notas de todas as vozes, o grave e o pulso de uma vez (uns 0,1 ms por compasso). A volta ao topo é agendada inteira de uma vez, no relógio do áudio, para o mesmo instante do túnel: os engasgos da thread principal na hora do salto não a atrasam. Montar os sons, no clique que os liga, leva uns 6 ms; gerar o eco e entregá-lo ao navegador custa uns 17 ms, e isso fica para uma tarefa à parte, logo depois: o coro começa na hora, e o eco chega uma fração de segundo depois.

**Sem estalos.** O som é feito a 24 kHz, metade da taxa de costume. A música é escura: gravada a 48 kHz, quase nada dela passa de 11 kHz (uns 50 dB abaixo do resto), e a 24 kHz cabe tudo até 12 kHz pela metade das contas (o eco, a parte mais cara, por um quarto); o navegador passa para a taxa da placa na saída. O ruído e o eco são gerados para soar igual em qualquer taxa (a mesma energia em cada faixa de frequência, e o filtro do eco fechando nas mesmas frequências), e o som a 24 kHz fica a menos de meio decibel do de 48 kHz, no total de cada trecho da página. Os tons, os filtros e o lado do som são lidos a cada bloco de 128 amostras, e não a cada amostra: com o vibrato e o desvio de tom ligados neles, cada oscilador e cada filtro refaziam as contas amostra por amostra. E o navegador prepara uns 20 ms de som adiantado (`'playback'`), e não 10 ms, como no Windows com `'interactive'` (no Mac e no Android, menos ainda): um atraso da thread do áudio precisa passar disso para virar um buraco na saída. Três coisas estalavam com a página engasgada, mesmo sem buraco nenhum:

- **Os efeitos começando atrasados.** Um efeito pedido para agora (o tique, o chirp, as notas do tema) às vezes entra no áudio um pouco depois do instante pedido: o navegador faz o som adiantado, em lotes, e um nó novo só entra no lote seguinte. O envelope do efeito, preso ao relógio do áudio, já estava no meio da subida, e o som começava de uma vez. Agora cada efeito passa por uma porta, um buffer que toca do começo quando o efeito começa de fato e refaz a subida em 3 ms.
- **A volta ao topo.** Numa rolagem rápida, ou num engasgo, o véu fecha a tela antes de o fundo se calar de todo, e a volta o cortava de uma vez. Agora o que ainda soa some em 40 ms, e só então a harmonia recomeça.
- **A aba escondida.** O áudio parava com o som saindo e voltava de uma vez. Agora o som some antes de o áudio parar e volta do silêncio.

| Medida (no computador, no Chrome)                                                                 | Antes                               | Agora                              |
| ------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| O som, num núcleo (gravado fora da página)                                                        | 12 a 15%                            | uns 3,5%                           |
| A thread do áudio tocando (com o trace ligado)                                                    | uns 20%, o pior lote em 3,5 ms de 10 | uns 6%, o pior lote em 2,1 ms de 20 |
| Estalos em 28 s de rolagem, com a thread principal parada 120 ms a cada 0,7 s e o mouse nos links | 7                                   | nenhum                             |
| A volta ao topo, num salto de 60% do mergulho direto para o fim                                   | um estalo forte                     | nenhum                             |

**O botão.** O som passa por um medidor (um `AnalyserNode`, que o deixa como está) a caminho da saída, e o botão pergunta a ele o volume dos últimos ~20 ms a cada desenho. A onda são duas camadas de senoides presas nas pontas, a da frente e um eco mais fraco, em outro ritmo; o volume abre as duas, sobe depressa e desce devagar, e a onda corre mais rápido com a música cheia. Ela é redesenhada uns 50 vezes por segundo (uns 0,1 ms cada, só enquanto se mexe); desligada e parada, ou com a aba escondida, nada roda. Com o movimento reduzido, ligada, ela fica parada. Ele e o link do outro idioma, ao lado, formam o canto de baixo da tela: os dois sem fundo nenhum, nem ao passar o mouse, que vira a mãozinha e escurece as letras e a onda. Sem JavaScript, o canto tem só o link do idioma. Ele fica por cima do conteúdo e do cabeçalho, mas abaixo da volta ao topo e do véu do mergulho, e vem logo depois do cabeçalho na ordem do teclado. No mergulho, o canto inteiro é puxado para o meio da tela, para onde o buraco negro desce, numa animação presa à rolagem, como a do cabeçalho: anda um terço do caminho, estica-se nessa direção, afina e some na metade do mergulho; daí em diante, invisível, não responde mais ao mouse nem ao teclado. Na volta, ele está na foto do topo do site e chega com ele (sem a foto, chega com o cabeçalho e o conteúdo, crescendo a partir do meio da tela).

**No celular.** Num celular, ou num aparelho com até quatro núcleos, o coro fica mais leve: um oscilador por voz (também no pulso), sem o fôlego das vozes, e um eco de 3,5 s. No computador, o áudio todo ocupa uns 3,5% de um núcleo; no modo leve, uns 2,5%.

**De onde vem cada efeito.** O chirp segue a conta da espiral de dois buracos negros antes da fusão: faltando τ para ela, a frequência é proporcional a τ^(-3/8), e a amplitude, à frequência elevada a 2/3. A sucção, os jatos, o ar da queda e o sopro da volta são ruído em filtros estreitos, afinados nas notas do acorde, que trocam junto com ele. O ronco é ruído grave, com uma parte afinada no ré. Um limitador na saída segura os picos.

**Os eventos.** O regente (`src/lib/som/regente.ts`) tira da rolagem quanto da página já se leu (por onde a música vai), quanto o buraco negro já se aproximou e em que parte do mergulho se está. A onda e o estado do buraco negro vêm de `index.ts`, e a volta ao topo vem de um aviso de `mergulho.ts`, com o instante e a duração dela. O tique só soa quando o mouse se mexe: rolando, o conteúdo passa por baixo dele parado, e o navegador também avisa que ele entrou nos links que chegam.

**Como foi comparado e medido.** A faixa de referência foi decodificada no navegador e analisada: a tonalidade, a afinação, o espectro médio (escuro, quase sem nada acima de 2 kHz), o tamanho do eco (uns 8 s até -60 dB) e o ritmo dos acordes. O coro foi gravado num `OfflineAudioContext` e ajustado até bater com ela: ré menor, a mesma afinação, o mesmo centro de brilho (uns 690 Hz, contra 650 na faixa), um eco do mesmo tamanho e o espectro médio a uns 5 dB dela, banda a banda.

Depois, a forma: de 5 em 5 s, a faixa e uma gravação do percurso da página (do topo ao fim do conteúdo, o mergulho e a volta) foram medidas do mesmo jeito: a energia de cada banda, o brilho, quantas notas soam juntas e a mais aguda delas. Na faixa, o que fica abaixo de 80 Hz vai de -35 dB da energia total, na entrada, a -7 a -15 dB, depois que o grave chega; o que passa de 1,5 kHz, de uns -30 a uns -20 dB, e o volume cresce uns 11 dB até o ponto mais cheio. No site: de -34 a -6 a -9 dB abaixo de 80 Hz, de -29 a -20 dB acima de 1,5 kHz, e uns 9 dB a mais do topo ao fim. O pulso faz o volume de 90 a 700 Hz oscilar uns 18% na batida (sem ele, uns 2%). A partitura que o código gera foi conferida batida a batida, em cada seção: nenhuma nota de passagem, vizinha ou do descante fica a meio tom de outra voz (só a bordadura do soprano, o si bemol sobre o ré menor, um suspiro de propósito).

Os volumes, trecho a trecho: o fundo fica em uns -35,5 dB no topo, -31,5 dB nos projetos, -29,5 dB no meio e -27 dB no fim do conteúdo; o chirp passa uns 6,5 a 9 dB por cima dele, o mergulho chega a -23 dB, e no silêncio do horizonte fica só o eco.

</details>

### Movimento reduzido, aparelhos lentos e alternativas

- **Movimento reduzido.** Quem ativou "reduzir movimento" no sistema vê o buraco negro parado no alto da página, sem absorção, sem a massa do mouse e sem as ondas dos cliques, e fica com a rolagem do navegador. No fim da página, o topo volta só com um fade, e a troca entre as versões do site é direta.
- **Aparelho lento.** A resolução cai sozinha em aparelhos que não dão conta do desenho, julgado pelo próprio motor, fora da thread principal. Num aparelho lento demais para o desenho ou para a absorção, o buraco negro também fica parado no alto da página, sem absorção.
- **Como o aparelho é julgado.** Conta o quadro típico de cada segundo (a mediana), e não a média: engasgos isolados, como os de um ou dois segundos que o Windows às vezes tem ao reorganizar a composição da tela quando um vídeo começa a tocar, não desligam o efeito. Na thread principal, o limite é de 12 quadros por segundo: as fatias são presas à rolagem com pelo menos três décimos de segundo de antecedência, e um quadro a cada 80 ms ainda as põe no lugar a tempo (com o limite em 25, o efeito parava ao rolar um pouco mais rápido pelos projetos, nos segundos em que a placa de vídeo fica ocupada).
- **Sem WebGL.** Sem WebGL 2, fica a malha em CSS de antes. Sem WebGL ou num aparelho lento, o buraco negro não mergulha, mas o véu escurece a tela do mesmo jeito e a janela se abre num furo dele, sem o túnel.
- **Sem worker com `OffscreenCanvas`.** O mesmo motor roda na thread principal.
- **Sem `ScrollTimeline`.** O JavaScript leva as animações das fatias à rolagem a cada quadro: o desenho é o mesmo, mas, rolando rápido, ele pode chegar um quadro atrasado.
- **Sem JavaScript.** O conteúdo continua todo no HTML pré-renderizado, e o espaço do mergulho não existe.

### Parâmetros para ajustar

Os valores do efeito ficam em constantes com nomes em português, nos arquivos de `src/lib/buracoNegro/`, e os do som, em `src/lib/som/`. Só o tamanho do espaço do mergulho fica no `index.css`.

<details>
<summary><strong>Ver todos os parâmetros</strong></summary>

<br>

| Arquivo           | Parâmetro                               | O que controla                                                                      |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `trajeto.ts`      | `CANTO`                                 | Quanto do buraco negro fica à vista no topo                                         |
|                   | `INCLINACAO`                            | O ângulo de onde ele é visto                                                        |
|                   | `ZOOM_PAGINA`                           | Quanto ele cresce ao longo da página                                                |
|                   | `BASE`                                  | O ponto mais baixo dele, que fica parado enquanto ele cresce                        |
|                   | `MERGULHO`                              | O mergulho                                                                          |
| `index.ts`        | `faixa`                                 | A altura da faixa de absorção                                                       |
|                   | `ANTECEDENCIA` e `FOLGA`                | Quanto da página fica preparado de antemão                                          |
|                   | `AQUECER`                               | Até onde as fotos são refeitas primeiro                                             |
|                   | `MAPA`                                  | A resolução do mapa dos raios                                                       |
|                   | `SUMIR`                                 | Em quanto tempo a tela de cima esmaece no fim da volta ao topo                      |
|                   | `ESPERA_DA_FOTO`                        | Quanto a foto do topo espera depois de o site mudar                                 |
| `absorcao.ts`     | `FATIA`                                 | A altura das fatias                                                                 |
|                   | `ESPERA_DO_MOUSE` e `ESPERA_DA_ROLAGEM` | Quanto uma foto velha espera o mouse e a rolagem                                    |
|                   | `VARIANTES`                             | Quantas fotos de estados do mouse cada bloco guarda                                 |
| `rolagemSuave.ts` | `ACELERACAO` e `VELOCIDADE`             | A aceleração e a velocidade máximas da rolagem suave                                |
|                   | `FREIO`                                 | Quanto da aceleração ela usa para frear                                             |
|                   | `CHEGADA`                               | Em quanto tempo a página alcança o destino da roda e do embalo do dedo              |
|                   | `VELOCIDADE_DO_LINK`                    | A velocidade máxima indo a um link                                                  |
| `faixa.ts`        | `esmaecimento`                          | O esmaecimento ao longo da faixa                                                    |
|                   | `HORIZONTE`                             | A borda da sombra                                                                   |
| `mergulho.ts`     | `VEU`                                   | Quando o véu escurece a tela                                                        |
|                   | `CABECALHO` e `FLUTUANTES`              | Quando o cabeçalho e o canto de baixo (o idioma e o som) são puxados, e quanto o canto anda até sumir |
| `motor.ts`        | `RASTRO`                                | A força dos rastros da queda                                                        |
|                   | `vistaNaQueda`                          | A força de cada parte da vista de quem cai, na queda                                |
|                   | `MASSA`                                 | A inércia da massa do mouse, quanto ela leva para aparecer e sumir, e a agitação    |
|                   | `ONDA`                                  | Quanto dura a onda de um clique e quando ela começa a enfraquecer                   |
| `cena.glsl`       | `CURSOR_*`                              | A lente e o círculo da massa do mouse                                               |
|                   | `ONDA_*`                                | A velocidade, as cristas, a força e o fio de luz das ondas dos cliques              |
| `entrada.ts`      | `ENTRADA`                               | A duração da entrada, de que tamanho o site aparece lá dentro e a margem da janela |
|                   | `vistaDaEntrada`                        | O quanto o site vem arredondado e a vista de quem cai na entrada                    |
| `src/index.css`   | `.mergulho`                             | O tamanho do espaço depois do rodapé                                                |
| `som/sintese.ts`  | `AFINACAO`, `BATIDA` e `CHAO`           | A afinação, a batida e o ciclo de acordes: as vozes, a melodia, o descante e a virada |
|                   | `SECOES` e `ENTRA`                      | O que muda em cada seção da música, e em que trecho da página cada camada entra     |
|                   | `PEDAL`, `GRAVE_DO_PEDAL`, `SUB` e `CORO` | O pedal (e quanto do ré grave dele soa na página), o ré mais grave e as vozes: o desafino, o vibrato, o peso e as trocas |
|                   | `ORGAO` e `PULSO`                       | O grave fundo e o pulso                                                             |
|                   | `VOGAL`, `CORPO`, `BRILHO` e `NO_TOPO`  | A vogal e o brilho do coro, e quanto do fundo soa no topo da página                 |
|                   | `VOGAL_DOS_EFEITOS`                     | O quanto a vogal dos efeitos, que cantam acima do coro, é mais aberta que a dele    |
|                   | `VOLUME`, `FUNDO`, `EFEITOS` e `ECO_DURA` | O volume de cada som, quanto do fundo vai direto e quanto ao eco, onde os efeitos soam (e quanto deles soa no topo) e quanto dura o eco |
|                   | `DESVIO`                                | Quanto tudo desce de tom no mergulho, e quanto sobe na volta                        |
|                   | `ONDA` e `TOQUE`                        | O chirp do clique e o arpejo do mouse                                               |
|                   | `SILENCIO`                              | Em que parte do mergulho o som se cala                                              |
|                   | `PORTA` e `CORTE`                       | Em quanto tempo um efeito se abre quando começa de fato, e em quanto tempo o fundo some na volta ao topo |
| `som/index.ts`    | `TAXA` e `LATENCIA`                     | A taxa em que o som é feito e quanto som o navegador prepara adiantado              |
|                   | `SUMIR`                                 | Quanto o som leva para sumir antes de o áudio parar                                 |
| `som/regente.ts`  | `RAPIDEZ`                               | A velocidade de rolagem em que a sucção, os jatos e o ar da queda soam inteiros     |
|                   | `ENTRE_TOQUES`                          | O menor intervalo entre dois tiques do mouse                                        |
|                   | `REGER`                                 | De quanto em quanto tempo os próximos compassos são agendados                       |

</details>

## Desempenho

### O que mantém o efeito leve

- O código do efeito só é baixado depois que a página carrega, e a animação pausa com a aba escondida.
- As fatias ficam prontas antes da hora: rolando, cada quadro gasta no máximo meio milissegundo com as que ainda não vão aparecer.
- Cada fatia é só um retângulo com um pedaço de uma imagem já decodificada, então quase não custa para criar nem para desenhar. As que a rolagem deixou para trás saem da página (paradas ali, escondidas, pesavam em todo quadro em que o navegador repinta algo).
- As fatias de cada bloco ficam num grupo só delas na camada, com a foto numa variável CSS do grupo: trocar a foto é mudar uma propriedade só. As que atravessam a faixa com o puxão inteiro dividem os mesmos quadros-chave, calculados uma vez.
- A fatia que sai por trás e cabe num lugar à frente só muda o trecho da animação, o que é bem mais barato que criar outra.
- Cada fatia é desenhada uma vez, no tamanho dela (`will-change`), e o navegador só a encolhe a caminho do buraco negro, em vez de redesenhá-la a cada mudança de escala.
- As telas dos vídeos ficam soltas dentro da fatia, sem recorte: um recorte numa fatia deformada faria a placa de vídeo desenhar à parte, a cada quadro, tudo o que tem camada própria dentro dele. Elas só recebem os quadros do vídeo enquanto a fatia está na faixa, e a frente do vídeo só é desenhada nas telas que ela cruza.
- As fotos de todos os blocos são feitas no começo, com o tempo que sobra entre os quadros, e depois só quando o original muda.
- A barra do navegador do celular, que some e volta conforme a rolagem, muda a altura da janela, mas não a da absorção: a faixa, a força do puxão e o trajeto do buraco negro usam a altura da tela grande (`100lvh`, a da tela com a barra escondida, medida por uma régua invisível), que só muda quando o celular gira ou a janela muda de tamanho. Antes, cada ida ou volta da barra refazia todas as fatias: num celular emulado, uns 23 ms de JavaScript na thread principal e, com a CPU 4 vezes mais lenta, uns 115 ms (agora, uns 6 ms).
- Desenhar o buraco negro custa pouco em qualquer tamanho, já que nenhum raio é traçado depois do mapa: o mergulho, em que ele cobre a tela inteira, pesa o mesmo que o canto, sem perder resolução.
- O som, para quem o liga, é feito numa thread própria do navegador, a 24 kHz, com uns 3,5% de um núcleo: a página só manda alvos para ele seguir enquanto a rolagem anda, uns 9 µs por quadro, e no celular o coro fica mais leve.

### Números medidos

| Situação                                                                | Thread principal                                      | Antes                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Rolando devagar pelos projetos com o botão do meio, numa tela de 144 Hz | Uns 85 quadros/s, com o buraco negro em uns 139       | 40 a 55 quadros/s, com cópias vivas de cada bloco em cada fatia, que pesavam no estilo, no layout e na pintura |
| Rolando mais rápido pelos projetos, a uns 200 px/s                      | 90 a 115 quadros/s                                    | 35 a 45 quadros/s, com a máscara nas fatias                                                           |

### Limites conhecidos

- Com outro programa ocupando a mesma placa de vídeo (um papel de parede animado, por exemplo), a placa chega ao limite, e a thread principal cai para uns 25 a 28 quadros por segundo (eram uns 20) sem estar ocupada, só esperando por ela. A rolagem, a tira e os vídeos dela não sofrem (os vídeos vêm do pintor), e o buraco negro continua sendo desenhado no ritmo da tela.
- Rolando rápido demais pela rolagem do navegador (o teclado, inclusive o Enter num link), alguma fatia pode ainda não ter sido desenhada, deixando um trecho da faixa vazio por um instante. Com a roda e o dedo, a rolagem suave não deixa a página correr à frente da absorção.
- Numa pausa longa da thread principal (um ou dois décimos de segundo, que às vezes acontecem quando a placa de vídeo segura os quadros da página), o motor fica sem notícias da rolagem, e o buraco negro para até ela voltar.
- O espaço do mergulho deixa a página mais alta, e o Chrome, em páginas mais altas que a tela mais uns 8000 px, repinta a página por trechos enquanto ela rola. No computador, isso custa cerca de meio milissegundo por quadro (no celular, a página já passava desse tamanho antes).

### Medindo a fluidez

`npm run medir` abre o build num Chrome ou Edge instalado, sem janela, e percorre a página em tela de desktop e de celular, sem limitação e com a CPU 4 e 6 vezes mais lenta.

```bash
npm run build   # o script mede o build, e não o servidor de desenvolvimento
npm run medir   # todas as telas e CPUs, com as fases padrão
npm run medir -- --rotulo depois-do-x --cpu 1,6 --telas celular --fases constante,rajadas
```

| Fase                 | O que faz                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `constante`          | Do topo ao fim do conteúdo, numa velocidade fixa                                                       |
| `rajadas`            | Trancos rápidos de rolagem, com pausas entre eles                                                      |
| `mergulho`           | Do fim do conteúdo até a volta ao topo, com a entrada do site                                          |
| `parado`             | Alguns segundos parado nos projetos, com os vídeos tocando                                             |
| `barra` e `semBarra` | A barra de endereço do celular sumindo e voltando no meio da rolagem, e o mesmo sem ela (só quando pedidas em `--fases`) |
| `logo`               | A rolagem logo que a página abre, antes de as fotos dos blocos ficarem prontas (só quando pedida em `--fases`) |

Para cada caso, o script registra:

- o intervalo entre quadros (p50, p95, p99 e quantos passam de 16,7 ms e de 33 ms);
- as tarefas longas e quanto a thread principal ficou ocupada;
- o tempo de estilo, layout e pintura por quadro, e os layouts forçados pelo JavaScript;
- os quadros do compositor perdidos ou sem rasterizar;
- o ritmo do motor do buraco negro;
- se o modo lento foi ativado.

Os números vão para `medicoes/<rótulo>.json`. Com `--css`, dá para comparar uma mudança de estilo sem mexer no código; com `--raiz`, dá para medir o build de outro checkout (uma versão anterior, por exemplo). As demais opções estão no começo de `scripts/medir-animacao.mjs`.

## Deploy

O deploy é automático. A cada push na branch `main`, o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) instala as dependências, gera o site (com o currículo em PDF, impresso pelo Chrome que já vem no runner) e publica a pasta `dist/` no GitHub Pages. O andamento de cada publicação aparece na aba **Actions**, onde também dá para disparar o deploy manualmente.

> [!IMPORTANT]
> **Configuração necessária, uma única vez:** no repositório, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions** em **Source**. Sem isso, o Pages continua publicando os arquivos da branch diretamente, e não o site gerado.

O endereço do site usado nas meta tags (`VITE_SITE_URL`) fica no `.env`. No deploy, o workflow usa o caminho e o endereço reais do Pages, então o build continua certo mesmo se o repositório for renomeado ou ganhar um domínio próprio.

## Estrutura do projeto

```
.
├── .github/
│   ├── readme/                    # imagens deste README
│   └── workflows/deploy.yml       # build e deploy no GitHub Pages
├── assets/                        # fotos originais (não vão para o site)
├── medicoes/                      # resultados do npm run medir
├── public/                        # arquivos copiados como estão (favicon, prévias de compartilhamento)
├── scripts/
│   ├── curriculo.mjs              # imprime o currículo em PDF
│   ├── medir-animacao.mjs         # mede a fluidez das animações
│   ├── optimize-images.mjs        # gera as versões otimizadas da foto
│   └── prerender.mjs              # insere o HTML de cada página em dist/ e gera o PDF
├── src/
│   ├── assets/                    # imagens e vídeos otimizados usados pelo site
│   ├── components/                # seções e componentes da página
│   ├── curriculo/                 # modelo e estilo do currículo em PDF
│   ├── data/                      # conteúdo do portfólio e do currículo
│   ├── hooks/                     # hooks do React
│   ├── i18n/                      # idiomas e textos fixos da interface
│   ├── lib/                       # utilitários
│   │   ├── buracoNegro/           # o buraco negro do fundo (WebGL)
│   │   └── som/                   # os efeitos sonoros (Web Audio)
│   ├── index.css                  # tema e estilos globais
│   ├── main.tsx                   # entrada no navegador (português e inglês)
│   ├── main-404.tsx               # entrada da página de erro
│   └── entry-server.tsx           # entrada usada na pré-renderização
├── index.html                     # página principal (português)
├── en/index.html                  # versão em inglês
├── 404.html                       # página de erro
└── vite.config.ts
```

<details>
<summary><strong>O que cada arquivo do buraco negro faz</strong></summary>

<br>

| Arquivo                       | Papel                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `index.ts`                    | Liga o efeito à página: a faixa, a absorção, a rolagem suave, a foto do topo e o motor    |
| `absorcao.ts`                 | A absorção: as fatias, as animações presas à rolagem e a agenda das fotos                 |
| `fotos.ts`                    | As fotos dos blocos e a foto do topo do site                                              |
| `faixa.ts`                    | As contas da faixa de absorção, as mesmas na página e no motor                            |
| `rolagem.ts`                  | As animações presas à rolagem (`ViewTimeline` e `ScrollTimeline`)                         |
| `rolagemSuave.ts`             | A rolagem suave da roda, do dedo e dos links                                              |
| `telas.ts` e `pintor.ts`      | As telas dos vídeos da tira e o worker que desenha nelas                                  |
| `ponte.ts` e `trabalhador.ts` | A ponte entre a página e o worker do motor                                                |
| `motor.ts`                    | O laço que desenha o buraco negro, quadro a quadro                                        |
| `renderizador.ts`             | Os programas WebGL: o mapa dos raios e o desenho de cada quadro                           |
| `trajeto.ts`                  | Onde o buraco negro está, de que tamanho e de que ângulo, em cada pixel de rolagem        |
| `mergulho.ts`                 | O mergulho: o véu, a janela sem o motor, o cabeçalho e a volta ao topo                    |
| `entrada.ts`                  | A curva da entrada, a mesma na página e no motor                                          |
| `geodesicas.frag`             | O mapa dos raios, traçado uma vez                                                         |
| `nevoa.frag`                  | Passa a névoa do mapa para uma textura que a placa de vídeo interpola                     |
| `disco.frag`                  | O gás do disco, girando sobre o mapa                                                      |
| `cena.glsl`                   | A cena: a sombra, o anel de luz, o halo, a malha, os jatos e a massa do mouse             |
| `composicao.frag`             | O desenho da tela fora do mergulho e da entrada                                           |
| `queda.frag`                  | A vista de quem cai                                                                       |
| `entrada.frag`                | O site chegando pela janela redonda                                                       |
| `comum.glsl`                  | Constantes e funções comuns aos shaders                                                   |

E os do som, em `src/lib/som/`:

| Arquivo       | Papel                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------- |
| `index.ts`    | O botão liga e desliga por aqui: a escolha guardada, o contexto de áudio e o resto sob pedido |
| `regente.ts`  | Acompanha a página (a rolagem, o mergulho, a volta ao topo, o mouse, o tema) e conduz os sons |
| `sintese.ts`  | A música (o coro, as seções, a harmonia) e os efeitos, de osciladores, ruído e filtros, sem saber nada da página |

</details>

## Contato

Se quiser conversar sobre um projeto, uma oportunidade ou sobre o próprio site, me chame no [LinkedIn](https://www.linkedin.com/in/alexsandro-ferreira-da-silva-6914b6317) ou pela [seção de contato do site](https://alexsandrofde.github.io/Portfolio/#contato).

<br>

<div align="center">
<sub>Feito por Alexsandro Ferreira da Silva, em Fortaleza, CE.</sub>
</div>
