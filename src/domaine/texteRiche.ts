import { normaliser, trouverQuantites } from './analyse'
import type { Ingredient, NoeudRiche } from './modele'
import type { QuantiteSource } from './recalcul'

/**
 * Texte riche des étapes (format TipTap) : construction, lecture et balisage des quantités.
 * Une quantité recalculable est un nœud { type: 'quantite', attrs: { valeur, valeurMax, unite, ingredientId } }.
 */

export interface AttributsQuantite {
  valeur: number
  valeurMax: number | null
  unite: string
  ingredientId: string | null
}

export function noeudQuantite(attrs: AttributsQuantite): NoeudRiche {
  return { type: 'quantite', attrs: { ...attrs } }
}

export function documentVide(): NoeudRiche {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/** Lit les attributs d'un nœud quantité (tolérant aux données importées). */
export function attributsQuantite(n: NoeudRiche): AttributsQuantite | null {
  const a = n.attrs ?? {}
  if (typeof a.valeur !== 'number' || typeof a.unite !== 'string') return null
  return {
    valeur: a.valeur,
    valeurMax: typeof a.valeurMax === 'number' ? a.valeurMax : null,
    unite: a.unite,
    ingredientId: typeof a.ingredientId === 'string' ? a.ingredientId : null,
  }
}

export function sourceDeQuantite(a: AttributsQuantite, ingredients: Ingredient[] = []): QuantiteSource {
  const ingredient = a.ingredientId ? ingredients.find((i) => i.id === a.ingredientId) : undefined
  return {
    valeur: a.valeur,
    valeurMax: a.valeurMax ?? undefined,
    unite: a.unite,
    nom: ingredient?.nom,
    recalcul: ingredient?.recalcul,
  }
}

/** Texte brut d'un document (aperçus, recherche). Les quantités sont rendues par `rendreQuantite`. */
export function texteBrut(n: NoeudRiche, rendreQuantite: (a: AttributsQuantite) => string = () => '…'): string {
  if (n.type === 'text') return n.text ?? ''
  if (n.type === 'quantite') {
    const a = attributsQuantite(n)
    return a ? rendreQuantite(a) : ''
  }
  if (n.type === 'hardBreak') return '\n'
  const interieur = (n.content ?? []).map((c) => texteBrut(c, rendreQuantite)).join('')
  return n.type === 'paragraph' ? `${interieur}\n` : interieur
}

/** Vrai si le document ne contient aucun texte. */
export function estVide(doc: NoeudRiche): boolean {
  return texteBrut(doc, () => 'x').trim() === ''
}

/** Mot le plus significatif d'un nom d'ingrédient (« chocolat noir » → « chocolat »). */
function motsCles(nom: string): string[] {
  const vides = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'a', 'au', 'aux', 'en', 'et', 'd', 'l'])
  return normaliser(nom)
    .split(/[^a-z]+/)
    .filter((m) => m.length >= 3 && !vides.has(m))
}

/** Cherche l'ingrédient cité juste après une quantité (« 200 g de chocolat… »). */
export function relierIngredient(texteApres: string, ingredients: Ingredient[]): string | null {
  const suite = normaliser(texteApres.slice(0, 40))
  let meilleur: { id: string; position: number } | null = null
  for (const ing of ingredients) {
    for (const mot of motsCles(ing.nom)) {
      // Singulier et pluriel : « œuf » / « œufs ».
      const racine = mot.replace(/[sx]$/, '')
      const position = suite.search(new RegExp(`\\b${racine}`))
      if (position >= 0 && (!meilleur || position < meilleur.position)) meilleur = { id: ing.id, position }
    }
  }
  return meilleur?.id ?? null
}

/** Découpe un texte en morceaux de texte et quantités balisées. */
export function baliserTexte(texte: string, ingredients: Ingredient[] = []): NoeudRiche[] {
  const morceaux: NoeudRiche[] = []
  let curseur = 0
  for (const q of trouverQuantites(texte)) {
    if (q.debut > curseur) morceaux.push({ type: 'text', text: texte.slice(curseur, q.debut) })
    morceaux.push(
      noeudQuantite({
        valeur: q.valeur,
        valeurMax: q.valeurMax ?? null,
        unite: q.unite,
        ingredientId: relierIngredient(texte.slice(q.fin), ingredients),
      }),
    )
    curseur = q.fin
  }
  if (curseur < texte.length) morceaux.push({ type: 'text', text: texte.slice(curseur) })
  return morceaux
}

/** Document d'une étape à partir de texte simple (un paragraphe par ligne), quantités balisées. */
export function documentDepuisTexte(texte: string, ingredients: Ingredient[] = []): NoeudRiche {
  const lignes = texte.split(/\n+/).filter((l) => l.trim())
  if (lignes.length === 0) return documentVide()
  return {
    type: 'doc',
    content: lignes.map((l) => {
      const contenu = baliserTexte(l.trim(), ingredients)
      return contenu.length ? { type: 'paragraph', content: contenu } : { type: 'paragraph' }
    }),
  }
}
