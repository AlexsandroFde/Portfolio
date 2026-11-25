import curvas from '../../assets/projects/beka/curvas.webp'
import curvasPequena from '../../assets/projects/beka/curvas-640.webp'
import dancinha from '../../assets/projects/beka/dancinha.mp4'
import dancinhaPoster from '../../assets/projects/beka/dancinha.webp'
import dancinhaPosterPequeno from '../../assets/projects/beka/dancinha-640.webp'
import ilustracao from '../../assets/projects/beka/ilustracao.webp'
import ilustracaoPequena from '../../assets/projects/beka/ilustracao-640.webp'
import musica from '../../assets/projects/beka/musica.mp4'
import musicaPoster from '../../assets/projects/beka/musica.webp'
import musicaPosterPequeno from '../../assets/projects/beka/musica-640.webp'
import pulinho from '../../assets/projects/beka/pulinho.mp4'
import pulinhoPoster from '../../assets/projects/beka/pulinho.webp'
import pulinhoPosterPequeno from '../../assets/projects/beka/pulinho-640.webp'
import soneca from '../../assets/projects/beka/soneca.mp4'
import sonecaPoster from '../../assets/projects/beka/soneca.webp'
import sonecaPosterPequeno from '../../assets/projects/beka/soneca-640.webp'
import type { ImageMedia, ProjectDetails, VideoMedia } from '../projects.ts'

/** As mini animações têm todas o mesmo tamanho (720 x 990). */
const animacao = { kind: 'video', width: 720, height: 990 } as const

const pulinhoVideo: VideoMedia = {
  ...animacao,
  src: pulinho,
  poster: pulinhoPoster,
  posterSmall: pulinhoPosterPequeno,
  alt: { pt: 'A Beka se abaixa e dá um pulinho de alegria, de olhos fechados e braços abertos, com estrelinhas em volta.', en: 'Beka crouches and does a little jump for joy, eyes closed and arms wide open, with little stars around her.' },
  caption: { pt: 'Pulinho de alegria, uma das 14 mini animações, em loop sem emenda.', en: 'A jump for joy, one of the 14 mini animations, looping without a seam.' },
}

const dancinhaVideo: VideoMedia = {
  ...animacao,
  src: dancinha,
  poster: dancinhaPoster,
  posterSmall: dancinhaPosterPequeno,
  alt: { pt: 'A Beka dança balançando os braços, com notas musicais em volta.', en: 'Beka dances swinging her arms, with music notes around her.' },
  caption: { pt: 'Dancinha: cada osso segue uma curva periódica, que fecha o loop sem emenda.', en: 'A little dance: each bone follows a periodic curve that closes the loop without a seam.' },
}

const curvasImagem: ImageMedia = {
  kind: 'image',
  src: curvas,
  srcSmall: curvasPequena,
  width: 1600,
  height: 600,
  alt: {
    pt: 'Gráfico com as curvas de animação da dancinha ao longo de 2 segundos: a rotação do ombro, do cotovelo e do pulso esquerdos e a altura e a escala do corpo.',
    en: 'Chart of the dance animation curves over 2 seconds: the rotation of the left shoulder, elbow and wrist and the height and scale of the body.',
  },
  caption: { pt: 'Os bastidores da dancinha: as curvas de cada osso num loop de 2 segundos.', en: 'Behind the dance: the curve of each bone over a 2-second loop.' },
}

const musicaVideo: VideoMedia = {
  ...animacao,
  src: musica,
  poster: musicaPoster,
  posterSmall: musicaPosterPequeno,
  alt: { pt: 'A Beka de fones de ouvido, de olhos fechados, curtindo uma música.', en: 'Beka with headphones on, eyes closed, enjoying some music.' },
  caption: { pt: 'Curtindo um som, de fones de ouvido.', en: 'Enjoying some music, headphones on.' },
}

const sonecaVideo: VideoMedia = {
  ...animacao,
  src: soneca,
  poster: sonecaPoster,
  posterSmall: sonecaPosterPequeno,
  alt: { pt: 'A Beka cochila em pé, de olhos fechados, com uma bolhinha e um "Z", e acorda de novo.', en: 'Beka dozes off standing up, eyes closed, with a little bubble and a "Z", then wakes up again.' },
  caption: { pt: 'Soneca: as cenas cobrem humores do dia a dia, da alegria ao sono.', en: 'A nap: the scenes cover everyday moods, from joy to sleepiness.' },
}

