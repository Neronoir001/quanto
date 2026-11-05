import { INSECABLE, nombre } from './format'

/**
 * Contenants (moules et plats) et calcul du coefficient entre deux contenants.
 * Voir le cahier des charges, § 6.4 et annexe B.
 */

export type TypeContenant = 'rond' | 'carre' | 'rectangulaire' | 'cake' | 'volume'

export interface Contenant {
  type: TypeContenant
  /** cm — moule rond */
  diametre?: number
  /** cm — moule carré */
  cote?: number
  /** cm — plat rectangulaire, moule à cake */
  longueur?: number
  /** cm — plat rectangulaire, moule à cake */
  largeur?: number
  /** cm — moule à cake (obligatoire) ; autres moules (facultatif, 5 cm par défaut) */
  hauteur?: number
  /** litres — volume libre */
  volume?: number
}

/** Hauteur utilisée pour comparer un moule « surface » à un contenant « volume ». */
export const HAUTEUR_PAR_DEFAUT = 5

export const LIBELLES_TYPES: Record<TypeContenant, string> = {
  rond: 'Moule rond',
  carre: 'Moule carré',
  rectangulaire: 'Plat rectangulaire',
  cake: 'Moule à cake',
  volume: 'Volume libre',
}

/** Raccourcis pour les moules courants. */
export const MOULES_COURANTS: Contenant[] = [
  { type: 'rond', diametre: 18 },
  { type: 'rond', diametre: 20 },
  { type: 'rond', diametre: 22 },
  { type: 'rond', diametre: 24 },
  { type: 'rond', diametre: 26 },
  { type: 'rond', diametre: 28 },
  { type: 'carre', cote: 20 },
  { type: 'carre', cote: 24 },
  { type: 'rectangulaire', longueur: 30, largeur: 20 },
  { type: 'cake', longueur: 26, largeur: 10, hauteur: 8 },
]

const positif = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

export function estSurface(type: TypeContenant): boolean {
  return type === 'rond' || type === 'carre' || type === 'rectangulaire'
}

/** Vrai si toutes les dimensions nécessaires au calcul sont renseignées. */
export function estComplet(c: Contenant): boolean {
  switch (c.type) {
    case 'rond':
      return positif(c.diametre)
    case 'carre':
      return positif(c.cote)
    case 'rectangulaire':
      return positif(c.longueur) && positif(c.largeur)
    case 'cake':
      return positif(c.longueur) && positif(c.largeur) && positif(c.hauteur)
    case 'volume':
      return positif(c.volume)
  }
}

/** Surface du fond en cm² (moules rond, carré, rectangulaire). */
export function surface(c: Contenant): number {
  switch (c.type) {
    case 'rond':
      return Math.PI * ((c.diametre ?? 0) / 2) ** 2
    case 'carre':
      return (c.cote ?? 0) ** 2
    case 'rectangulaire':
      return (c.longueur ?? 0) * (c.largeur ?? 0)
    case 'cake':
      return (c.longueur ?? 0) * (c.largeur ?? 0)
    case 'volume':
      return 0
  }
}

/** Volume en cm³ (1 L = 1 000 cm³). */
export function volume(c: Contenant): number {
  if (c.type === 'volume') return (c.volume ?? 0) * 1000
  if (c.type === 'cake') return surface(c) * (c.hauteur ?? 0)
  return surface(c) * (positif(c.hauteur) ? c.hauteur : HAUTEUR_PAR_DEFAUT)
}

/**
 * Coefficient pour passer du contenant de référence au contenant cible.
 * - surface → surface : rapport des surfaces (même hauteur supposée) ;
 * - sinon : rapport des volumes (hauteur par défaut pour les moules « surface »).
 * Renvoie `null` si l'un des contenants est incomplet.
 */
export function ratioContenants(reference: Contenant, cible: Contenant): number | null {
  if (!estComplet(reference) || !estComplet(cible)) return null
  if (estSurface(reference.type) && estSurface(cible.type)) return surface(cible) / surface(reference)
  return volume(cible) / volume(reference)
}

const cm = (n: number | undefined) => `${nombre(n ?? 0, 1)}${INSECABLE}cm`

/** Description lisible : « moule rond de 24 cm ». */
export function decrireContenant(c: Contenant): string {
  switch (c.type) {
    case 'rond':
      return `moule rond de ${cm(c.diametre)}`
    case 'carre':
      return `moule carré de ${cm(c.cote)}`
    case 'rectangulaire':
      return `plat de ${nombre(c.longueur ?? 0, 1)} × ${cm(c.largeur)}`
    case 'cake':
      return `moule à cake de ${nombre(c.longueur ?? 0, 1)} × ${nombre(c.largeur ?? 0, 1)} × ${cm(c.hauteur)}`
    case 'volume':
      return `contenant de ${nombre(c.volume ?? 0, 2)}${INSECABLE}L`
  }
}
