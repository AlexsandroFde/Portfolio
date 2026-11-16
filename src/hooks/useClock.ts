import { useEffect, useState } from 'react'
import type { Idioma } from '../i18n/idioma.ts'

// Português: 24 horas ("09:05"). Inglês: 12 horas ("9:05 AM").
const formato: Record<Idioma, { locale: string; hour: '2-digit' | 'numeric' }> = {
  pt: { locale: 'pt-BR', hour: '2-digit' },
  en: { locale: 'en-US', hour: 'numeric' },
}

/**
 * Hora atual em um fuso horário. Retorna `null` até o componente montar no
 * navegador, para o HTML pré-renderizado não carregar uma hora fixa.
 */
export function useClock(timeZone: string, idioma: Idioma): string | null {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const { locale, hour } = formato[idioma]
    const formatter = new Intl.DateTimeFormat(locale, { hour, minute: '2-digit', timeZone })
    const tick = () => setTime(formatter.format(new Date()))

    tick()
    const timer = window.setInterval(tick, 15_000)
    return () => window.clearInterval(timer)
  }, [timeZone, idioma])

  return time
}
