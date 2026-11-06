import { lireNombre, normaliser, reconnaitreUnite } from './analyse'
import type { Contenant } from './contenants'
import { type Categorie, nouvelId } from './modele'

/**
 * Analyse locale d'un texte de recette (copié d'un site, extrait d'un PDF ou lu sur une photo).
 * Sans intelligence artificielle : des règles simples, puis un aperçu que l'utilisateur corrige.
 */

export type TypeLigne = 'ingredient' | 'etape' | 'ignoree'

export interface LigneImport {
  id: string
  texte: string
  type: TypeLigne
}

export interface RecetteAnalysee {
  titre: string
  personnes?: number
  contenant?: Contenant
  tempsPreparation?: number
  tempsCuisson?: number
  tempsRepos?: number
  categorie?: Categorie
  tags?: string[]
  notes?: string
  imageUrl?: string
  sourceUrl?: string
  lignes: LigneImport[]
}

export interface IngredientLu {
  quantite?: number
  quantiteMax?: number
  unite: string
  nom: string
  precision?: string
}

// ————————————————————————————————————————————————————————————————
// Lecture d'une ligne d'ingrédient
// ————————————————————————————————————————————————————————————————

const NOMBRES_EN_LETTRES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, demi: 0.5, 'demie': 0.5,
}

// Les formes les plus longues d'abord : « 1/2 » avant « 1 », « une » avant « un ».
const NOMBRE = String.raw`\d+\s?\/\s?\d+|\d+(?:[.,]\d+)?(?:\s?[½¼¾⅓⅔])?|[½¼¾⅓⅔]|une|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze`
const UNITE = String.raw`kg|kilos?|g|grs?|grammes?|mg|ml|cl|dl|l|litres?|centilitres?|millilitres?|c\.\s?à\s?s\.?|c\.\s?à\s?c\.?|c\.à\.s\.?|c\.à\.c\.?|càs|cas|càc|cac|cs|cc|cuill(?:è|e)res?\s+à\s+(?:soupe|café)|cuil\.\s+à\s+(?:soupe|café)|sachets?|feuilles?|pots?|bo(?:î|i)tes?|poign(?:é|e)es?|pinc(?:é|e)es?|gousses?|tranches?|bottes?|brins?|filets?|verres?|tasses?|bols?|noix|noisettes?`

const DEBUT_QUANTITE = new RegExp(
  String.raw`^(${NOMBRE})(?:\s?(?:à|-|–)\s?(${NOMBRE}))?\s*(?:(${UNITE})(?![\p{L}]))?\.?\s*(?:de\s+|d['’]\s*)?(.*)$`,
  'iu',
)
const FIN_QUANTITE = new RegExp(String.raw`^(.+?)\s*[:\-–]?\s+(${NOMBRE})(?:\s?(?:à|-|–)\s?(${NOMBRE}))?\s*(${UNITE})?\.?$`, 'iu')

function lireNombreLibre(t: string): number | undefined {
  const n = NOMBRES_EN_LETTRES[t.trim().toLowerCase()]
  return n ?? lireNombre(t)
}

/** Unités courantes hors catalogue : ramenées à l'unité la plus proche. */
function uniteDepuisTexte(t: string | undefined): string {
  if (!t) return 'piece'
  const n = t.trim().toLowerCase().replace(/\s+/g, ' ')
  const connue = reconnaitreUnite(n)
  if (connue) return connue
  if (/^c\.\s?à\s?s|^c\.à\.s|^cuil.*soupe/.test(n)) return 'cas'
  if (/^c\.\s?à\s?c|^c\.à\.c|^cuil.*caf/.test(n)) return 'cac'
  if (/^mg$/.test(n)) return 'g'
  if (/^(filets?)$/.test(n)) return 'filet'
  // Verres, tasses, bols, noix de beurre : comptés comme des pièces.
  return 'piece'
}

const PRECISION = /\s*\(([^)]*)\)\s*/

