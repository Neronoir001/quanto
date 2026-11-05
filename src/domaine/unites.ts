/**
 * Catalogue des unités de Quanto.
 *
 * Chaque unité appartient à une famille, qui décide de la façon dont elle est
 * recalculée, convertie et arrondie (voir le cahier des charges, annexe A).
 */

export type Famille = 'masse' | 'volume' | 'cuillere' | 'piece' | 'conditionnement' | 'non-mesurable'

export interface Unite {
  id: string
  /** Libellé au singulier, tel qu'affiché après le nombre. Vide pour « unité » (« 3 œufs »). */
  singulier: string
  /** Libellé au pluriel (à partir de 2). */
  pluriel: string
  famille: Famille
  /** Valeur dans l'unité de base de la famille : g pour la masse, ml pour le volume, càc pour les cuillères. */
  facteur: number
}

const u = (id: string, singulier: string, pluriel: string, famille: Famille, facteur = 1): Unite => ({
  id,
  singulier,
  pluriel,
  famille,
  facteur,
})

export const UNITES: readonly Unite[] = [
  // Masse (base : gramme)
  u('g', 'g', 'g', 'masse', 1),
  u('kg', 'kg', 'kg', 'masse', 1000),
  // Volume (base : millilitre)
  u('ml', 'ml', 'ml', 'volume', 1),
  u('cl', 'cl', 'cl', 'volume', 10),
  u('dl', 'dl', 'dl', 'volume', 100),
  u('l', 'L', 'L', 'volume', 1000),
  // Cuillères (base : cuillère à café)
  u('cac', 'càc', 'càc', 'cuillere', 1),
  u('cas', 'càs', 'càs', 'cuillere', 3),
  // Pièces : arrondi à l'entier ou fourchette « 2 à 3 »
  u('piece', '', '', 'piece'),
  u('gousse', 'gousse', 'gousses', 'piece'),
  u('tranche', 'tranche', 'tranches', 'piece'),
  u('botte', 'botte', 'bottes', 'piece'),
  u('brin', 'brin', 'brins', 'piece'),
  // Conditionnements : arrondi à la demi-unité
  u('sachet', 'sachet', 'sachets', 'conditionnement'),
  u('feuille', 'feuille', 'feuilles', 'conditionnement'),
  u('pot', 'pot', 'pots', 'conditionnement'),
  u('boite', 'boîte', 'boîtes', 'conditionnement'),
  u('poignee', 'poignée', 'poignées', 'conditionnement'),
  // Non mesurables : jamais recalculés
  u('pincee', 'pincée', 'pincées', 'non-mesurable'),
  u('filet', 'filet', 'filets', 'non-mesurable'),
  u('qs', 'QS', 'QS', 'non-mesurable'),
  u('au-gout', 'au goût', 'au goût', 'non-mesurable'),
]

const PAR_ID = new Map(UNITES.map((x) => [x.id, x]))

export function unite(id: string): Unite {
  const trouvee = PAR_ID.get(id)
  if (!trouvee) throw new Error(`Unité inconnue : ${id}`)
  return trouvee
}

export function estUniteConnue(id: string): boolean {
  return PAR_ID.has(id)
}

/** Libellé accordé : pluriel à partir de 2, comme en français. */
export function libelle(u: Unite, valeur: number): string {
  return valeur >= 2 ? u.pluriel : u.singulier
}
