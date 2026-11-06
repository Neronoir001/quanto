import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useMessage } from './Messages'

/** Prévient quand une nouvelle version de Quanto a été téléchargée. */
export default function MiseAJour() {
  const afficher = useMessage()
  const deja = useRef(false)
  const {
    needRefresh: [aMettreAJour],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, enregistrement) {
      // Vérifie s'il existe une nouvelle version toutes les heures quand l'application reste ouverte.
      if (enregistrement) window.setInterval(() => void enregistrement.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!aMettreAJour || deja.current) return
    deja.current = true
    afficher('Une nouvelle version de Quanto est disponible.', {
      duree: null,
      action: { libelle: 'Mettre à jour', faire: () => void updateServiceWorker(true) },
    })
  }, [aMettreAJour, afficher, updateServiceWorker])

  return null
}