/** Lit « 200 g de farine (tamisée) », « 3 œufs », « Farine : 200 g », « Sel, poivre »… */
export function lireLigneIngredient(brut: string): IngredientLu {
  let texte = brut.replace(/^[\s•\-–—*·▢□◦●○✓✔>+]+/, '').replace(/\s+/g, ' ').trim()
  let precision: string | undefined
  const parentheses = PRECISION.exec(texte)
  if (parentheses) {
    precision = parentheses[1].trim() || undefined
    texte = texte.replace(PRECISION, ' ').trim()
  }

  if (/\b(q\.?\s?s\.?|quantité suffisante)\s*$/i.test(texte)) {
    return { unite: 'qs', nom: texte.replace(/\b(q\.?\s?s\.?|quantité suffisante)\s*$/i, '').replace(/[:\-–,]\s*$/, '').trim() || texte, precision }
  }

  let m = DEBUT_QUANTITE.exec(texte)
  if (m && m[4] !== undefined) {
    const quantite = lireNombreLibre(m[1])
    const max = m[2] ? lireNombreLibre(m[2]) : undefined
    let nom = m[4].trim()
    // « 1 citron, pressé » : ce qui suit la virgule est une précision.
    const virgule = nom.indexOf(', ')
    if (virgule > 0 && !precision) {
      precision = nom.slice(virgule + 2).trim()
      nom = nom.slice(0, virgule).trim()
    }
    if (quantite !== undefined && nom) {
      return {
        quantite,
        quantiteMax: max !== undefined && max >= quantite ? max : undefined,
        unite: uniteDepuisTexte(m[3]),
        nom,
        precision,
      }
    }
  }

  m = FIN_QUANTITE.exec(texte)
  if (m) {
    const quantite = lireNombreLibre(m[2])
    if (quantite !== undefined && !/^(un|une)$/i.test(m[2])) {
      const max = m[3] ? lireNombreLibre(m[3]) : undefined
      return {
        quantite,
        quantiteMax: max !== undefined && max >= quantite ? max : undefined,
        unite: uniteDepuisTexte(m[4]),
        nom: m[1].replace(/[:\-–]\s*$/, '').trim(),
        precision,
      }
    }
  }

  // Sans quantité : « Sel, poivre », « Huile d'olive ».
  const assaisonnement = /^(sel|poivre|sel et poivre|sel, poivre|épices?|piment)\b/i.test(texte)
  return { unite: assaisonnement ? 'au-gout' : 'piece', nom: texte, precision }
}

// ————————————————————————————————————————————————————————————————
// Analyse d'un texte complet
// ————————————————————————————————————————————————————————————————

const ENTETE_INGREDIENTS = /^(liste des\s+)?ingr[ée]dients?\b/i
const ENTETE_ETAPES = /^(pr[ée]paration|[ée]tapes?( de (la )?pr[ée]paration)?|instructions?|d[ée]roulement|m[ée]thode|r[ée]alisation|la recette|marche à suivre)\b/i
const ENTETE_NOTES = /^(notes?|conseils?|astuces?|le conseil|remarques?|le petit plus|variantes?)\b/i

/** Une ligne d'en-tête est courte et ne contient que le mot-clé (« Préparation : 20 min » n'en est pas une). */
function estEntete(ligne: string, motif: RegExp): boolean {
  const t = ligne.replace(/[:\-–]\s*$/, '').trim()
  return motif.test(t) && t.split(/\s+/).length <= 6 && !/\d+\s*(min|h)/i.test(t)
}

function lireDuree(texte: string): number | undefined {
  const t = texte.toLowerCase()
  const h = /(\d+)\s*h(?:eures?)?\s*(\d+)?/.exec(t)
  if (h) return Number(h[1]) * 60 + Number(h[2] ?? 0)
  const m = /(\d+)\s*min/.exec(t)
  return m ? Number(m[1]) : undefined
}

const ETAPE_NUMEROTEE = /^\s*(?:[ée]tape\s*)?\d{1,2}\s*[.):\-–]\s+|^\s*[ée]tape\s*\d{1,2}\s*$/i
const RESSEMBLE_INGREDIENT = new RegExp(String.raw`^[\s•\-–—*·▢□◦●○✓✔>+]*(?:${NOMBRE})(?:\s?(?:à|-|–)\s?(?:${NOMBRE}))?\s*(?:(?:${UNITE})(?![\p{L}]))?`, 'iu')

function ressembleIngredient(ligne: string): boolean {
  const t = ligne.trim()
  if (t.length > 70) return false
  if (/^[•\-–—*·▢□◦●○✓✔]/.test(t)) return true
  if (RESSEMBLE_INGREDIENT.test(t) && !/\b(min|minutes|°|degrés)\b/i.test(t)) {
    // « 1. Préchauffez le four » est une étape numérotée, pas un ingrédient.
    return !/^\d{1,2}\s*[.)]\s+\p{Lu}/u.test(t)
  }
  return /\s[:\-–]\s*\d/.test(t) // « Farine : 200 g »
}

