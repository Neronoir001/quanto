import { useEffect, useState } from 'react'

export type Plateforme = 'ios' | 'android' | 'ordinateur'

export function detecterPlateforme(): Plateforme {
  const ua = navigator.userAgent
  const ipadDeguise = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || ipadDeguise) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'ordinateur'
}

/** Vrai quand l'application est ouverte depuis son icône (et non dans un onglet du navigateur). */
export function estInstallee(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Bouton « Installer » proposé par Chrome et Edge (Android et PC). Indisponible sur iPhone. */
export function useInstallation() {
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null)
  const [installee, setInstallee] = useState(estInstallee)

  useEffect(() => {
    const surProposition = (e: Event) => {
      e.preventDefault()
      setEvenement(e as EvenementInstallation)
    }
    const surInstallation = () => {
      setInstallee(true)
      setEvenement(null)
    }
    window.addEventListener('beforeinstallprompt', surProposition)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surProposition)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  const installer = evenement
    ? async () => {
        await evenement.prompt()
        await evenement.userChoice
        setEvenement(null)
      }
    : null

  return { installee, installer }
}

/** Demande au navigateur de ne jamais effacer les données de l'application. */
export function useStockageProtege() {
  const [protege, setProtege] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtege).catch(() => setProtege(false))
  }, [])

  const proteger = async () => {
    const ok = (await navigator.storage?.persist?.()) ?? false
    setProtege(ok)
    return ok
  }

  return { protege, proteger }
}

/** Vrai quand le programme est enregistré sur l'appareil et fonctionne sans Internet. */
export function usePretHorsLigne() {
  const [pret, setPret] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(() => setPret(true)).catch(() => {})
  }, [])
  return pret
}
