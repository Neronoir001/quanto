import { normaliser } from './analyse'

/**
 * Accord des noms d'ingrédients comptés à la pièce : « 1 œuf », « 3 œufs », « 1 oignon rouge ».
 * Règles simples du français, avec les exceptions courantes en cuisine.
 */

const INVARIABLES = new Set([
  'ananas', 'radis', 'noix', 'pois', 'mais', 'cassis', 'anis', 'jus', 'riz', 'brebis', 'gros', 'frais',
  'epais', 'bras', 'nachos', 'tapas', 'gras', 'bas', 'doux', 'roux',
])
/** Mots qui terminent le groupe nominal : on n'accorde pas au-delà (« pommes de terre »). */
const ARRETS = new Set(['de', 'd', 'du', 'des', 'a', 'au', 'aux', 'en', 'pour', 'avec', 'sans', 'et', 'ou', 'la', 'le', 'les', 'l'])
const PLURIEL_EN_X = new Set(['chou', 'genou', 'caillou', 'hibou', 'bijou', 'joujou', 'pou'])

function singulier(mot: string): string {
  const n = normaliser(mot)
  if (n.length <= 3 || INVARIABLES.has(n)) return mot
  if (/eaux$/.test(n)) return mot.slice(0, -1)
  if (/oux$/.test(n) && PLURIEL_EN_X.has(n.slice(0, -1))) return mot.slice(0, -1)
  if (/[^s]s$/.test(n)) return mot.slice(0, -1)
  return mot
}

function pluriel(mot: string): string {
  const n = normaliser(mot)
  if (n.length <= 2 || INVARIABLES.has(n) || /[sxz]$/.test(n)) return mot
  if (/(eau|eu)$/.test(n) || PLURIEL_EN_X.has(n)) return `${mot}x`
  return `${mot}s`
}

/** Accorde le début d'un nom (jusqu'à « de », « à »…) selon la quantité affichée. */
export function accorderNom(nom: string, quantite: number): string {
  const morceaux = nom.split(/(\s+|['’])/)
  let accorder = true
  return morceaux
    .map((m) => {
      if (!accorder || /^\s+$|^['’]$/.test(m) || m === '') return m
      if (ARRETS.has(normaliser(m))) {
        accorder = false
        return m
      }
      if (!/^[\p{L}-]+$/u.test(m)) return m
      return quantite >= 2 ? pluriel(m) : singulier(m)
    })
    .join('')
}

/** Accorde le premier mot d'un texte (« œufs avec… ») s'il correspond au nom de l'ingrédient. */
export function accorderPremierMot(texte: string, nomIngredient: string, quantite: number): string {
  const m = /^(\s*)([\p{L}-]+)/u.exec(texte)
  if (!m) return texte
  const racine = (s: string) => normaliser(s).replace(/[sx]$/, '')
  const premierDuNom = nomIngredient.trim().split(/\s+/)[0] ?? ''
  if (racine(m[2]) !== racine(premierDuNom)) return texte
  const accorde = quantite >= 2 ? pluriel(m[2]) : singulier(m[2])
  return m[1] + accorde + texte.slice(m[0].length)
}
