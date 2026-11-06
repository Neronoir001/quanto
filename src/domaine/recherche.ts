import MiniSearch from 'minisearch'
import { normaliser } from './analyse'
import type { Categorie, Difficulte, Recette } from './modele'

/** Critères de la liste des recettes. */
export interface Criteres {
  texte: string
  categories: Categorie[]
  difficultes: Difficulte[]
  /** Temps total maximum, en minutes. */
  tempsMax?: number
  tags: string[]
  favorisSeulement: boolean
  /** Identifiant du carnet affiché, s'il y en a un. */
  carnet?: string
  tri: 'recentes' | 'alphabetique' | 'temps' | 'consultees'
}

export const CRITERES_VIDES: Criteres = {
  texte: '',
  categories: [],
  difficultes: [],
  tags: [],
  favorisSeulement: false,
  tri: 'recentes',
}

export function tempsTotal(r: Recette): number {
  return (r.tempsPreparation ?? 0) + (r.tempsCuisson ?? 0) + (r.tempsRepos ?? 0)
}

/** Durée lisible : 90 → « 1 h 30 », 45 → « 45 min ». */
export function formaterDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** Index de recherche : titre, ingrédients, tags et notes ; tolérant aux accents et aux fautes de frappe. */
export function construireIndex(recettes: Recette[]): MiniSearch {
  const index = new MiniSearch({
    fields: ['titre', 'ingredients', 'tags', 'notes'],
    storeFields: [],
    processTerm: (terme) => normaliser(terme),
    searchOptions: { boost: { titre: 3, ingredients: 1.5, tags: 2 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  })
  index.addAll(
    recettes.map((r) => ({
      id: r.id,
      titre: r.titre,
      ingredients: r.ingredients.map((i) => i.nom).join(' '),
      tags: r.tags.join(' '),
      notes: r.notes ?? '',
    })),
  )
  return index
}

export function filtrerRecettes(
  recettes: Recette[],
  index: MiniSearch,
  c: Criteres,
  consultations: Record<string, number> = {},
): Recette[] {
  let resultat = recettes
  let scores: Map<string, number> | null = null

  if (c.texte.trim()) {
    const trouves = index.search(c.texte)
    scores = new Map(trouves.map((t) => [String(t.id), t.score]))
    resultat = resultat.filter((r) => scores!.has(r.id))
  }
  if (c.categories.length) resultat = resultat.filter((r) => c.categories.includes(r.categorie))
  if (c.difficultes.length) resultat = resultat.filter((r) => c.difficultes.includes(r.difficulte))
  if (c.tempsMax) resultat = resultat.filter((r) => tempsTotal(r) > 0 && tempsTotal(r) <= c.tempsMax!)
  if (c.tags.length) resultat = resultat.filter((r) => c.tags.every((t) => r.tags.includes(t)))
  if (c.favorisSeulement) resultat = resultat.filter((r) => r.favori)
  if (c.carnet) resultat = resultat.filter((r) => r.collections.includes(c.carnet!))

  const trie = [...resultat]
  // Avec une recherche, les plus pertinentes d'abord.
  if (scores && c.tri === 'recentes') return trie.sort((a, b) => scores!.get(b.id)! - scores!.get(a.id)!)
  switch (c.tri) {
    case 'alphabetique':
      return trie.sort((a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' }))
    case 'temps':
      return trie.sort((a, b) => (tempsTotal(a) || Infinity) - (tempsTotal(b) || Infinity))
    case 'consultees':
      return trie.sort((a, b) => (consultations[b.id] ?? 0) - (consultations[a.id] ?? 0))
    default:
      return trie.sort((a, b) => b.modifieLe - a.modifieLe)
  }
}

/** Tous les tags utilisés, du plus fréquent au moins fréquent. */
export function tousLesTags(recettes: Recette[]): string[] {
  const compte = new Map<string, number>()
  for (const r of recettes) for (const t of r.tags) compte.set(t, (compte.get(t) ?? 0) + 1)
  return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([t]) => t)
}
