import api from '../../assets/projects/transcriber/api.webp'
import apiPequena from '../../assets/projects/transcriber/api-640.webp'
import conferencia from '../../assets/projects/transcriber/conferencia.webp'
import conferenciaPequena from '../../assets/projects/transcriber/conferencia-640.webp'
import inicio from '../../assets/projects/transcriber/inicio.webp'
import inicioPequena from '../../assets/projects/transcriber/inicio-640.webp'
import participantes from '../../assets/projects/transcriber/participantes.webp'
import participantesPequena from '../../assets/projects/transcriber/participantes-640.webp'
import type { ImageMedia, ProjectDetails } from '../projects.ts'

const participantesImagem: ImageMedia = {
  kind: 'image',
  src: participantes,
  srcSmall: participantesPequena,
  width: 1600,
  height: 900,
  alt: {
    pt: 'A aba Participantes: exemplos do que cada pessoa disse, um campo para o nome e a sugestão "Carlos", tirada de quando alguém o chamou na conversa.',
    en: 'The Participants tab: samples of what each person said, a name field and the suggestion "Carlos", taken from when someone addressed him in the conversation.',
  },
  caption: {
    pt: 'Nomear os participantes: os nomes ditos na conversa viram sugestões, que a pessoa confirma.',
    en: 'Naming the participants: names spoken in the conversation become suggestions for the user to confirm.',
  },
}

const conferenciaImagem: ImageMedia = {
  kind: 'image',
  src: conferencia,
  srcSmall: conferenciaPequena,
  width: 1600,
  height: 900,
  alt: {
    pt: 'A aba Conferência: o índice de menções, com os valores monetários citados na reunião, cada um com o horário, e as categorias de datas, prazos, horários, percentuais e encaminhamentos.',
    en: 'The Review tab: the index of mentions, with the amounts of money quoted in the meeting, each with its timestamp, and the categories for dates, deadlines, times, percentages and action items.',
  },
  caption: {
    pt: 'A conferência: valores, datas e prazos citados, com o horário de cada um.',
    en: 'The review: amounts, dates and deadlines that were mentioned, each with its timestamp.',
  },
}

const inicioImagem: ImageMedia = {
  kind: 'image',
  src: inicio,
  srcSmall: inicioPequena,
  width: 1600,
  height: 900,
  alt: {
    pt: 'A tela inicial: uma área para arrastar o vídeo ou o áudio, a lista de transcrições recentes e, no canto, a placa de vídeo pronta para transcrever.',
    en: 'The home screen: an area to drop the video or audio file, the list of recent transcripts and, in the corner, the GPU ready to transcribe.',
  },
  caption: {
    pt: 'Para começar, basta arrastar a gravação para a janela.',
    en: 'To get started, just drag the recording into the window.',
  },
}

const apiImagem: ImageMedia = {
  kind: 'image',
  src: api,
  srcSmall: apiPequena,
  width: 1600,
  height: 900,
  alt: {
    pt: 'A documentação da API REST, explicando como uma transcrição acontece: o pedido assíncrono, o acompanhamento da tarefa e os estados dela.',
    en: 'The REST API documentation, explaining how a transcription happens: the asynchronous request, tracking the task and its states.',
  },
  caption: {
    pt: 'A documentação da API, servida pelo próprio aplicativo.',
    en: 'The API documentation, served by the app itself.',
  },
}

