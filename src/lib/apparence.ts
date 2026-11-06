import { useEffect, useState } from 'react'

/**
 * Préférences d'affichage propres à cet appareil : thème et taille du texte.
 * Gardées dans le navigateur pour s'appliquer dès l'ouverture, sans éclair blanc (voir index.html).
 */

export type Theme = 'auto' | 'clair' | 'sombre'
export type TailleTexte = 'normal' | 'grand' | 'tres-grand'

function lire<T extends string>(cle: string, defaut: T): T {
  try {
    return (localStorage.getItem(cle) as T | null) ?? defaut
  } catch {
    return defaut
  }
}

function appliquer(attribut: 'theme' | 'texte', valeur: string, neutre: string) {
  if (valeur === neutre) delete document.documentElement.dataset[attribut]
  else document.documentElement.dataset[attribut] = valeur
}

function usePreference<T extends string>(cle: string, attribut: 'theme' | 'texte', neutre: T) {
  const [valeur, setValeur] = useState<T>(() => lire(cle, neutre))
  useEffect(() => {
    appliquer(attribut, valeur, neutre)
    try {
      if (valeur === neutre) localStorage.removeItem(cle)
      else localStorage.setItem(cle, valeur)
    } catch {
      /* stockage indisponible : le choix vaut pour cette session */
    }
  }, [cle, attribut, neutre, valeur])
  return [valeur, setValeur] as const
}

export const useTheme = () => usePreference<Theme>('quanto.theme', 'theme', 'auto')
export const useTailleTexte = () => usePreference<TailleTexte>('quanto.texte', 'texte', 'normal')
