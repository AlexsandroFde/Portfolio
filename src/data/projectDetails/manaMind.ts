import classes from '../../assets/projects/manamind/classes.webp'
import classesPequena from '../../assets/projects/manamind/classes-640.webp'
import foco from '../../assets/projects/manamind/foco.webp'
import focoPequena from '../../assets/projects/manamind/foco-640.webp'
import gacha from '../../assets/projects/manamind/gacha.webp'
import gachaPequena from '../../assets/projects/manamind/gacha-640.webp'
import missoes from '../../assets/projects/manamind/missoes.webp'
import missoesPequena from '../../assets/projects/manamind/missoes-640.webp'
import telas from '../../assets/projects/manamind/telas.mp4'
import telasPoster from '../../assets/projects/manamind/telas.webp'
import telasPosterPequeno from '../../assets/projects/manamind/telas-640.webp'
import type { ImageMedia, ProjectDetails, VideoMedia } from '../projects.ts'

const telasVideo: VideoMedia = {
  kind: 'video',
  src: telas,
  poster: telasPoster,
  posterSmall: telasPosterPequeno,
  width: 1280,
  height: 720,
  alt: {
    pt: 'As telas do ManaMind passando uma a uma: as missões, as sessões, o modo foco com o cronômetro, o ambiente sonoro, o baú de personagens, os personagens obtidos, as probabilidades do banner, o perfil e as estatísticas.',
    en: 'The ManaMind screens sliding by one after another: missions, sessions, focus mode with the timer, the soundscape, the character chest, the characters obtained, the banner odds, the profile and the stats.',
  },
  caption: {
    pt: 'As telas do app, na ordem da jornada: das missões ao foco, ao gacha e às estatísticas.',
    en: "The app's screens in the order of the journey: from missions to focus, the gacha and the stats.",
  },
}

const missoesImagem: ImageMedia = {
  kind: 'image',
  src: missoes,
  srcSmall: missoesPequena,
  width: 1600,
  height: 1071,
  alt: {
    pt: 'Três telas do ManaMind: a inicial, com o calendário, o convite para focar, as missões e o saldo de manacoins; o perfil com as estatísticas; e o relatório com o gráfico dos últimos 7 dias e dicas personalizadas.',
    en: 'Three ManaMind screens: the home screen with the calendar, the call to focus, the missions and the manacoin balance; the profile with stats; and the report with the last 7 days chart and personalized tips.',
  },
  caption: {
    pt: 'A tela inicial com as missões, o perfil e as estatísticas com as dicas personalizadas.',
    en: 'The home screen with missions, the profile and the stats with personalized tips.',
  },
}

const focoImagem: ImageMedia = {
  kind: 'image',
  src: foco,
  srcSmall: focoPequena,
  width: 1600,
  height: 1075,
  alt: {
    pt: 'Três telas: as sessões de uma missão, pendentes e concluídas; a Mana Zone, com o cronômetro em 19:57, o ciclo 1 de 4 e a mensagem do personagem; e o ambiente sonoro, com chuva e música lo-fi.',
    en: "Three screens: a mission's sessions, pending and completed; the Mana Zone, with the timer at 19:57, cycle 1 of 4 and the character's message; and the soundscape, with rain and lo-fi music.",
  },
  caption: {
    pt: 'As sessões de uma missão, a Mana Zone e a escolha do ambiente sonoro.',
    en: "A mission's sessions, the Mana Zone and the soundscape picker.",
  },
}

const gachaImagem: ImageMedia = {
  kind: 'image',
  src: gacha,
  srcSmall: gachaPequena,
  width: 1600,
  height: 1041,
  alt: {
    pt: 'O gacha em três telas: o baú de personagens com os contadores de garantia e as puxadas de 200 e 2.000 manacoins; os 10 personagens obtidos, com bordas pela raridade; e as probabilidades e a garantia do banner.',
    en: 'The gacha in three screens: the character chest with the pity counters and the 200 and 2,000 manacoin pulls; the 10 characters obtained, with borders by rarity; and the banner odds and pity.',
  },
  caption: {
    pt: 'O gacha: o baú, os personagens obtidos numa puxada de dez e as probabilidades do banner.',
    en: 'The gacha: the chest, the characters from a ten-pull and the banner odds.',
  },
}

const classesImagem: ImageMedia = {
  kind: 'image',
  src: classes,
  srcSmall: classesPequena,
  width: 1500,
  height: 1725,
  alt: {
    pt: 'Diagrama de classes dividido em três domínios: o de usuários, com User; o de foco e missões, com Mission e FocusSession; e o de personagens, com Character, CharacterBanner, CharacterUserLink e UserBannerPity.',
    en: 'Class diagram split into three domains: users, with User; focus and missions, with Mission and FocusSession; and characters, with Character, CharacterBanner, CharacterUserLink and UserBannerPity.',
  },
  caption: {
    pt: 'O diagrama de classes, organizado pelos três domínios do sistema.',
    en: 'The class diagram, organized by the three domains of the system.',
  },
}

