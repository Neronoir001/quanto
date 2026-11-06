import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import type { BaseQuanto } from '../donnees/base'
import { obtenirAppareil } from '../donnees/appareil'
import type { Recette } from '../domaine/modele'
import { appliquerPaquet, lirePaquet, type Paquet, paquetDepuis, recevoirPhoto, type ResultatFusion } from './echange'

/**
 * Fichier du carnet (.zip) : sert au transfert entre appareils et à la sauvegarde.
 * Contenu : « quanto.json » (recettes, collections, effacements) et le dossier « photos/ ».
 * Le format est ouvert et documenté dans le guide utilisateur.
 */

export const FORMAT = 'quanto-carnet'
export const VERSION_FORMAT = 1

const CLE_DERNIER_ENVOI = 'dernierEnvoiFichier'
const CLE_DERNIERE_SAUVEGARDE = 'derniereSauvegarde'

export type ModeExport = 'complet' | 'nouveautes'

async function lireDate(db: BaseQuanto, cle: string): Promise<number | undefined> {
  return (await db.reglages.get(cle))?.valeur as number | undefined
}

export const dateDernierEnvoi = (db: BaseQuanto) => lireDate(db, CLE_DERNIER_ENVOI)
export const dateDerniereSauvegarde = (db: BaseQuanto) => lireDate(db, CLE_DERNIERE_SAUVEGARDE)

const extension = (type: string) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg')

function nomFichier(mode: ModeExport): string {
  const jour = new Date().toLocaleDateString('fr-CA') // AAAA-MM-JJ
  return `Quanto - ${mode === 'complet' ? 'carnet complet' : 'nouveautés'} - ${jour}.zip`
}

/** Prépare le fichier du carnet. Renvoie aussi le nombre de recettes incluses. */
export async function exporterCarnet(db: BaseQuanto, mode: ModeExport): Promise<{ fichier: File; recettes: number }> {
  const depuis = mode === 'nouveautes' ? ((await dateDernierEnvoi(db)) ?? 0) : 0
  const paquet = await paquetDepuis(db, depuis)
  return { fichier: await fabriquerZip(db, paquet, mode, nomFichier(mode)), recettes: paquet.recettes.length }
}

/** Nom de fichier sans caractères interdits. */
const nettoyerNom = (nom: string) => nom.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'recettes'

/** Une sélection de recettes (une recette, un carnet) en fichier Quanto, avec leurs carnets et leurs photos. */
export async function exporterRecettes(db: BaseQuanto, ids: string[], nom: string): Promise<File> {
  const recettes = (await db.recettes.bulkGet(ids)).filter((r): r is Recette => !!r && r.supprimeLe === undefined)
  const idsCarnets = new Set(recettes.flatMap((r) => r.collections))
  const collections = (await db.collections.toArray()).filter((c) => idsCarnets.has(c.id) && c.supprimeLe === undefined)
  const photos = [...new Set(recettes.map((r) => r.photoId).filter((id): id is string => !!id))]
  return fabriquerZip(db, { recettes, collections, effacements: [], photos }, 'selection', `Quanto - ${nettoyerNom(nom)}.zip`)
}

/** Format JSON ouvert, sans les photos : pour garder une trace lisible ou migrer vers un autre logiciel. */
export async function exporterJson(db: BaseQuanto, ids: string[], nom: string): Promise<File> {
  const recettes = (await db.recettes.bulkGet(ids)).filter((r): r is Recette => !!r)
  const json = { format: FORMAT, version: VERSION_FORMAT, cree: Date.now(), mode: 'selection', recettes, collections: [], effacements: [], photos: [] }
  return new File([JSON.stringify(json, null, 2)], `Quanto - ${nettoyerNom(nom)}.json`, { type: 'application/json' })
}

