import banho from '../../assets/projects/nosso-cantinho/banho.webp'
import banhoPequena from '../../assets/projects/nosso-cantinho/banho-640.webp'
import cozinha from '../../assets/projects/nosso-cantinho/cozinha.webp'
import cozinhaPequena from '../../assets/projects/nosso-cantinho/cozinha-640.webp'
import quarto from '../../assets/projects/nosso-cantinho/quarto.webp'
import quartoPequena from '../../assets/projects/nosso-cantinho/quarto-640.webp'
import type { ImageMedia, ProjectDetails } from '../projects.ts'

const quartoImagem: ImageMedia = {
  kind: 'image',
  src: quarto,
  srcSmall: quartoPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'O pet, um dragãozinho verde de gravata, no quarto, ao lado da caminha, com a janela e o relógio na parede.',
    en: 'The pet, a little green dragon in a tie, in the bedroom next to its bed, with the window and a clock on the wall.',
  },
  caption: { pt: 'O quarto, onde ele recebe carinho, dorme e sonha.', en: 'The bedroom, where it gets petted, sleeps and dreams.' },
}

const cozinhaImagem: ImageMedia = {
  kind: 'image',
  src: cozinha,
  srcSmall: cozinhaPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'O dragãozinho na cozinha, comendo, com a geladeira e o fogão ao fundo.',
    en: 'The little dragon in the kitchen, eating, with the fridge and the stove behind it.',
  },
  caption: { pt: 'A cozinha: a comida voa até a boca dele.', en: 'The kitchen: the food flies right into its mouth.' },
}

const banhoImagem: ImageMedia = {
  kind: 'image',
  src: banho,
  srcSmall: banhoPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'O dragãozinho no banheiro, coberto de espuma, com a barra de higiene subindo no alto.',
    en: 'The little dragon in the bathroom, covered in soap foam, with the hygiene bar going up at the top.',
  },
  caption: { pt: 'O banho de espuma, com a barra de higiene subindo.', en: 'Bath time with soap foam, as the hygiene bar goes up.' },
}

