import { type BrouillonRecette, nouvelId, type Recette, recetteSchema, type Version } from '../domaine/modele'
import { obtenirAppareil } from './appareil'
import { copierPhoto } from './photos'
import type { BaseQuanto } from './base'

/** Durée de conservation de la corbeille et de l'historique des versions. */
export const DUREE_CONSERVATION_MS = 30 * 24 * 60 * 60 * 1000

/** Horodatage strictement croissant, même pour deux modifications dans la même milliseconde. */
function apres(precedent: number, maintenant = Date.now()): number {
  return Math.max(maintenant, precedent + 1)
}

async function lire(db: BaseQuanto, id: string): Promise<Recette> {
  const recette = await db.recettes.get(id)
  if (!recette) throw new Error(`Recette introuvable : ${id}`)
  return recette
}

/** Crée une recette. Lève une erreur de validation si les données sont incomplètes. */
export async function creerRecette(db: BaseQuanto, brouillon: BrouillonRecette): Promise<Recette> {
  const appareil = await obtenirAppareil(db)
  const maintenant = Date.now()
  const recette = recetteSchema.parse({
    ...brouillon,
    id: nouvelId(),
    creeLe: maintenant,
    modifieLe: maintenant,
    modifiePar: appareil.id,
  })
  await db.recettes.add(recette)
  return recette
}

/**
 * Modifie une recette. La version précédente est conservée dans l'historique (30 jours).
 */
export async function modifierRecette(
  db: BaseQuanto,
  id: string,
  changements: Partial<BrouillonRecette>,
  options: { historiser?: boolean } = {},
): Promise<Recette> {
  const historiser = options.historiser ?? true
  const appareil = await obtenirAppareil(db)
  return db.transaction('rw', db.recettes, db.versions, async () => {
    const avant = await lire(db, id)
    const apresModif = recetteSchema.parse({
      ...avant,
      ...changements,
      id: avant.id,
      creeLe: avant.creeLe,
      modifieLe: apres(avant.modifieLe),
      modifiePar: appareil.id,
    })
    if (historiser) await db.versions.add({ recetteId: id, contenu: avant, date: Date.now() })
    await db.recettes.put(apresModif)
    return apresModif
  })
}

/** Ajoute ou retire des favoris (sans encombrer l'historique). */
export async function basculerFavori(db: BaseQuanto, id: string): Promise<boolean> {
  const recette = await lire(db, id)
  await modifierRecette(db, id, { favori: !recette.favori }, { historiser: false })
  return !recette.favori
}

/** Crée une copie d'une recette (photo comprise). */
export async function dupliquerRecette(db: BaseQuanto, id: string): Promise<Recette> {
  const { id: _id, creeLe: _c, modifieLe: _m, modifiePar: _p, supprimeLe: _s, ...contenu } = await lire(db, id)
  const photoId = contenu.photoId ? await copierPhoto(db, contenu.photoId) : undefined
  return creerRecette(db, { ...contenu, titre: `${contenu.titre} (copie)`, photoId, favori: false })
}

const CLE_CONSULTATIONS = 'consultations'

/** Mémorise la date de consultation d'une recette (pour le tri « dernières consultées »). Reste sur l'appareil. */
export async function noterConsultation(db: BaseQuanto, id: string): Promise<void> {
  const actuel = ((await db.reglages.get(CLE_CONSULTATIONS))?.valeur ?? {}) as Record<string, number>
  await db.reglages.put({ cle: CLE_CONSULTATIONS, valeur: { ...actuel, [id]: Date.now() } })
}

export async function lireConsultations(db: BaseQuanto): Promise<Record<string, number>> {
  return ((await db.reglages.get(CLE_CONSULTATIONS))?.valeur ?? {}) as Record<string, number>
}

/** Met une recette à la corbeille. Elle reste récupérable 30 jours. */
export async function supprimerRecette(db: BaseQuanto, id: string): Promise<void> {
  const appareil = await obtenirAppareil(db)
  const recette = await lire(db, id)
  const maintenant = apres(recette.modifieLe)
  await db.recettes.put({ ...recette, supprimeLe: maintenant, modifieLe: maintenant, modifiePar: appareil.id })
}

/** Sort une recette de la corbeille. */
export async function restaurerRecette(db: BaseQuanto, id: string): Promise<Recette> {
  const appareil = await obtenirAppareil(db)
  const recette = await lire(db, id)
  const restauree: Recette = { ...recette, modifieLe: apres(recette.modifieLe), modifiePar: appareil.id }
  delete restauree.supprimeLe
  await db.recettes.put(restauree)
  return restauree
}

/** Recettes actives (hors corbeille), les plus récemment modifiées d'abord. */
export async function listerRecettes(db: BaseQuanto): Promise<Recette[]> {
  const toutes = await db.recettes.orderBy('modifieLe').reverse().toArray()
  return toutes.filter((r) => r.supprimeLe === undefined)
}

export async function listerCorbeille(db: BaseQuanto): Promise<Recette[]> {
  const toutes = await db.recettes.orderBy('modifieLe').reverse().toArray()
  return toutes.filter((r) => r.supprimeLe !== undefined)
}

/** Anciennes versions d'une recette, les plus récentes d'abord. */
export async function historique(db: BaseQuanto, recetteId: string): Promise<Version[]> {
  const versions = await db.versions.where('recetteId').equals(recetteId).sortBy('date')
  return versions.reverse()
}

/** Remet une ancienne version en place (la version actuelle passe elle-même dans l'historique). */
export async function restaurerVersion(db: BaseQuanto, num: number): Promise<Recette> {
  const version = await db.versions.get(num)
  if (!version) throw new Error(`Version introuvable : ${num}`)
  const { id: _id, creeLe: _c, modifieLe: _m, modifiePar: _p, supprimeLe: _s, ...contenu } = version.contenu
  return modifierRecette(db, version.recetteId, contenu)
}

/**
 * Ménage : efface définitivement les recettes restées plus de 30 jours dans la corbeille
 * (en gardant une trace pour la synchronisation) et les versions de plus de 30 jours.
 */
export async function nettoyer(db: BaseQuanto, maintenant = Date.now()): Promise<{ recettes: number; versions: number }> {
  const limite = maintenant - DUREE_CONSERVATION_MS
  return db.transaction('rw', [db.recettes, db.versions, db.photos, db.effacements], async () => {
    const perimees = (await db.recettes.where('supprimeLe').below(limite).toArray()) as Recette[]
    for (const r of perimees) {
      await db.effacements.put({ id: r.id, date: maintenant })
      await db.versions.where('recetteId').equals(r.id).delete()
      if (r.photoId) await db.photos.delete(r.photoId)
      await db.recettes.delete(r.id)
    }
    const versions = await db.versions.where('date').below(limite).delete()
    // Photos qui ne servent plus à aucune recette ni à aucune version conservée.
    const utilisees = new Set<string>()
    await db.recettes.each((r) => r.photoId && utilisees.add(r.photoId))
    await db.versions.each((v) => v.contenu.photoId && utilisees.add(v.contenu.photoId))
    const orphelines = (await db.photos.toCollection().primaryKeys()).filter((id) => !utilisees.has(id))
    await db.photos.bulkDelete(orphelines)
    return { recettes: perimees.length, versions }
  })
}
