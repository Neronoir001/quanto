import { z } from 'zod'
import { type Collection, collectionSchema, type Effacement, type Photo, type Recette, recetteSchema } from '../domaine/modele'
import type { BaseQuanto } from '../donnees/base'

/**
 * Échange de données entre deux appareils (Wi-Fi ou fichier).
 *
 * Règles de fusion (cahier des charges, § 6.7) :
 * - chaque recette a un identifiant unique : jamais de doublon ;
 * - la version la plus récente l'emporte, l'autre va dans l'historique (30 jours) ;
 * - les suppressions se propagent (corbeille, puis trace d'effacement définitif).
 */

/** Ce qu'un appareil possède : sert à calculer ce qu'il faut lui envoyer. */
export interface Inventaire {
  recettes: [string, number][]
  collections: [string, number][]
  effacements: string[]
  photos: string[]
}

/** Données échangées (sans les photos, transmises à part). */
export interface Paquet {
  recettes: Recette[]
  collections: Collection[]
  effacements: Effacement[]
  /** Identifiants des photos qui accompagnent ce paquet. */
  photos: string[]
}

export interface ResultatFusion {
  nouvelles: number
  misesAJour: number
  supprimees: number
}

export async function inventaire(db: BaseQuanto): Promise<Inventaire> {
  const [recettes, collections, effacements, photos] = await Promise.all([
    db.recettes.toArray(),
    db.collections.toArray(),
    db.effacements.toCollection().primaryKeys(),
    db.photos.toCollection().primaryKeys(),
  ])
  return {
    recettes: recettes.map((r) => [r.id, r.modifieLe]),
    collections: collections.map((c) => [c.id, c.modifieLe]),
    effacements,
    photos,
  }
}

/** Ce qu'il faut envoyer à un appareil dont on connaît l'inventaire. */
export async function paquetPour(db: BaseQuanto, autre: Inventaire): Promise<Paquet> {
  const ses = { recettes: new Map(autre.recettes), collections: new Map(autre.collections) }
  const effaces = new Set(autre.effacements)
  const photosConnues = new Set(autre.photos)
  const plusRecent = (map: Map<string, number>, id: string, date: number) => !map.has(id) || date > map.get(id)!

  const recettes = (await db.recettes.toArray()).filter((r) => !effaces.has(r.id) && plusRecent(ses.recettes, r.id, r.modifieLe))
  const collections = (await db.collections.toArray()).filter((c) => plusRecent(ses.collections, c.id, c.modifieLe))
  const effacements = (await db.effacements.toArray()).filter((e) => !effaces.has(e.id))
  const photos = [...new Set(recettes.map((r) => r.photoId).filter((id): id is string => !!id && !photosConnues.has(id)))]
  return { recettes, collections, effacements, photos }
}

/** Tout ce qui a changé depuis une date (fichier « nouveautés »), ou tout (sauvegarde complète). */
export async function paquetDepuis(db: BaseQuanto, depuis = 0): Promise<Paquet> {
  const recettes = await db.recettes.where('modifieLe').above(depuis).toArray()
  const collections = await db.collections.where('modifieLe').above(depuis).toArray()
  const effacements = await db.effacements.where('date').above(depuis).toArray()
  const photos = [...new Set(recettes.map((r) => r.photoId).filter((id): id is string => !!id))]
  return { recettes, collections, effacements, photos }
}

const paquetSchema = z.object({
  recettes: z.array(z.unknown()),
  collections: z.array(z.unknown()),
  effacements: z.array(z.object({ id: z.string(), date: z.number() })),
  photos: z.array(z.string()),
})

/** Vérifie un paquet reçu (fichier ou Wi-Fi). Les recettes invalides sont écartées. */
export function lirePaquet(brut: unknown): { paquet: Paquet; ignorees: number } {
  const p = paquetSchema.parse(brut)
  const recettes: Recette[] = []
  const collections: Collection[] = []
  let ignorees = 0
  for (const r of p.recettes) {
    const ok = recetteSchema.safeParse(r)
    if (ok.success) recettes.push(ok.data)
    else ignorees++
  }
  for (const c of p.collections) {
    const ok = collectionSchema.safeParse(c)
    if (ok.success) collections.push(ok.data)
  }
  return { paquet: { recettes, collections, effacements: p.effacements, photos: p.photos }, ignorees }
}

/** Intègre un paquet reçu dans la base locale. */
export async function appliquerPaquet(db: BaseQuanto, paquet: Paquet): Promise<ResultatFusion> {
  const resultat: ResultatFusion = { nouvelles: 0, misesAJour: 0, supprimees: 0 }
  await db.transaction('rw', [db.recettes, db.versions, db.collections, db.effacements], async () => {
    // 1. Effacements définitifs : la recette disparaît ici aussi.
    for (const e of paquet.effacements) {
      if (await db.effacements.get(e.id)) continue
      await db.effacements.put(e)
      if (await db.recettes.get(e.id)) {
        await db.recettes.delete(e.id)
        await db.versions.where('recetteId').equals(e.id).delete()
        resultat.supprimees++
      }
    }
    const effaces = new Set(await db.effacements.toCollection().primaryKeys())

    // 2. Recettes : la plus récente l'emporte, l'autre version est gardée dans l'historique.
    for (const r of paquet.recettes) {
      if (effaces.has(r.id)) continue
      const locale = await db.recettes.get(r.id)
      if (!locale) {
        await db.recettes.add(r)
        if (r.supprimeLe === undefined) resultat.nouvelles++
        continue
      }
      if (r.modifieLe <= locale.modifieLe) continue
      await db.versions.add({ recetteId: r.id, contenu: locale, date: Date.now() })
      await db.recettes.put(r)
      if (r.supprimeLe !== undefined && locale.supprimeLe === undefined) resultat.supprimees++
      else resultat.misesAJour++
    }

    // 3. Collections : la plus récente l'emporte.
    for (const c of paquet.collections) {
      const locale = await db.collections.get(c.id)
      if (!locale || c.modifieLe > locale.modifieLe) await db.collections.put(c)
    }
  })
  return resultat
}

/** Enregistre une photo reçue, sauf si elle est déjà là (les photos ne changent jamais). */
export async function recevoirPhoto(db: BaseQuanto, photo: Photo): Promise<void> {
  if (!(await db.photos.get(photo.id))) await db.photos.put(photo)
}