/** Analyse un texte de recette et propose un classement des lignes. */
export function analyserTexte(texte: string): RecetteAnalysee {
  const brutes = texte
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const r: RecetteAnalysee = { titre: '', lignes: [] }
  let section: 'debut' | 'ingredients' | 'etapes' | 'notes' = 'debut'
  const notes: string[] = []
  const ajouter = (t: string, type: TypeLigne) => r.lignes.push({ id: nouvelId(), texte: t, type })

  for (const ligne of brutes) {
    const n = normaliser(ligne)

    // Informations générales, où qu'elles soient.
    const personnes = /\b(?:pour|recette pour)\s+(\d+)\s*(?:personnes?|pers\.?|parts?|portions?|convives?)|(\d+)\s*(?:personnes?|parts?|portions?)\b|nombre de (?:personnes|parts)\s*:?\s*(\d+)/i.exec(ligne)
    if (personnes && r.personnes === undefined) r.personnes = Number(personnes[1] ?? personnes[2] ?? personnes[3])
    const moule = /moule(?:\s+(?:rond|à manqué|à tarte))?\s+(?:de\s+)?(\d{2})\s*cm/i.exec(ligne)
    if (moule && !r.contenant) r.contenant = { type: 'rond', diametre: Number(moule[1]) }

    if (/^(temps de )?pr[ée]paration\s*:?\s*\d/i.test(ligne)) {
      r.tempsPreparation = lireDuree(ligne)
      continue
    }
    if (/^(temps de )?cuisson\s*:?\s*\d/i.test(ligne)) {
      r.tempsCuisson = lireDuree(ligne)
      continue
    }
    if (/^(temps de )?repos\s*:?\s*\d/i.test(ligne)) {
      r.tempsRepos = lireDuree(ligne)
      continue
    }
    if (/^(temps total|difficult[ée]|co[uû]t|budget|niveau)\s*:/i.test(n)) continue

    if (estEntete(ligne, ENTETE_INGREDIENTS)) {
      section = 'ingredients'
      continue
    }
    if (estEntete(ligne, ENTETE_ETAPES)) {
      section = 'etapes'
      continue
    }
    if (estEntete(ligne, ENTETE_NOTES)) {
      section = 'notes'
      continue
    }
    if (/^[ée]tape\s*\d{1,2}\s*:?$/i.test(ligne)) {
      section = 'etapes'
      continue
    }
    if (personnes && ligne.length < 40 && !ressembleIngredient(ligne)) continue // « Pour 4 personnes »

    if (section === 'notes') {
      notes.push(ligne)
      continue
    }

    if (section === 'debut') {
      if (!r.titre && !ressembleIngredient(ligne) && ligne.length <= 90) {
        r.titre = ligne.replace(/^recette\s*(de|du|des)?\s*:?\s*/i, '')
        continue
      }
      if (ressembleIngredient(ligne)) {
        section = 'ingredients'
      } else if (r.lignes.length === 0) {
        ajouter(ligne, 'ignoree')
        continue
      } else {
        section = 'etapes'
      }
    }

    if (section === 'ingredients') {
      // Une longue phrase après les ingrédients : les étapes commencent.
      const phrase = /[.!]$/.test(ligne) && ligne.split(/\s+/).length >= 5
      if (!ressembleIngredient(ligne) && (ligne.length > 60 || phrase || ETAPE_NUMEROTEE.test(ligne))) {
        section = 'etapes'
      } else {
        ajouter(ligne, 'ingredient')
        continue
      }
    }

    // Étapes : sans numéro ; une ligne coupée (PDF, photo) est recollée à la précédente.
    const sansNumero = ligne.replace(ETAPE_NUMEROTEE, '').trim()
    if (!sansNumero) continue
    const precedente = r.lignes.at(-1)
    if (
      precedente?.type === 'etape' &&
      !ETAPE_NUMEROTEE.test(ligne) &&
      !/[.!?:;)]$/.test(precedente.texte) &&
      /^[\p{Ll}0-9(«"]/u.test(sansNumero)
    ) {
      precedente.texte = `${precedente.texte} ${sansNumero}`
      continue
    }
    ajouter(sansNumero, 'etape')
  }

  if (notes.length) r.notes = notes.join('\n')
  return r
}