const transcriber: ProjectDetails = {
  intro: {
    pt: 'Um aplicativo de desktop que transcreve gravações de reuniões em português brasileiro com o máximo de fidelidade ao que foi dito: identifica quem fala, marca o tempo de cada fala, preserva hesitações e repetições e sinaliza o que não foi compreendido com segurança, em vez de adivinhar. Tudo roda no computador: o áudio não vai para nenhum serviço externo.',
    en: 'A desktop app that transcribes meeting recordings in Brazilian Portuguese as faithfully as possible: it identifies who is speaking, timestamps every line, keeps hesitations and repetitions and flags whatever it could not understand with confidence instead of guessing. Everything runs on the computer: the audio never goes to an outside service.',
  },
  sections: [
    {
      title: { pt: 'Fidelidade antes de tudo', en: 'Faithfulness first' },
      paragraphs: [
        {
          pt: 'O resultado é sempre a transcrição completa: o programa não resume, não reescreve e não vira ata. O que ficou em dúvida aparece marcado (inaudível, trecho incerto com as outras hipóteses ouvidas, falas simultâneas), e nenhum nome é dado a um participante sem a pessoa confirmar.',
          en: 'The output is always the full transcript: the app never summarizes, rewrites or turns the meeting into minutes. Anything in doubt is marked (inaudible, uncertain passage with the other hypotheses heard, overlapping speech), and no participant gets a name until a person confirms it.',
        },
      ],
      media: [participantesImagem],
    },
    {
      title: { pt: 'O que sai de cada reunião', en: 'What each meeting produces' },
      items: [
        { pt: 'Word, com os trechos incertos destacados em amarelo, e Markdown e texto simples.', en: 'Word, with uncertain passages highlighted in yellow, plus Markdown and plain text.' },
        { pt: 'Legendas SRT e VTT com o nome de quem fala, para abrir junto com o vídeo.', en: 'SRT and VTT subtitles with speaker names, to play alongside the video.' },
        {
          pt: 'Um relatório de conferência: pontos para ouvir de novo, tempo de fala de cada participante, sugestões de nomes e um índice das menções a valores, datas, prazos e encaminhamentos, sempre em citações literais.',
          en: 'A review report: passages to listen to again, speaking time per participant, name suggestions and an index of mentions of amounts, dates, deadlines and action items, always as literal quotes.',
        },
        { pt: 'Um JSON com cada palavra, o tempo e a confiança dela: é dele que os outros arquivos são gerados de novo.', en: 'A JSON file with every word, its timing and confidence, from which all the other files can be regenerated.' },
      ],
      media: [conferenciaImagem],
    },
    {
      title: { pt: 'Como funciona', en: 'How it works' },
      paragraphs: [
        {
          pt: 'Seis etapas: extração e tratamento do áudio, identificação dos participantes com o pyannote, transcrição com o Whisper large-v3 (pelo faster-whisper, na placa de vídeo), uma revisão em segundo passo e a montagem do texto. Com placa de vídeo, leva de um quinto a um terço da duração da gravação. Nos testes, o programa acertou sozinho o número de participantes e atribuiu de 95% a 97% das falas a quem as disse.',
          en: 'Six stages: audio extraction and cleanup, speaker identification with pyannote, transcription with Whisper large-v3 (through faster-whisper, on the GPU), a second review pass and the final assembly. With a GPU it takes a fifth to a third of the recording length. In tests it found the number of participants on its own and attributed 95% to 97% of the lines to the right person.',
        },
        {
          pt: 'Um glossário com nomes, siglas e termos técnicos melhora o resultado (na reunião de teste, corrigiu uma sigla em todas as ocorrências), e uma transcrição interrompida, até por queda de energia, continua de onde parou, reaproveitando as etapas prontas.',
          en: 'A glossary of names, acronyms and technical terms improves the result (in the test meeting it fixed an acronym everywhere it appeared), and an interrupted transcription, even by a power cut, resumes where it stopped, reusing the finished stages.',
        },
      ],
    },
    {
      title: { pt: 'Três formas de usar', en: 'Three ways to use it' },
      items: [
        {
          pt: 'Aplicativo: arrastar o vídeo para a janela, acompanhar as etapas com o tempo restante e, depois, ouvir cada trecho com um clique no horário, nomear os participantes e conferir os pontos marcados.',
          en: 'Desktop app: drag the video into the window, follow the stages with the time remaining, then play any passage by clicking its timestamp, name the participants and review the flagged points.',
        },
        {
          pt: 'API REST com documentação interativa, que funciona sem internet: tarefas assíncronas, progresso em tempo real por Server-Sent Events e um formato único de erro. A própria interface usa só ela.',
          en: 'REST API with interactive docs that work offline: asynchronous tasks, real-time progress via Server-Sent Events and a single error format. The app itself uses nothing but this API.',
        },
        { pt: 'Linha de comando, para automação e para quem prefere o terminal.', en: 'Command line, for automation and terminal lovers.' },
      ],
      media: [inicioImagem, apiImagem],
    },
    {
      title: { pt: 'Instalação e segurança', en: 'Installation and security' },
      items: [
        {
          pt: 'Um instalador próprio confere o computador (sistema, placa de vídeo, espaço e internet), instala sem pedir administrador, continua de onde parou quando é aberto de novo depois de uma queda da internet e, numa atualização, mantém transcrições, histórico e configurações.',
          en: 'A custom installer checks the computer (OS, GPU, disk space and internet), installs without admin rights, picks up where it left off when run again after a dropped connection and keeps transcripts, history and settings when updating.',
        },
        {
          pt: 'A API só atende o próprio computador e recusa pedidos vindos de outros sites abertos no navegador.',
          en: 'The API only answers the local machine and rejects requests coming from other websites open in the browser.',
        },
      ],
    },
  ],
  note: {
    pt: 'As telas mostram uma reunião de teste, gravada com vozes sintéticas.',
    en: 'The screens show a test meeting recorded with synthetic voices.',
  },
}

export default transcriber
