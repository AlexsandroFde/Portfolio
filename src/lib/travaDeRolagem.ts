/**
 * Trava a rolagem da página enquanto algo fica por cima dela (a página de um projeto) e devolve como
 * destravar. É a mesma trava da volta ao topo (overflow: hidden na raiz): a rolagem suave do buraco
 * negro a respeita e deixa a roda e o dedo com o navegador, que rola o que estiver por cima (veja
 * rolagemSuave.ts). A barra de rolagem do site é escondida, então nada muda de largura.
 */
export function travarRolagem(): () => void {
  const raiz = document.documentElement
  const antes = raiz.style.overflow
  raiz.style.overflow = 'hidden'
  return () => {
    raiz.style.overflow = antes
  }
}
