import { useEffect, useState } from 'react'

/**
 * Petit état mémorisé dans le navigateur (préférences d'affichage, filtres en cours).
 * Les recettes, elles, sont dans la base IndexedDB.
 */
export function useMemorise<T>(cle: string, initial: T, stockage: 'local' | 'session' = 'local') {
  const [valeur, setValeur] = useState<T>(() => {
    try {
      const brut = (stockage === 'local' ? localStorage : sessionStorage).getItem(cle)
      return brut === null ? initial : { ...initial, ...JSON.parse(brut) }
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      ;(stockage === 'local' ? localStorage : sessionStorage).setItem(cle, JSON.stringify(valeur))
    } catch {
      /* stockage indisponible : la valeur reste valable pour cette session */
    }
  }, [cle, valeur, stockage])

  return [valeur, setValeur] as const
}
