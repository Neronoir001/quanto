import { base } from '../donnees/base'
import { exporterRecettes, exporterJson } from '../sync/fichier'

/** Partage un fichier (menu du téléphone), ou l'enregistre si le partage est impossible. Renvoie `false` si annulé. */
export async function partagerOuEnregistrer(fichier: File, partager = true): Promise<boolean> {
  if (partager && typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: fichier.name })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Partage impossible : on enregistre le fichier à la place.
    }
  }
  const url = URL.createObjectURL(fichier)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier.name
  document.body.append(lien)
  lien.click()
  lien.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return true
}

/** Partage une ou plusieurs recettes sous forme de carnet Quanto (.zip, photos comprises). */
export async function partagerRecettes(ids: string[], nom: string): Promise<boolean> {
  return partagerOuEnregistrer(await exporterRecettes(base, ids, nom))
}

/** Exporte une ou plusieurs recettes au format JSON ouvert (sans photos). */
export async function telechargerJson(ids: string[], nom: string): Promise<boolean> {
  return partagerOuEnregistrer(await exporterJson(base, ids, nom), false)
}
