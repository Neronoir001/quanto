import { type Categorie, nouvelId } from './modele'
import { analyserTexte, type LigneImport, type RecetteAnalysee } from './importTexte'

/**
 * Lecture de la « fiche recette » standard (schema.org/Recipe, au format JSON-LD)
 * que publient la plupart des sites de cuisine (Marmiton, 750g, Cuisine AZ…).
 */

type Json = unknown

const texte = (v: Json): string => {
  if (typeof v === 'string') return decoderEntites(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (typeof v === 'number') return String(v)
  return ''
}

function decoderEntites(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

const estType = (o: Record<string, Json>, type: string) => {
  const t = o['@type']
  return t === type || (Array.isArray(t) && t.includes(type))
}

/** Trouve l'objet Recipe dans n'importe quelle structure JSON-LD (tableau, @graph…). */
export function trouverRecette(donnees: Json): Record<string, Json> | null {
  if (Array.isArray(donnees)) {
    for (const d of donnees) {
      const r = trouverRecette(d)
      if (r) return r
    }
    return null
  }
  if (!donnees || typeof donnees !== 'object') return null
  const o = donnees as Record<string, Json>
  if (estType(o, 'Recipe')) return o
  if (o['@graph']) return trouverRecette(o['@graph'])
  if (o.mainEntity) return trouverRecette(o.mainEntity)
  return null
}

/** Durée ISO 8601 (« PT1H30M ») en minutes. */
export function lireDureeIso(v: Json): number | undefined {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(texte(v))
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return total > 0 ? total : undefined
}

function lirePersonnes(v: Json): number | undefined {
  const valeurs = Array.isArray(v) ? v : [v]
  for (const x of valeurs) {
    const m = /(\d+)/.exec(texte(x))
    if (m && Number(m[1]) > 0 && Number(m[1]) < 200) return Number(m[1])
  }
  return undefined
}

function lireImage(v: Json): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return lireImage(v[0])
  if (v && typeof v === 'object') return lireImage((v as Record<string, Json>).url ?? (v as Record<string, Json>).contentUrl)
  return undefined
}

/** Étapes : texte simple, liste de textes, HowToStep, HowToSection… */
function lireEtapes(v: Json): string[] {
  if (typeof v === 'string') {
    // Certaines fiches mettent tout dans un seul texte : on découpe par ligne ou par numéro.
    const lignes = analyserTexte(`Préparation\n${decoderEntites(v).replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')}`).lignes
    return lignes.filter((l) => l.type === 'etape').map((l) => texte(l.texte))
  }
  if (Array.isArray(v)) return v.flatMap(lireEtapes)
  if (v && typeof v === 'object') {
    const o = v as Record<string, Json>
    if (estType(o, 'HowToSection') || o.itemListElement) {
      const nom = texte(o.name)
      const sousEtapes = lireEtapes(o.itemListElement)
      return nom && sousEtapes.length ? [`${nom} :`, ...sousEtapes] : sousEtapes
    }
    const t = texte(o.text ?? o.name ?? o.description)
    return t ? [t] : []
  }
  return []
}

const CATEGORIES: [RegExp, Categorie][] = [
  [/entr[ée]e|ap[ée]ritif|starter|appetizer/i, 'entree'],
  [/dessert|sucr[ée]/i, 'dessert'],
  [/p[âa]tisserie|g[âa]teau|cake|tarte sucr|biscuit/i, 'patisserie'],
  [/boisson|cocktail|drink/i, 'boisson'],
  [/plat|main|d[îi]ner|d[ée]jeuner/i, 'plat'],
]

/** Convertit une fiche schema.org/Recipe en recette analysée (à vérifier dans l'aperçu). */
export function depuisSchema(recette: Record<string, Json>, url?: string): RecetteAnalysee {
  const ingredients = (Array.isArray(recette.recipeIngredient) ? recette.recipeIngredient : Array.isArray(recette.ingredients) ? recette.ingredients : [])
    .map(texte)
    .filter(Boolean)
  const etapes = lireEtapes(recette.recipeInstructions).filter(Boolean)
  const lignes: LigneImport[] = [
    ...ingredients.map((t) => ({ id: nouvelId(), texte: t, type: 'ingredient' as const })),
    ...etapes.map((t) => ({ id: nouvelId(), texte: t, type: 'etape' as const })),
  ]
  const categorieBrute = [recette.recipeCategory, recette.recipeCuisine].flat().map(texte).join(' ')
  const categorie = CATEGORIES.find(([motif]) => motif.test(categorieBrute))?.[1]
  const motsCles = [recette.keywords]
    .flat()
    .map(texte)
    .join(',')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && t.length <= 25)
    .slice(0, 6)

  const analyse = analyserTexte(texte(recette.description))
  return {
    titre: texte(recette.name) || 'Recette importée',
    personnes: lirePersonnes(recette.recipeYield ?? recette.yield),
    contenant: analyse.contenant,
    tempsPreparation: lireDureeIso(recette.prepTime),
    tempsCuisson: lireDureeIso(recette.cookTime),
    tempsRepos: lireDureeIso(recette.performTime) ?? lireDureeIso(recette.restTime),
    categorie,
    tags: motsCles.length ? motsCles : undefined,
    notes: texte(recette.description) || undefined,
    imageUrl: lireImage(recette.image),
    sourceUrl: url ?? (typeof recette.url === 'string' ? recette.url : undefined),
    lignes,
  }
}

/** Contenu copié par le bouton magique (voir `boutonMagique.ts`). */
export interface CopieBoutonMagique {
  quanto: 'bouton-magique'
  url: string
  titre: string
  recette?: Record<string, Json>
  texte?: string
}

export function lireCopieBoutonMagique(collage: string): CopieBoutonMagique | null {
  const t = collage.trim()
  if (!t.startsWith('{')) return null
  try {
    const o = JSON.parse(t) as CopieBoutonMagique
    return o.quanto === 'bouton-magique' ? o : null
  } catch {
    return null
  }
}

/** Analyse ce que l'utilisateur a collé : copie du bouton magique, JSON-LD brut ou simple texte. */
export function analyserCollage(collage: string): RecetteAnalysee {
  const magique = lireCopieBoutonMagique(collage)
  if (magique?.recette) return depuisSchema(magique.recette, magique.url)
  if (magique?.texte) {
    const r = analyserTexte(magique.texte)
    return { ...r, titre: r.titre || magique.titre, sourceUrl: magique.url }
  }
  if (collage.trim().startsWith('{') || collage.trim().startsWith('[')) {
    try {
      const recette = trouverRecette(JSON.parse(collage))
      if (recette) return depuisSchema(recette)
    } catch {
      /* ce n'est pas du JSON : on l'analyse comme du texte */
    }
  }
  return analyserTexte(collage)
}
