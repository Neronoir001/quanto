import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { nouvelId } from '../domaine/modele'
import { base, type BaseQuanto } from './base'

const TAILLE_IMAGE = 1600
const TAILLE_MINIATURE = 480

/** Réduit une image et la convertit en WebP (ou JPEG si le navigateur ne sait pas produire de WebP, comme Safari). */
async function reduire(source: Blob, tailleMax: number, qualite: number): Promise<Blob> {
  const image = await createImageBitmap(source)
  const echelle = Math.min(1, tailleMax / Math.max(image.width, image.height))
  const largeur = Math.round(image.width * echelle)
  const hauteur = Math.round(image.height * echelle)
  const toile = document.createElement('canvas')
  toile.width = largeur
  toile.height = hauteur
  const ctx = toile.getContext('2d')
  if (!ctx) throw new Error('Impossible de traiter cette image.')
  ctx.drawImage(image, 0, 0, largeur, hauteur)
  image.close()
  const versBlob = (type: string) => new Promise<Blob | null>((ok) => toile.toBlob(ok, type, qualite))
  const webp = await versBlob('image/webp')
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await versBlob('image/jpeg')
  if (!jpeg) throw new Error('Impossible de traiter cette image.')
  return jpeg
}

/** Compresse et enregistre une photo sur l'appareil. Renvoie son identifiant. */
export async function enregistrerPhoto(db: BaseQuanto, fichier: Blob): Promise<string> {
  if (!fichier.type.startsWith('image/')) throw new Error("Ce fichier n'est pas une image.")
  const [image, miniature] = await Promise.all([reduire(fichier, TAILLE_IMAGE, 0.82), reduire(fichier, TAILLE_MINIATURE, 0.78)])
  const id = nouvelId()
  await db.photos.add({ id, image, miniature, modifieLe: Date.now() })
  return id
}

/** Télécharge une image depuis une adresse web. Échoue si le site l'interdit. */
export async function telechargerImage(url: string): Promise<Blob> {
  let reponse: Response
  try {
    reponse = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error("Ce site n'autorise pas la récupération de l'image. Enregistrez-la sur votre appareil, puis importez-la.")
  }
  if (!reponse.ok) throw new Error(`Image introuvable (erreur ${reponse.status}).`)
  const blob = await reponse.blob()
  if (!blob.type.startsWith('image/')) throw new Error("Cette adresse ne mène pas à une image.")
  return blob
}

/** Copie une photo (pour dupliquer une recette). */
export async function copierPhoto(db: BaseQuanto, id: string): Promise<string | undefined> {
  const photo = await db.photos.get(id)
  if (!photo) return undefined
  const copie = { ...photo, id: nouvelId(), modifieLe: Date.now() }
  await db.photos.add(copie)
  return copie.id
}

/** Adresse affichable d'une photo enregistrée (libérée automatiquement). */
export function usePhoto(id: string | undefined, taille: 'image' | 'miniature' = 'miniature'): string | undefined {
  const photo = useLiveQuery(() => (id ? base.photos.get(id) : undefined), [id])
  const blob = photo ? photo[taille] : undefined
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}
