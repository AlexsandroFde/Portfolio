// O codificador das fotos da absorção (veja fotos.ts): um worker que transforma em PNG a imagem de
// cada foto. Na thread principal, o Chrome só codifica o PNG de um canvas (toBlob) num tempo ocioso
// dela, e com a página rolando ela não tem nenhum: ele esperava mais de um segundo para forçar a
// codificação, em qualquer aparelho, e o bloco chegava à faixa sem a foto (por cima da cortina, sem
// ser absorvido). Aqui, longe da rolagem, o PNG sai em algumas dezenas de milissegundos.

/** O que a página manda: a imagem da foto, transferida para cá, e o número do pedido. */
export interface ParaOCodificador {
  id: number
  imagem: ImageBitmap
}

/** O que volta: o PNG do pedido, ou null se não deu (a página codifica ela mesma). */
export interface DoCodificador {
  id: number
  png: Blob | null
}

/** O escopo do worker (os tipos do TypeScript aqui são os da página). */
interface Escopo {
  postMessage(mensagem: DoCodificador): void
  addEventListener(tipo: 'message', ouvinte: (evento: MessageEvent<ParaOCodificador>) => void): void
}

const escopo = self as unknown as Escopo

escopo.addEventListener('message', ({ data: { id, imagem } }) => {
  void codificar(imagem).then((png) => escopo.postMessage({ id, png }))
})

async function codificar(imagem: ImageBitmap): Promise<Blob | null> {
  try {
    const tela = new OffscreenCanvas(imagem.width, imagem.height)
    const contexto = tela.getContext('2d')
    if (!contexto) return null
    contexto.drawImage(imagem, 0, 0)
    return await tela.convertToBlob({ type: 'image/png' })
  } catch {
    return null
  } finally {
    imagem.close()
  }
}