async function fabriquerZip(db: BaseQuanto, paquet: Paquet, mode: string, nom: string): Promise<File> {
  const appareil = await obtenirAppareil(db)

  const contenu: Zippable = {}
  const photos: Record<string, { image: string; miniature: string; modifieLe: number }> = {}
  for (const id of paquet.photos) {
    const photo = await db.photos.get(id)
    if (!photo) continue
    const image = `photos/${id}.${extension(photo.image.type)}`
    const miniature = `photos/${id}-mini.${extension(photo.miniature.type)}`
    // Les images sont déjà compressées : inutile de les recompresser (niveau 0).
    contenu[image] = [new Uint8Array(await photo.image.arrayBuffer()), { level: 0 }]
    contenu[miniature] = [new Uint8Array(await photo.miniature.arrayBuffer()), { level: 0 }]
    photos[id] = { image, miniature, modifieLe: photo.modifieLe }
  }

  const json = {
    format: FORMAT,
    version: VERSION_FORMAT,
    cree: Date.now(),
    appareil: { id: appareil.id, nom: appareil.nom },
    mode,
    ...paquet,
    fichiersPhotos: photos,
  }
  contenu['quanto.json'] = strToU8(JSON.stringify(json, null, 1))

  const zip = zipSync(contenu, { level: 6 })
  return new File([zip], nom, { type: 'application/zip' })
}

/** À appeler une fois le fichier réellement partagé ou enregistré. */
export async function noterEnvoi(db: BaseQuanto, mode: ModeExport): Promise<void> {
  const maintenant = Date.now()
  await db.reglages.put({ cle: CLE_DERNIER_ENVOI, valeur: maintenant })
  if (mode === 'complet') await db.reglages.put({ cle: CLE_DERNIERE_SAUVEGARDE, valeur: maintenant })
}

export interface ResultatImport extends ResultatFusion {
  ignorees: number
  photos: number
  provenance?: string
}

const typeImage = (chemin: string) =>
  chemin.endsWith('.webp') ? 'image/webp' : chemin.endsWith('.png') ? 'image/png' : 'image/jpeg'

/** Importe un fichier de carnet (.zip) ou un export JSON, et fusionne son contenu. */
export async function importerFichier(db: BaseQuanto, fichier: Blob): Promise<ResultatImport> {
  const octets = new Uint8Array(await fichier.arrayBuffer())
  const estZip = octets[0] === 0x50 && octets[1] === 0x4b // « PK »
  let fichiers: Record<string, Uint8Array> = {}
  let texte: string
  if (estZip) {
    try {
      fichiers = unzipSync(octets)
    } catch {
      throw new Error("Ce fichier .zip est abîmé ou n'est pas un carnet Quanto.")
    }
    if (!fichiers['quanto.json']) throw new Error("Ce fichier n'est pas un carnet Quanto.")
    texte = strFromU8(fichiers['quanto.json'])
  } else {
    texte = strFromU8(octets)
  }

  let brut: Record<string, unknown>
  try {
    brut = JSON.parse(texte)
  } catch {
    throw new Error("Ce fichier n'est pas un carnet Quanto.")
  }
  if (brut.format !== FORMAT) throw new Error("Ce fichier n'est pas un carnet Quanto.")
  if (typeof brut.version === 'number' && brut.version > VERSION_FORMAT) {
    throw new Error('Ce carnet vient d’une version plus récente de Quanto : mettez d’abord l’application à jour.')
  }

  const { paquet, ignorees } = lirePaquet(brut)

  // Photos d'abord, pour que les recettes s'affichent aussitôt avec leur image.
  let photos = 0
  const index = (brut.fichiersPhotos ?? {}) as Record<string, { image: string; miniature: string; modifieLe: number }>
  for (const [id, f] of Object.entries(index)) {
    const image = fichiers[f.image]
    const miniature = fichiers[f.miniature]
    if (!image || !miniature) continue
    await recevoirPhoto(db, {
      id,
      image: new Blob([image.slice()], { type: typeImage(f.image) }),
      miniature: new Blob([miniature.slice()], { type: typeImage(f.miniature) }),
      modifieLe: f.modifieLe,
    })
    photos++
  }

  const resultat = await appliquerPaquet(db, paquet)
  const appareil = brut.appareil as { nom?: string } | undefined
  return { ...resultat, ignorees, photos, provenance: appareil?.nom }
}
