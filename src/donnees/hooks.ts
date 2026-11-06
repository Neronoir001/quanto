import { useLiveQuery } from 'dexie-react-hooks'
import type { Recette } from '../domaine/modele'
import { base } from './base'
import { listerCorbeille, listerRecettes, lireConsultations } from './recettes'

/** Recettes actives, mises à jour automatiquement. `undefined` pendant le chargement. */
export function useRecettes(): Recette[] | undefined {
  return useLiveQuery(() => listerRecettes(base), [])
}

/** Une recette (`null` si introuvable, `undefined` pendant le chargement). */
export function useRecette(id: string | undefined): Recette | null | undefined {
  return useLiveQuery(async () => (id ? ((await base.recettes.get(id)) ?? null) : null), [id])
}

export function useCorbeille(): Recette[] | undefined {
  return useLiveQuery(() => listerCorbeille(base), [])
}

export function useConsultations(): Record<string, number> {
  return useLiveQuery(() => lireConsultations(base), []) ?? {}
}
