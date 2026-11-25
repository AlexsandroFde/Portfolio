import { useCallback, useEffect, useRef, useState } from 'react'

/** O endereço da página de um projeto: #projeto/<id>. */
const PREFIXO = '#projeto/'

/** O que o site guarda no histórico ao abrir um projeto: ao fechar, ele sabe que pode voltar. */
interface EstadoDoHistorico {
  projeto?: string
}

/** O projeto que o endereço abre, se for um dos `ids`. */
function doEndereco(ids: readonly string[]): string | null {
  if (!location.hash.startsWith(PREFIXO)) return null
  const id = decodeURIComponent(location.hash.slice(PREFIXO.length))
  return ids.includes(id) ? id : null
}

/**
 * Qual projeto está aberto, guardado no endereço (#projeto/<id>): um link abre direto a página do
 * projeto, e o voltar do navegador (o do celular, principalmente) a fecha, em vez de sair do site.
 * `ids` são os projetos que têm página; a lista não deve mudar entre renderizações.
 */
export function useProjectRoute(ids: readonly string[]) {
  const [aberto, setAberto] = useState<string | null>(null)
  // um voltar pedido e ainda não feito: um segundo fechar (dois Esc seguidos) não volta duas vezes
  const voltando = useRef(false)

  useEffect(() => {
    const ler = () => {
      voltando.current = false
      setAberto(doEndereco(ids))
    }
    ler()
    window.addEventListener('popstate', ler)
    return () => window.removeEventListener('popstate', ler)
  }, [ids])

  const abrir = useCallback(
    (id: string) => {
      if (!ids.includes(id)) return
      history.pushState({ projeto: id } satisfies EstadoDoHistorico, '', `${PREFIXO}${encodeURIComponent(id)}`)
      setAberto(id)
    },
    [ids],
  )

  const fechar = useCallback(() => {
    if (voltando.current) return
    // Aberto por aqui: volta ao endereço de antes, e o voltar do navegador continua certo. Aberto
    // pelo link: o projeto só sai do endereço.
    if ((history.state as EstadoDoHistorico | null)?.projeto) {
      voltando.current = true
      history.back()
    } else {
      history.replaceState(null, '', location.pathname + location.search)
      setAberto(null)
    }
  }, [])

  return { aberto, abrir, fechar }
}
