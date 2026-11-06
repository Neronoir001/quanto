import type { Recette } from '../domaine/modele'
import type { Cible } from '../domaine/recalcul'

/**
 * Recalcul choisi pour une recette, gardé le temps de la session :
 * il suit la recette de la fiche au mode cuisine, et quand on revient après une modification.
 */
const cle = (id: string) => `quanto.recalcul.${id}`

export function lireCible(r: Recette): Cible | null {
  try {
    const memorisee = JSON.parse(sessionStorage.getItem(cle(r.id)) ?? 'null') as Cible | null
    if (memorisee?.mode === 'personnes' && r.reference.personnes) return memorisee
    if (memorisee?.mode === 'contenant' && r.reference.contenant) return memorisee
  } catch {
    /* rien de mémorisé */
  }
  if (r.reference.personnes) return { mode: 'personnes', personnes: r.reference.personnes }
  if (r.reference.contenant) return { mode: 'contenant', contenant: { ...r.reference.contenant } }
  return null
}

export function ecrireCible(id: string, cible: Cible): void {
  try {
    sessionStorage.setItem(cle(id), JSON.stringify(cible))
  } catch {
    /* stockage indisponible */
  }
}
