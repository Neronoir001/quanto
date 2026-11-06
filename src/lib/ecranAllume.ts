import { useEffect, useState } from 'react'

/**
 * Empêche l'écran de se mettre en veille (API Wake Lock), le temps que le composant est affiché.
 * Le verrou est repris automatiquement quand on revient sur l'application.
 */
export function useEcranAllume(): 'actif' | 'indisponible' {
  const [etat, setEtat] = useState<'actif' | 'indisponible'>('indisponible')

  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let verrou: WakeLockSentinel | null = null
    let fini = false

    const demander = async () => {
      if (fini || document.visibilityState !== 'visible') return
      try {
        verrou = await navigator.wakeLock.request('screen')
        setEtat('actif')
        verrou.addEventListener('release', () => {
          if (!fini) setEtat('indisponible')
        })
      } catch {
        setEtat('indisponible')
      }
    }

    void demander()
    const surRetour = () => void demander()
    document.addEventListener('visibilitychange', surRetour)
    return () => {
      fini = true
      document.removeEventListener('visibilitychange', surRetour)
      void verrou?.release().catch(() => {})
    }
  }, [])

  return etat
}
