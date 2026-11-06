import { useLiveQuery } from 'dexie-react-hooks'
import { type Collection, collectionSchema, nouvelId } from '../domaine/modele'
import { obtenirAppareil } from './appareil'
import { base, type BaseQuanto } from './base'
import { modifierRecette } from './recettes'

/**
 * Carnets (collections) : ranger ses recettes par thème (« Noël », « Desserts du dimanche »…).
 * Une recette peut être dans plusieurs carnets. Les carnets se synchronisent comme les recettes.
 */

/** Couleurs proposées pour les carnets (accordées à la palette de Quanto). */
export const COULEURS_CARNETS = ['#A84F2D', '#5B6B4E', '#C9A45C', '#9A4A45', '#3F6878', '#6B5E55']

export async function listerCollections(db: BaseQuanto): Promise<Collection[]> {
  const toutes = await db.collections.toArray()
  return toutes.filter((c) => c.supprimeLe === undefined).sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'))
}

export function useCollections(): Collection[] | undefined {
  return useLiveQuery(() => listerCollections(base), [])
}

export async function creerCollection(db: BaseQuanto, nom: string, couleur?: string): Promise<Collection> {
  const appareil = await obtenirAppareil(db)
  const existantes = await listerCollections(db)
  const maintenant = Date.now()
  const c = collectionSchema.parse({
    id: nouvelId(),
    nom,
    couleur: couleur ?? COULEURS_CARNETS[existantes.length % COULEURS_CARNETS.length],
    ordre: existantes.length,
    creeLe: maintenant,
    modifieLe: maintenant,
    modifiePar: appareil.id,
  })
  await db.collections.add(c)
  return c
}

export async function modifierCollection(db: BaseQuanto, id: string, changements: Partial<Pick<Collection, 'nom' | 'couleur' | 'ordre'>>): Promise<void> {
  const appareil = await obtenirAppareil(db)
  const c = await db.collections.get(id)
  if (!c) throw new Error('Carnet introuvable')
  await db.collections.put(
    collectionSchema.parse({ ...c, ...changements, modifieLe: Math.max(Date.now(), c.modifieLe + 1), modifiePar: appareil.id }),
  )
}

/** Supprime un carnet. Les recettes qu'il contenait ne sont pas touchées. */
export async function supprimerCollection(db: BaseQuanto, id: string): Promise<void> {
  const appareil = await obtenirAppareil(db)
  const c = await db.collections.get(id)
  if (!c) return
  const maintenant = Math.max(Date.now(), c.modifieLe + 1)
  await db.collections.put({ ...c, supprimeLe: maintenant, modifieLe: maintenant, modifiePar: appareil.id })
}

/** Range une recette dans les carnets choisis (sans encombrer l'historique). */
export async function rangerRecette(db: BaseQuanto, recetteId: string, collections: string[]): Promise<void> {
  await modifierRecette(db, recetteId, { collections: [...new Set(collections)] }, { historiser: false })
}

/** Ajoute ou retire une recette d'un carnet, à partir de son état enregistré (jamais d'une copie périmée). */
export async function basculerCarnet(db: BaseQuanto, recetteId: string, carnetId: string, present: boolean): Promise<void> {
  const r = await db.recettes.get(recetteId)
  if (!r) return
  const collections = present ? [...r.collections, carnetId] : r.collections.filter((c) => c !== carnetId)
  await rangerRecette(db, recetteId, collections)
}
