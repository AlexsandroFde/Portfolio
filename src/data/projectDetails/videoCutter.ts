import exportar from '../../assets/projects/video-cutter/exportar.webp'
import exportarPequena from '../../assets/projects/video-cutter/exportar-640.webp'
import inicio from '../../assets/projects/video-cutter/inicio.webp'
import inicioPequena from '../../assets/projects/video-cutter/inicio-640.webp'
import linhaDoTempo from '../../assets/projects/video-cutter/linha-do-tempo.webp'
import linhaDoTempoPequena from '../../assets/projects/video-cutter/linha-do-tempo-640.webp'
import pronto from '../../assets/projects/video-cutter/pronto.webp'
import prontoPequena from '../../assets/projects/video-cutter/pronto-640.webp'
import type { ImageMedia, ProjectDetails } from '../projects.ts'

const inicioImagem: ImageMedia = {
  kind: 'image',
  src: inicio,
  srcSmall: inicioPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'A tela inicial ampliada: "Corte um vídeo em pedacinhos e baixe tudo de uma vez", com a opção de escolher um vídeo do aparelho.',
    en: 'The home screen, zoomed in: "Cut a video into little pieces and download them all at once", with the option to pick a video from the device.',
  },
  caption: { pt: 'A tela inicial: o vídeo vem do aparelho ou de um link do YouTube.', en: 'The home screen: the video comes from the device or a YouTube link.' },
}

const linhaDoTempoImagem: ImageMedia = {
  kind: 'image',
  src: linhaDoTempo,
  srcSmall: linhaDoTempoPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'A linha do tempo com o vídeo dividido em três pedacinhos numerados, o cursor de reprodução e o botão Dividir.',
    en: 'The timeline with the video split into three numbered clips, the playhead and the Split button.',
  },
  caption: { pt: 'A linha do tempo: três pedacinhos, cortados no cursor.', en: 'The timeline: three clips, split at the playhead.' },
}

const exportarImagem: ImageMedia = {
  kind: 'image',
  src: exportar,
  srcSmall: exportarPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'As opções de exportação: vídeo ou só o áudio em MP3, modo rápido ou preciso, a explicação do modo rápido e o botão Exportar 3 pedacinhos.',
    en: 'The export options: video or audio-only MP3, fast or precise mode, an explanation of the fast mode and the Export 3 clips button.',
  },
  caption: { pt: 'As opções de exportação, cada uma com a explicação do que faz.', en: 'The export options, each with an explanation of what it does.' },
}

const prontoImagem: ImageMedia = {
  kind: 'image',
  src: pronto,
  srcSmall: prontoPequena,
  width: 1280,
  height: 720,
  alt: {
    pt: 'A exportação em andamento: "guardando com carinho", com a barra de progresso salvando o pedacinho 1 de 3 na pasta Video Cutter.',
    en: 'The export in progress: "saving with love", with the progress bar saving clip 1 of 3 to the Video Cutter folder.',
  },
  caption: { pt: 'A exportação, com o progresso real do FFmpeg.', en: 'The export, with real progress from FFmpeg.' },
}

const videoCutter: ProjectDetails = {
  intro: {
    pt: 'Um app Flutter para dividir um vídeo em vários pedacinhos e exportar todos de uma vez. O vídeo pode vir do próprio celular ou de um link do YouTube, e cada corte vai direto para a galeria do aparelho.',
    en: 'A Flutter app for splitting a video into several clips and exporting them all at once. The video can come from the phone itself or from a YouTube link, and every clip goes straight to the device gallery.',
  },
  sections: [
    {
      title: { pt: 'O que ele faz', en: 'What it does' },
      items: [
        {
          pt: 'Uma linha do tempo interativa: arrastar para navegar, dividir no cursor, mover a fronteira entre dois pedacinhos, desligar um deles da exportação ou juntá-lo ao vizinho.',
          en: 'An interactive timeline: drag to scrub, split at the playhead, move the boundary between two clips, leave one out of the export or merge it with its neighbor.',
        },
        {
          pt: 'Exportação em lote em dois modos: rápido, copiando os fluxos sem recodificar (instantâneo e sem perda, com o corte no quadro-chave mais próximo), ou preciso, recodificando em H.264 e AAC (corte exato, mais lento).',
          en: 'Batch export in two modes: fast, copying the streams without re-encoding (instant and lossless, cutting at the nearest keyframe), or precise, re-encoding to H.264 and AAC (exact cuts, slower).',
        },
        {
          pt: 'Só o áudio: cada pedacinho vira um MP3, salvo na pasta de músicas por um canal nativo próprio do Android.',
          en: 'Audio only: each clip becomes an MP3, saved to the music folder through a custom native Android channel.',
        },
        {
          pt: 'Do YouTube, com progresso: quando ele só oferece vídeo e áudio separados, o app baixa os dois e junta com o FFmpeg, sem recodificar.',
          en: 'From YouTube, with progress: when it only offers separate video and audio streams, the app downloads both and merges them with FFmpeg, without re-encoding.',
        },
        {
          pt: 'Um histórico de edições: cada vídeo vira uma edição salva sozinha enquanto se corta, que dá para retomar, renomear (sem nomes repetidos) ou excluir.',
          en: 'An edit history: each video becomes an edit that saves itself as you cut, which you can resume, rename (no duplicate names allowed) or delete.',
        },
      ],
      media: [inicioImagem, linhaDoTempoImagem, exportarImagem],
    },
    {
      title: { pt: 'Arquitetura', en: 'Architecture' },
      paragraphs: [
        {
          pt: 'Organizado por funcionalidade, com Clean Architecture e Riverpod para a injeção de dependências e o estado. O domínio (entidades e contratos dos repositórios) não depende do Flutter nem de pacotes; a camada de dados implementa os contratos com o YouTube, o seletor de arquivos e o FFmpegKit; e a apresentação compõe tudo, com a linha do tempo desenhada num CustomPainter.',
          en: 'Organized by feature, with Clean Architecture and Riverpod for dependency injection and state. The domain (entities and repository contracts) depends on neither Flutter nor any package; the data layer implements the contracts with YouTube, the file picker and FFmpegKit; and the presentation layer wires everything together, with the timeline drawn in a CustomPainter.',
        },
      ],
      items: [
        {
          pt: 'Estados selados em cada controller: a interface trata todos os casos, e o compilador cobra.',
          en: 'Sealed states in every controller: the UI handles every case, and the compiler enforces it.',
        },
        {
          pt: 'Pedacinhos sempre contíguos: um controller garante as regras (cobrem o vídeo todo, têm pelo menos meio segundo e ficam em ordem), e a interface nunca mexe na lista direto.',
          en: 'Clips are always contiguous: a controller enforces the rules (they cover the whole video, last at least half a second and stay in order), and the UI never touches the list directly.',
        },
        {
          pt: 'O progresso da exportação chega como um fluxo de eventos, e qualquer falha vira um erro tipado, com a mensagem pronta para quem usa.',
          en: 'Export progress arrives as a stream of events, and any failure becomes a typed error with a user-ready message.',
        },
        {
          pt: 'Um design system próprio: temas gerados de uma cor base, fonte embutida e escalas de espaço, raio e movimento, sem números mágicos nas telas.',
          en: 'A custom design system: themes generated from a seed color, an embedded font and spacing, radius and motion scales, with no magic numbers in the screens.',
        },
      ],
      media: [prontoImagem],
    },
  ],
}

export default videoCutter