const ilustracaoImagem: ImageMedia = {
  kind: 'image',
  src: ilustracao,
  srcSmall: ilustracaoPequena,
  width: 768,
  height: 1376,
  alt: { pt: 'A ilustração original da Beka, de corpo inteiro, em pé e parada.', en: 'The original full-body illustration of Beka, standing still.' },
  caption: {
    pt: 'A ilustração de onde tudo sai: o código a separa em camadas, reconstrói o que estava escondido e monta o esqueleto.',
    en: 'The illustration everything starts from: the code splits it into layers, rebuilds what was hidden and rigs the skeleton.',
  },
}

const beka: ProjectDetails = {
  intro: {
    pt: 'A Beka é uma personagem 2D animada que vive sobre a área de trabalho do Windows (janela transparente, sem bordas, sempre no topo, com os cliques passando pelas áreas vazias) e uma assistente com inteligência local. Ela conversa com personalidade, memória e humor próprios, percebe o que acontece no computador, faz coisas de verdade nele e trabalha sozinha por objetivos, sem enviar nada para fora da máquina.',
    en: 'Beka is an animated 2D character who lives on the Windows desktop (a transparent, borderless, always-on-top window, with clicks passing through the empty areas) and an assistant powered by local AI. She chats with her own personality, memory and mood, notices what is happening on the computer, actually gets things done on it and works on her own toward goals, without sending anything off the machine.',
  },
  sections: [
    {
      title: { pt: 'O que ela faz', en: 'What she does' },
      items: [
        {
          pt: 'Assistente com 69 ferramentas, permissões e confirmação para o que é arriscado: abre programas e sites, organiza arquivos, cuida de agenda e lembretes, toca música, "assiste" a vídeos do YouTube pelas legendas, escreve documentos .docx e PDF ao vivo e usa outros programas pela acessibilidade do Windows.',
          en: 'An assistant with 69 tools, permissions and confirmation for anything risky: she opens apps and websites, organizes files, manages the calendar and reminders, plays music, "watches" YouTube videos through their captions, writes .docx and PDF documents live and drives other apps through Windows accessibility.',
        },
        {
          pt: 'Companhia: olha a tela e ouve o som do computador, reconhece a música e balança a cabeça no ritmo, comenta o vídeo que vocês estão vendo, aprende gostos aos poucos e fica quieta durante chamadas.',
          en: 'Companionship: she looks at the screen and listens to the computer audio, recognizes the music and nods along to the beat, comments on the video you are watching, slowly learns your tastes and stays quiet during calls.',
        },
        {
          pt: 'Trabalho por objetivos: planeja, edita arquivos, roda comandos num terminal sob uma política de segurança, testa, confere o resultado e desfaz tudo se for preciso. Em trabalhos com várias frentes, monta uma equipe de agentes que trabalham em paralelo e revisam uns aos outros.',
          en: 'Goal-driven work: she plans, edits files, runs commands in a terminal under a safety policy, tests, checks the result and can undo everything. For work with several fronts, she assembles a team of agents that run in parallel and review each other.',
        },
        {
          pt: 'Voz própria: entende o que se fala (a palavra de ativação é "Beka") e responde numa língua só dela, com sílabas sintetizadas na hora, no ritmo do texto e com a melodia do humor.',
          en: 'A voice of her own: she understands speech (the wake word is "Beka") and answers in a language of her own, with syllables synthesized on the fly, following the rhythm of the text and the melody of her mood.',
        },
      ],
      media: [pulinhoVideo, musicaVideo, sonecaVideo],
    },
    {
      title: { pt: 'Como ela é animada', en: 'How she is animated' },
      paragraphs: [
        {
          pt: 'Tudo sai de uma ilustração estática. O código a separa em camadas e reconstrói as partes que estavam escondidas (empilhadas, as camadas recompõem o original com diferença média de 0,89 em 255). Um esqueleto de 18 ossos deforma as malhas, os quadros-chave seguem curvas de Bézier, os loops usam splines periódicas, sem emenda, e molas e follow-through deixam o movimento natural. O rosto é gerado por código (11 tipos de olho e 16 bocas), há 84 poses de mão, e a anatomia é conferida quadro a quadro.',
          en: 'Everything starts from a single static illustration. The code splits it into layers and rebuilds the hidden parts (stacked back together, the layers match the original with a mean difference of 0.89 out of 255). An 18-bone skeleton deforms the meshes, keyframes follow Bézier curves, loops use periodic splines with no seams, and springs and follow-through keep the motion natural. The face is generated by code (11 eye types and 16 mouths), there are 84 hand poses, and the anatomy is checked frame by frame.',
        },
        {
          pt: 'Na tela, a CPU deforma os vértices e a GPU desenha (WebGL2). A troca de cena é um crossfade entre dois framebuffers, e o contorno branco das figurinhas vem de uma transformada de distância feita na própria GPU.',
          en: "On screen, the CPU deforms the vertices and the GPU draws (WebGL2). Scene changes crossfade between two framebuffers, and the stickers' white outline comes from a distance transform computed on the GPU.",
        },
      ],
      media: [ilustracaoImagem, dancinhaVideo, curvasImagem],
    },
    {
      title: { pt: 'Como a IA decide', en: 'How the AI decides' },
      paragraphs: [
        {
          pt: 'Cada papel tem um modelo local especialista, rodando pelo Ollama: um para a conversa e a visão, um para ouvir, um para escrever, um para código e um para a memória, que busca lembranças pelo significado. O modelo responde num JSON preso a um esquema e só escolhe de listas fechadas (emoção, gesto, ferramenta). A aplicação valida, confere a permissão, pede confirmação, executa, verifica o efeito e registra tudo, com como desfazer. O corpo reage na hora, e a fala chega cerca de um segundo depois.',
          en: 'Each role has a specialist local model running through Ollama: one for conversation and vision, one for listening, one for writing, one for code and one for memory, which recalls things by meaning. The model answers in JSON bound to a schema and can only pick from closed lists (emotion, gesture, tool). The app validates the answer, checks permissions, asks for confirmation, runs it, verifies the effect and logs everything, with a way to undo it. Her body reacts right away, and the words follow about a second later.',
        },
      ],
    },
    {
      title: { pt: 'Privacidade', en: 'Privacy' },
      items: [
        {
          pt: 'Tudo roda no computador: o endereço do modelo só pode ser local, e modelos de nuvem são recusados.',
          en: 'Everything runs on the computer: the model address must be local, and cloud models are refused.',
        },
        {
          pt: 'A tela é lida sem gravar imagens, do som ficam só os últimos 30 segundos na memória, chamadas nunca são transcritas e o teclado nunca é monitorado. Gerenciadores de senha, telas de login e janelas anônimas ficam de fora.',
          en: 'The screen is read without saving images, only the last 30 seconds of audio stay in memory, calls are never transcribed and the keyboard is never monitored. Password managers, login screens and private windows are left out.',
        },
        {
          pt: 'O que aparece na tela é informação, nunca ordem: num teste com uma instrução escondida numa página, ela não usou nenhuma ferramenta de ação em 6 rodadas.',
          en: 'What appears on screen is information, never an order: in a test with an instruction hidden in a web page, she used no action tool in 6 runs.',
        },
      ],
    },
    {
      title: { pt: 'Em números', en: 'By the numbers' },
      items: [
        { pt: '4.565 verificações automatizadas em 18 suítes, que rodam sem o modelo e sem o sistema operacional.', en: '4,565 automated checks in 18 suites that run without the model and without the operating system.' },
        { pt: 'A ferramenta certa em 31 a 33 de 34 pedidos, sem nenhum caso de dizer que fez sem ter feito.', en: 'The right tool in 31 to 33 out of 34 requests, with not a single case of claiming to have done something she had not done.' },
        { pt: 'Com ruído de fundo, o sentido do comando falado ficou certo em 56 de 60 vezes (eram 37).', en: 'With background noise, the meaning of spoken commands came out right 56 times out of 60 (up from 37).' },
        { pt: 'Num notebook com placa de vídeo de 4 GB, ela reage em 0,7 a 1,1 segundo.', en: 'On a laptop with a 4 GB GPU, she reacts in 0.7 to 1.1 seconds.' },
      ],
    },
  ],
  note: {
    pt: 'O repositório é privado. As animações vêm do próprio motor da Beka, e os números, dos testes e avaliações do projeto.',
    en: "The repository is private. The animations come from Beka's own engine, and the numbers from the project's tests and evaluations.",
  },
}

export default beka