const manaMind: ProjectDetails = {
  intro: {
    pt: 'TCC em Engenharia de Computação no IFCE, feito em dupla com Geovane Rebouças Bezerra e orientado pelo Prof. Dr. Cidcley Teixeira de Souza. O ManaMind ataca a sobrecarga de atenção de quem vive interrompido: transforma as tarefas em missões, as sessões de foco em moedas e as moedas em personagens colecionáveis que acompanham a pessoa enquanto ela se concentra.',
    en: 'My Computer Engineering thesis at IFCE, written with Geovane Rebouças Bezerra and advised by Prof. Cidcley Teixeira de Souza. ManaMind takes on the attention overload of constantly interrupted people: it turns tasks into missions, focus sessions into coins and coins into collectible characters that keep the user company while they concentrate.',
  },
  sections: [
    {
      title: { pt: 'A fórmula', en: 'The formula' },
      paragraphs: [
        {
          pt: 'A técnica Pomodoro dá a estrutura (ciclos curtos de foco e pausa), a gamificação e o gacha dão a motivação, e a cultura japonesa dá a conexão emocional: personagens no estilo anime viram companheiros de jornada, com mensagens próprias de incentivo.',
          en: 'The Pomodoro technique provides the structure (short focus and break cycles), gamification and the gacha provide the motivation, and Japanese pop culture provides the emotional hook: anime-style characters become companions, each with their own encouraging messages.',
        },
      ],
      media: [telasVideo],
    },
    {
      title: { pt: 'Como funciona', en: 'How it works' },
      items: [
        {
          pt: 'Missões: cada tarefa vira uma missão, dividida em sessões, com barra de progresso, um calendário do dia e um convite para começar.',
          en: 'Missions: each task becomes a mission split into sessions, with a progress bar, a daily calendar and a prompt to get started.',
        },
        {
          pt: 'Mana Zone: o modo foco, com o cronômetro do ciclo, o personagem escolhido ao fundo com uma frase de incentivo e um alarme que pede confirmação entre o foco e a pausa. Sair no meio não é tão fácil, de propósito.',
          en: 'Mana Zone: the focus mode, with the cycle timer, the chosen character in the background with an encouraging line and an alarm that asks for confirmation between focus and break. Quitting midway is deliberately not that easy.',
        },
        {
          pt: 'Ambiente sonoro: sons de chuva, oceano, floresta, lareira, cafeteria ou ruído branco, combinados com música de foco, como lo-fi.',
          en: 'Soundscape: rain, ocean, forest, fireplace, café or white noise, mixed with focus music such as lo-fi.',
        },
        {
          pt: 'Estatísticas e dicas: missões, sessões e ciclos concluídos, o tempo de foco dos últimos 7 dias e sugestões tiradas do histórico, como o período do dia em que a pessoa mais rende.',
          en: 'Stats and tips: completed missions, sessions and cycles, focus time over the last 7 days and suggestions drawn from the history, such as the time of day when the user does their best work.',
        },
      ],
      media: [missoesImagem, focoImagem],
    },
    {
      title: { pt: 'O gacha', en: 'The gacha' },
      paragraphs: [
        {
          pt: 'Cada ciclo de foco concluído rende manacoins, a moeda do app, que compram puxadas nos baús de personagens (200 por uma, 2.000 por dez). O sistema se apoia no reforço intermitente e no colecionismo, com as regras à vista:',
          en: 'Every completed focus cycle earns manacoins, the app currency, which buy pulls from the character chests (200 for one, 2,000 for ten). The system relies on intermittent reinforcement and the joy of collecting, with the rules out in the open:',
        },
      ],
      items: [
        {
          pt: 'Raridade de 1 a 5 estrelas, com a borda do cartão em azul (3), roxo (4) ou laranja (5).',
          en: 'Rarity from 1 to 5 stars, with the card border in blue (3), purple (4) or orange (5).',
        },
        {
          pt: 'Probabilidades publicadas em cada banner: 0,83% para 5 estrelas, 5,17% para 4, 34% para 3 e 60% para 1 ou 2.',
          en: 'Odds published on every banner: 0.83% for 5 stars, 5.17% for 4, 34% for 3 and 60% for 1 or 2.',
        },
        {
          pt: 'Garantia por insistência (pity): um 5 estrelas a cada 90 puxadas, no máximo, e um 4 estrelas a cada 30.',
          en: 'Pity system: a 5-star at most every 90 pulls and a 4-star at most every 30.',
        },
      ],
      media: [gachaImagem],
    },
    {
      title: { pt: 'Arquitetura', en: 'Architecture' },
      paragraphs: [
        {
          pt: 'Um só código em Flutter para Android e iOS, com o estado em BLoC. O Firebase Authentication cuida do login (e-mail ou Google) e o Cloud Firestore guarda missões, sessões e coleções, sincronizados em tempo real. O sistema se divide em três domínios: usuários, personagens (com banners, coleção e o contador de garantia de cada pessoa) e foco e missões.',
          en: "A single Flutter codebase for Android and iOS, with state managed by BLoC. Firebase Authentication handles sign-in (email or Google) and Cloud Firestore stores missions, sessions and collections, synced in real time. The system is split into three domains: users, characters (with banners, collections and each user's pity counter) and focus and missions.",
        },
      ],
      media: [classesImagem],
    },
  ],
  note: {
    pt: 'Os personagens que aparecem no app são de obras conhecidas e foram usados só para ilustrar.',
    en: 'The characters shown in the app come from well-known works and are used for illustration only.',
  },
}

export default manaMind