const nossoCantinho: ProjectDetails = {
  intro: {
    pt: 'Um site-presente, full-stack e privado, feito para eu e a minha noiva usarmos juntos e em tempo real: o que um faz (um recado, o humor do dia, um desenho, uma música, um cuidado com o pet) aparece na hora na tela do outro. O centro de tudo é um pet virtual do casal que é praticamente um jogo completo, com o estado guardado no servidor, que é quem decide.',
    en: "A private full-stack gift website for my fiancée and me to use together, in real time: whatever one of us does (a note, today's mood, a drawing, a song, taking care of the pet) shows up instantly on the other's screen. At its heart is the couple's virtual pet, which is practically a full game, with its state kept on the server, which has the final say.",
  },
  sections: [
    {
      title: { pt: 'O pet', en: 'The pet' },
      items: [
        {
          pt: 'Nasce de um ovo, numa de 5 espécies, passa por 4 estágios e tem 4 necessidades (fome, alegria, energia e higiene) que caem com o tempo real. Sujo, ele aparece com manchas, cheiro e moscas.',
          en: 'It hatches from an egg as one of 5 species, grows through 4 stages and has 4 needs (hunger, joy, energy and hygiene) that drop in real time. When dirty, it shows stains, a smell and flies.',
        },
        {
          pt: 'Uma casa com 3 cômodos animados: na cozinha a comida voa até a boca, no banheiro tem banho de espuma e toalha, e no quarto ele recebe carinho com o dedo, dorme quando a cortina fecha e sonha em nuvenzinhas. A janela mostra o clima real.',
          en: 'A house with 3 animated rooms: in the kitchen the food flies to its mouth, in the bathroom there are bubble baths and a towel, and in the bedroom it gets petted with a finger, sleeps when the curtain closes and dreams in little clouds. The window shows the real weather.',
        },
        {
          pt: 'Um mundo com 17 lugares (quintal, praça e 4 lojinhas): o pet é um só, anda até onde a ação acontece pelo caminho mais curto, e os dois o veem no mesmo lugar.',
          en: 'A world with 17 places (a yard, a square and 4 little shops): there is a single pet, it walks to wherever the action is along the shortest path, and both of us see it in the same spot.',
        },
        {
          pt: '6 minijogos: 4 solo, que o outro assiste ao vivo, e 2 duelos em tempo real (um por turnos e um pingue-pongue).',
          en: '6 minigames: 4 single-player ones the other can watch live, and 2 real-time duels (one turn-based and a ping-pong match).',
        },
        {
          pt: 'Progressão de longo prazo: níveis, moedas, loja, decoração, missões diárias do casal e, ao renascer, 52 melhorias permanentes em 9 árvores.',
          en: 'Long-term progression: levels, coins, a shop, decorations, daily missions for the couple and, after each rebirth, 52 permanent upgrades across 9 trees.',
        },
      ],
      media: [quartoImagem, cozinhaImagem, banhoImagem],
    },
    {
      title: { pt: 'Para o casal', en: 'For the two of us' },
      items: [
        {
          pt: 'Quem está online, um botão que faz chover corações na tela do outro, humor do dia, recados, lista de sonhos, mural de fotos, um cineminha e a localização ao vivo.',
          en: "Who is online, a button that makes hearts rain on the other's screen, mood of the day, notes, a dream list, a photo wall, a little movie room and live location.",
        },
        {
          pt: 'Uma lousa colaborativa ao vivo, com imagens que dá para mover, girar, recortar e tirar o fundo no próprio navegador.',
          en: 'A live collaborative whiteboard, with images that can be moved, rotated, cropped and have their background removed right in the browser.',
        },
        {
          pt: 'Um player de música sincronizado e um mapa das estrelas com o céu real da noite do noivado, calculado com fórmulas de astronomia.',
          en: 'A synchronized music player and a star map with the real sky of the night we got engaged, computed with astronomy formulas.',
        },
        {
          pt: 'O planejamento do casamento: convidados, orçamento, datas e tarefas, com convites desenhados em canvas, um QR code de confirmação de presença e uma página pública que atualiza a lista dos noivos ao vivo.',
          en: 'Wedding planning: guests, budget, dates and tasks, with invitations drawn on canvas, an RSVP QR code and a public page that updates our guest list live.',
        },
      ],
    },
    {
      title: { pt: 'Tempo real', en: 'Real time' },
      paragraphs: [
        {
          pt: 'Um único gateway de WebSocket (Socket.IO), autenticado pelo mesmo cookie do login, com 45 eventos tipados. No front, os eventos atualizam o cache do TanStack Query num lugar só. No pingue-pongue, quem convidou simula a física e transmite uns 20 quadros por segundo, e o outro aparelho prevê o movimento da bola; no duelo por turnos, os dois aparelhos aplicam as mesmas regras e chegam ao mesmo resultado, sem o servidor arbitrar.',
          en: 'A single WebSocket gateway (Socket.IO), authenticated by the same login cookie, with 45 typed events. On the front end, the events update the TanStack Query cache in a single place. In ping-pong, whoever sent the invite simulates the physics and streams about 20 frames per second while the other device predicts the ball; in the turn-based duel, both devices apply the same rules and reach the same result, with no server refereeing.',
        },
      ],
    },
    {
      title: { pt: 'Arquitetura', en: 'Architecture' },
      items: [
        {
          pt: 'Monorepo em TypeScript com três pacotes: a API em NestJS, o site em React e um pacote compartilhado com os tipos, os contratos de socket e as regras puras do pet, usadas igualmente pelo servidor e pelo navegador.',
          en: "A TypeScript monorepo with three packages: the NestJS API, the React site and a shared package with the types, the socket contracts and the pet's pure rules, used the same way by the server and the browser.",
        },
        {
          pt: 'O pet no servidor em três camadas: um motor só de funções puras, a infraestrutura (salvamento e agendadores) e o serviço que orquestra os dois. Saves antigos são migrados sozinhos.',
          en: 'The pet on the server in three layers: an engine made only of pure functions, the infrastructure (persistence and schedulers) and the service that orchestrates both. Old saves are migrated automatically.',
        },
        {
          pt: 'Nenhuma imagem de arte em arquivo: o pet, os cômodos e as lojas são SVG e canvas desenhados em código. O PDF, o ZIP e o QR code dos convites também foram escritos à mão, sem bibliotecas.',
          en: 'Not a single art image file: the pet, the rooms and the shops are SVG and canvas drawn in code. The PDF, ZIP and QR code for the invitations were also written by hand, with no libraries.',
        },
        {
          pt: 'Segurança e deploy: JWT em cookie httpOnly, limite de tentativas no login, Docker com Caddy (HTTPS automático) numa VM na nuvem, e GitHub Actions para o deploy a cada push, o backup diário e a restauração.',
          en: 'Security and deployment: JWT in an httpOnly cookie, login rate limiting, Docker with Caddy (automatic HTTPS) on a cloud VM, and GitHub Actions for deploying on every push, daily backups and restores.',
        },
      ],
    },
    {
      title: { pt: 'Em números', en: 'By the numbers' },
      items: [
        { pt: '235 commits em cinco meses, até a versão 3.0.', en: '235 commits over five months, up to version 3.0.' },
        { pt: 'Cerca de 46 mil linhas de TypeScript no front, das quais o pet ocupa 153 arquivos.', en: 'About 46,000 lines of TypeScript on the front end, with the pet taking up 153 files.' },
        { pt: '152 casos de teste automatizados no back-end, com testes de snapshot do pet.', en: '152 automated test cases on the back end, including snapshot tests for the pet.' },
        { pt: 'Só 6 dependências de produção no front.', en: 'Only 6 production dependencies on the front end.' },
      ],
    },
  ],
}

export default nossoCantinho
