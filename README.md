# Portfólio de Alexsandro Ferreira da Silva

Portfólio e currículo online, em português e em inglês: apresentação, projetos, trajetória, habilidades e contato, com o currículo também em PDF.

**Acesse:** [alexsandrofde.github.io/Portfolio](https://alexsandrofde.github.io/Portfolio/) · em inglês: [alexsandrofde.github.io/Portfolio/en](https://alexsandrofde.github.io/Portfolio/en/)

## Tecnologias

- **React 19** e **TypeScript**
- **Vite 8** para desenvolvimento e build
- **Tailwind CSS 4** para os estilos, com tema claro e escuro
- **WebGL 2** para o buraco negro animado no fundo da página (shaders próprios, sem bibliotecas), desenhado num **Web Worker** com `OffscreenCanvas`
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

No fundo da página há um buraco negro animado, desenhado em WebGL. O caminho da luz em volta dele é traçado uma vez só, antes de ele aparecer: para cada ponto da imagem, o shader `src/lib/buracoNegro/geodesicas.frag` segue o raio de luz de trás para a frente, na trajetória curva em volta do buraco negro, e guarda num mapa onde ele cruzou o disco de gás e quanto de névoa atravessou. Daí a sombra, o anel de luz e o disco, visto quase de lado, como em Interstellar: uma faixa fina que passa na frente da sombra, enquanto a luz da parte de trás dele, dobrada pela gravidade, contorna a sombra por cima e por baixo, em arcos. A parte de baixo do disco só aparece por baixo da de cima: o arco que contorna a sombra por baixo não continua subindo rente a ela, acima da faixa da frente. A malha quadriculada da apresentação também é desenhada com ele (`composicao.frag`), curvada pela gravidade. No tema escuro o disco brilha na cor de destaque; no claro vira uma gravura em nanquim.

No topo da página ele fica no canto de cima à direita, logo abaixo do cabeçalho, com cerca de um terço à vista, como algo muito distante (a malha fica numa camada intermediária). Ao longo da página, no mesmo ritmo da rolagem, ele anda pelo alto da tela até chegar ao meio dela no fim do conteúdo e cresce, cada vez mais perto, até três vezes o tamanho; o ponto mais baixo dele fica parado na mesma altura, e o resto cresce para cima e para os lados. Só o conteúdo que sobe até uma faixa estreita logo abaixo do cabeçalho é absorvido: cada linha dele que entra na faixa é puxada até o buraco negro, devagar no começo e cada vez mais rápido, ficando mais estreita e esmaecendo na mesma medida (inteira na borda da faixa, quase invisível perto do centro), e some de vez ao cruzar a borda da sombra: nada aparece dentro dela. As linhas de cima vão na frente e as de baixo ainda estão presas à página, então o conteúdo se alonga numa tira contínua que sai da página e entra no buraco negro (a "espaguetificação"). Um bloco alto, como um cartão de projeto, é engolido parte por parte: só o trecho dele que já está na faixa é puxado, e o resto continua no lugar até chegar a sua vez. Cada bloco mira o ponto em que o buraco negro está quando o meio do bloco cruza a faixa: todas as fatias dele vão ao mesmo ponto (e a tira não se parte), e, como o buraco negro anda devagar, a tira chega a esse ponto já dentro da sombra. Quanto cada bloco já foi absorvido depende só de onde ele está na tela, e o desenho de cada posição da rolagem é calculado de antemão: rolando devagar ou rápido, com a roda do mouse, o botão do meio, o toque ou o teclado, cada posição da página mostra sempre a mesma imagem, como um filme que a rolagem avança e volta. Com a página parada, o que estava no meio do caminho continua ali, e rolando para cima o conteúdo é cuspido de volta pelo mesmo caminho. Tudo muda de forma contínua com a rolagem. O disco reage ao sentido dela, e não à velocidade: enquanto a página desce ele esquenta e gira um pouco mais rápido, enquanto sobe saem os jatos, e ele acompanha com um pequeno atraso, sem pulsar a cada tranco da roda. Os blocos são os que já têm animação de entrada (`Reveal` e `.enter`); a lógica fica em `src/lib/buracoNegro/absorcao.ts`.

Como uma transformação CSS deforma um elemento inteiro de um jeito só, o trecho de cada bloco que está na faixa é desenhado por cópias dele, uma para cada fatia de uns 10 px (sempre um número inteiro de pixels da tela), cada uma recortada na sua fatia e deformada no seu trapézio; as bordas de fatias vizinhas coincidem, e a tira sai contínua. As cópias ficam numa camada fixa no alto da tela, sem foco, clique ou leitor de tela, por cima de uma cortina: um canvas que cobre a faixa com o fundo da página, o buraco negro e a malha (copiados do canvas do fundo a cada desenho). O bloco original não sai do lugar nem muda, nada nele depende da rolagem: ele só passa por trás da cortina, que o corta exatamente na beira da faixa. Quem move as cópias é o navegador, e não o JavaScript: cada uma tem uma animação presa à rolagem (`ScrollTimeline`, em `src/lib/buracoNegro/rolagem.ts`), com um quadro-chave para cada pixel da tela que a página rola enquanto a fatia atravessa a faixa, e cada quadro vale até o próximo, sem interpolação (entre duas perspectivas o navegador interpola mal, e o trapézio saía torto). A rolagem corre fora do JavaScript, que chega a ficar um quadro ou mais para trás dela; as animações correm junto com ela, na mesma etapa, e a tira não se descola do original na beira da cortina, por mais rápida que seja a rolagem. O esmaecimento é uma máscara da camada, que vai apagando o conteúdo conforme a altura, já que a altura de cada linha na faixa diz o quanto ela já foi puxada; abaixo da faixa a camada ainda desce três fatias, sem nada à vista, onde as cópias esperam a vez já desenhadas. As linhas soltas da página (a borda de cima das seções e das listas) também são absorvidas, como blocos de uma fatia só, e os títulos fixos das seções, que param dentro da faixa, ficam por cima da cortina.

Ao JavaScript resta preparar as cópias antes de a página chegar a elas e fazê-las acompanhar o original em tudo o que muda sem rolagem, para nada se partir entre ele e a tira: nos vídeos, cada cópia desenha numa tela, por cima dela, a parte do quadro atual que cai na sua fatia (com os cantos arredondados do cartão), a cada quadro novo, e todas ficam sempre no mesmo quadro que o original; o que fica na frente do vídeo, como o botão de pausa, vai em cópias à parte, por cima das telas; o mouse em cima muda as cópias junto, as animações andam no mesmo ritmo e, quando o React redesenha algo dentro do bloco (o ícone de um vídeo que pausou, por exemplo), as cópias são refeitas na hora (só as da frente do vídeo, se a mudança foi só ali). Um bloco com o foco do teclado passa para a frente da cortina e fica inteiro no lugar até o foco sair dele. Onde o navegador ainda não tem `ScrollTimeline`, o JavaScript leva as animações à rolagem a cada quadro: o desenho é o mesmo, mas rolando rápido ele pode chegar um quadro atrasado.

Como o alto da tela passa a ser do buraco negro, os links do menu levam cada seção para logo abaixo da faixa de absorção, e não para o topo: o JavaScript calcula essa altura e a passa ao `scroll-padding-top` do `index.css` (a variável `--topo-livre`). Sem o efeito, vale a distância padrão.

O gás do disco gira com a velocidade de cada órbita (mais rápido perto do centro) sem que o desenho se enrole com o tempo: cada anel da textura gira inteiro e desliza sobre os vizinhos, e a rotação fecha um ciclo exato a cada três horas, mais ou menos. A rotação não pede traçar raio nenhum: a cada quadro, `disco.frag` só põe o gás, na posição em que a rotação o deixou, sobre os pontos do disco que o mapa guarda, com o brilho de cada um (o efeito Doppler e o desvio gravitacional também vêm prontos do mapa).

Tudo o que o buraco negro mostra é calculado de antemão, e a animação só lê o que já está pronto: o mapa dos raios (traçado em oito faixas, uma por quadro, antes de o buraco negro aparecer, e que serve a todos os tamanhos dele, do canto ao mergulho), o trajeto dele pela página e pelo mergulho (a posição, o tamanho e o ângulo da câmera para cada pixel de rolagem, tabelados em `trajeto.ts`) e a rotação do disco, que é o gás deslizando sobre o mapa. Quem desenha é um worker (`trabalhador.ts`, que roda `motor.ts`), com o canvas do fundo e a cortina transferidos para ele (`ponte.ts`): o laço de quadros dele corre fora da thread principal, e nada do que pesa nela (as cópias da absorção, os vídeos, o React) atrasa um quadro do buraco negro, que gira e anda no ritmo da tela, como a rolagem. A página só manda para ele a rolagem de cada quadro seu, que, com a página pesada, pode chegar na metade do ritmo da tela: o motor desenha a rolagem de um instante antes, entre duas notícias que já tem, suavizada, e o buraco negro e a malha andam lisos, sem passar do ponto quando a rolagem para. Onde não há worker com OffscreenCanvas, o mesmo motor roda na thread principal.

A página não acaba no rodapé: a rolagem continua por um espaço vazio (`Dive.tsx`), um laço sem fim. Na primeira tela dele a página sai toda de vista; depois, no trecho do mergulho, cai-se no buraco negro. Ele, que chegou ao meio do alto da tela já grande, desce até o meio dela e continua crescendo, cada vez mais rápido, inteiro à vista (os arcos de luz por cima e por baixo da sombra), até a sombra preencher a tela inteira (a malha cresce junto, em volta dele). A vista é a de quem cai (`queda.frag`): o espaço em volta da sombra se torce num redemoinho, no sentido em que o disco gira, e a faixa do disco se enrosca nela; as coisas correm para fora a partir do meio da tela, em rastros que se alongam quanto mais depressa se cai e quanto mais rápida a rolagem; grãos de poeira passam por quem cai, em perspectiva, cada vez mais depressa; a luz se separa em cores nas bordas, como numa lente forte; a visão se fecha num túnel, escurecendo as bordas; no tema escuro a luz de fora fica mais azul e mais forte; perto do horizonte a vista treme; e o cabeçalho é puxado para dentro e some. A cena é desenhada numa textura um pouco maior que a tela, e a queda só a lê em outros pontos: nenhum raio é traçado, e o mergulho custa no motor o mesmo que o resto da página. Perto do fim, a tela passa a mirar acima do centro da sombra, para a faixa do disco que a cruza sair por baixo e sobrar só o preto, e um véu preto preso à rolagem apaga o que sobra, cabeçalho incluído.

Aí estamos dentro dele: a página volta ao topo, e no escuro acende-se, no meio da tela, um ponto de luz. Ele se abre numa janela redonda, com a borda brilhando como o anel em volta da sombra, e por ela aparece o topo do site, minúsculo, lá no fundo de um túnel de luz: riscos que correm para fora em perspectiva, cada vez mais depressa, torcidos em hélice e desenrolando como quem sai de um redemoinho (os mesmos da poeira da queda, agora como paredes). O site vem chegando (o cabeçalho e o conteúdo crescem a partir do meio da tela, recortados à primeira tela) enquanto a janela cresce em volta dele, até sair da tela; o buraco negro, já de volta ao canto, atrás do site, aparece pela janela quando ela chega lá. O navegador anima o cabeçalho e o conteúdo, e o motor desenha o túnel e a janela atrás deles (`entrada.frag`), os dois a partir do mesmo instante e pela mesma curva (`entrada.ts`): andam juntos sem que nenhum espere o outro. O véu da página segura o preto até o motor avisar que o túnel já está na tela. O site só cresce, sem girar e sem aparecer aos poucos: girado, o recorte à primeira tela deixava de ser um retângulo alinhado à tela, e uma opacidade animada no conteúdo inteiro também pesava, e o navegador travava uns dois décimos de segundo na primeira entrada. Durante a entrada a rolagem fica travada, para o embalo da roda ou do dedo não levar o topo embora, e de lá não há para onde subir. Como a absorção, o mergulho depende só da posição da rolagem, e rolando para cima ele volta atrás; só a entrada anda no tempo. Sem WebGL ou num aparelho lento, o buraco negro não mergulha, mas o véu escurece a tela do mesmo jeito e a janela se abre num furo dele, sem o túnel; com o movimento reduzido, o topo só volta com um fade. Sem JavaScript, o espaço não existe. A lógica fica em `src/lib/buracoNegro/mergulho.ts` (o véu, a janela sem o motor, o cabeçalho e a volta ao topo), na função `posicaoEm` de `trajeto.ts` (o buraco negro) e em `entrada.ts` (a curva da entrada).

Para ajustar: o quanto do buraco negro fica à vista é a constante `CANTO`, o ângulo de onde ele é visto é `INCLINACAO`, o quanto ele cresce ao longo da página é `ZOOM_PAGINA` (com o ponto mais baixo dele, `BASE`, parado) e o mergulho é `MERGULHO`, em `src/lib/buracoNegro/trajeto.ts`; a altura da faixa de absorção é a função `faixa`, o quanto da página fica preparado de antemão são `ANTECEDENCIA`, `FOLGA` e `AQUECER`, e a resolução do mapa dos raios é `MAPA`, em `index.ts`; o tamanho do espaço depois do rodapé é a classe `.mergulho` do `index.css`; quando o véu escurece a tela e quando o cabeçalho é puxado são `VEU` e `CABECALHO`, em `mergulho.ts`; a força dos rastros da queda é `RASTRO`, em `motor.ts`; e a duração da entrada, de que tamanho o site aparece lá dentro, a torção do túnel e a margem da janela são `ENTRADA`, em `entrada.ts`.

Para não pesar: o código do efeito só é baixado depois que a página carrega, a animação pausa com a aba escondida e as cópias ficam prontas antes da hora, a maior parte com a página parada (rolando, cada quadro gasta no máximo meio milissegundo com as que ainda não vão aparecer). Os blocos que a rolagem está para trazer já têm guardadas, escondidas, todas as cópias que vão usar, e quando a página chega perto só falta prendê-las à rolagem; os que ela deixou para trás guardam poucas, e os que ficaram longe as perdem. As cópias guardadas saem do desenho (`content-visibility: hidden`), as de cada bloco ficam num grupo só delas na camada (assim o navegador não percorre todas a cada quadro), e as fatias de um bloco que atravessam a faixa com o puxão inteiro dividem os mesmos quadros-chave, calculados uma vez. As telas dos vídeos ficam fora do recorte de cada cópia (um recorte numa cópia deformada faria a placa de vídeo desenhar à parte, a cada quadro, tudo o que tem camada própria dentro dele, e com dezenas de cópias a página travava ao rolar devagar pelos projetos) e só recebem os quadros do vídeo quando estão perto de aparecer. O que sobra de custo: perto dos projetos, as cópias somam de alguns milhares a pouco mais de dez mil elementos à página e, rolando rápido, a thread principal fica mais ocupada (lá ela chega a cair para uns 60 a 70 quadros por segundo numa tela de 144 Hz; os vídeos das cópias podem andar aos trancos, mas a rolagem, a tira e o buraco negro, não), e rolando rápido demais o navegador pode ainda não ter desenhado alguma cópia, deixando um trecho da faixa vazio por um instante. Numa pausa longa da thread principal (um ou dois décimos de segundo, que às vezes acontecem quando a placa de vídeo segura os quadros da página), o motor fica sem notícias da rolagem e o buraco negro para até ela voltar. Desenhar o buraco negro custa pouco em qualquer tamanho dele, já que nenhum raio é traçado depois do mapa: o mergulho, em que ele cobre a tela inteira, pesa o mesmo que o canto, sem perder resolução. O espaço do mergulho deixa a página mais alta, e o Chrome, em páginas mais altas que a tela mais uns 8000 px, repinta a página por trechos enquanto ela rola: no computador isso custa cerca de meio milissegundo por quadro (no celular, a página já passava desse tamanho antes). A resolução cai sozinha em aparelhos que não dão conta do desenho (julgado pelo próprio motor, fora da thread principal), e quem ativou "reduzir movimento" no sistema (ou tem um aparelho lento demais para o desenho ou para a absorção) vê o buraco negro parado no alto da página, sem absorção. Para decidir que o aparelho não dá conta, conta o quadro típico de cada segundo (a mediana), e não a média: engasgos isolados, como os de um ou dois segundos que o Windows às vezes tem ao reorganizar a composição da tela quando um vídeo começa a tocar, não desligam o efeito. Sem WebGL 2, fica a malha em CSS de antes.

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
