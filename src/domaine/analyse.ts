/**
 * Analyse du texte saisi : nombres (« 1,5 », « 1/2 », « ½ »), fourchettes (« 2 à 3 »),
 * unités écrites de différentes façons (« c. à s. », « grammes »…) et repérage
 * des quantités recalculables dans le texte d'une étape.
 */

const FRACTIONS_UNICODE: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

/** Lit un nombre écrit à la française. Renvoie `undefined` si le texte n'est pas un nombre. */
export function lireNombre(texte: string): number | undefined {
  const t = texte.trim().replace(/\s+/g, ' ')
  if (t === '') return undefined
  // « 1 ½ » ou « 1½ »
  const mixte = /^(\d+)\s?([½¼¾⅓⅔])$/.exec(t)
  if (mixte) return Number(mixte[1]) + FRACTIONS_UNICODE[mixte[2]]
  if (t in FRACTIONS_UNICODE) return FRACTIONS_UNICODE[t]
  // « 1/2 » ou « 1 1/2 »
  const fraction = /^(?:(\d+)\s)?(\d+)\s?\/\s?(\d+)$/.exec(t)
  if (fraction) {
    const den = Number(fraction[3])
    if (den === 0) return undefined
    return Number(fraction[1] ?? 0) + Number(fraction[2]) / den
  }
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(',', '.'))
  return undefined
}

/** Lit une quantité saisie : « 200 », « 1,5 », « 2 à 3 », « 2-3 ». */
export function lireQuantite(texte: string): { valeur?: number; valeurMax?: number } | null {
  const t = texte.trim()
  if (t === '') return {}
  const fourchette = /^(.+?)\s*(?:à|-|–)\s*(.+)$/.exec(t)
  if (fourchette) {
    const a = lireNombre(fourchette[1])
    const b = lireNombre(fourchette[2])
    if (a !== undefined && b !== undefined && b >= a) return { valeur: a, valeurMax: b }
  }
  const v = lireNombre(t)
  return v === undefined ? null : { valeur: v }
}

/** Texte de saisie à partir d'une quantité enregistrée : 1.5 → « 1,5 », fourchette → « 2 à 3 ». */
export function ecrireQuantite(valeur?: number, valeurMax?: number): string {
  if (valeur === undefined) return ''
  const f = (n: number) => String(Number(n.toFixed(3))).replace('.', ',')
  return valeurMax === undefined ? f(valeur) : `${f(valeur)} à ${f(valeurMax)}`
}

// ————————————————————————————————————————————————————————————————
// Unités écrites librement
// ————————————————————————————————————————————————————————————————

const ALIAS: [string, string[]][] = [
  ['kg', ['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes']],
  ['g', ['g', 'gr', 'grs', 'gramme', 'grammes']],
  ['ml', ['ml', 'millilitre', 'millilitres']],
  ['cl', ['cl', 'centilitre', 'centilitres']],
  ['dl', ['dl', 'décilitre', 'décilitres']],
  ['l', ['l', 'litre', 'litres']],
  [
    'cac',
    ['càc', 'cac', 'c. à c.', 'c.à.c.', 'c.à.c', 'c à c', 'cc', 'cuillère à café', 'cuillères à café', 'cuil. à café', 'c. à café'],
  ],
  [
    'cas',
    ['càs', 'cas', 'c. à s.', 'c.à.s.', 'c.à.s', 'c à s', 'cs', 'cuillère à soupe', 'cuillères à soupe', 'cuil. à soupe', 'c. à soupe'],
  ],
  ['sachet', ['sachet', 'sachets']],
  ['feuille', ['feuille', 'feuilles']],
  ['pot', ['pot', 'pots']],
  ['boite', ['boîte', 'boîtes', 'boite', 'boites']],
  ['poignee', ['poignée', 'poignées']],
  ['pincee', ['pincée', 'pincées']],
  ['gousse', ['gousse', 'gousses']],
  ['tranche', ['tranche', 'tranches']],
  ['botte', ['botte', 'bottes']],
  ['brin', ['brin', 'brins']],
]

const PAR_ALIAS = new Map<string, string>()
for (const [id, alias] of ALIAS) for (const a of alias) PAR_ALIAS.set(a, id)

/** Identifiant d'unité à partir d'une écriture libre (« grammes » → « g »), ou `undefined`. */
export function reconnaitreUnite(texte: string): string | undefined {
  return PAR_ALIAS.get(texte.trim().toLowerCase())
}

// ————————————————————————————————————————————————————————————————
// Repérage des quantités dans une étape
// ————————————————————————————————————————————————————————————————

export interface QuantiteTrouvee {
  debut: number
  fin: number
  texte: string
  valeur: number
  valeurMax?: number
  unite: string
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NOMBRE = String.raw`\d+\s?\/\s?\d+|\d+(?:[.,]\d+)?(?:\s?[½¼¾⅓⅔])?|[½¼¾⅓⅔]`
const UNITES_REGEX = [...PAR_ALIAS.keys()].sort((a, b) => b.length - a.length).map(echapper).join('|')
const PIECES = String.raw`(?:gros |petits? |beaux? )?(?:œufs?|oeufs?|jaunes?|blancs?)`

const MOTIF = new RegExp(
  String.raw`(?<![\p{L}\d,.])(${NOMBRE})(?:\s?(?:à|-|–)\s?(${NOMBRE}))?(?:\s?(${UNITES_REGEX})(?![\p{L}])|\s(?=${PIECES}(?![\p{L}])))`,
  'giu',
)

/**
 * Repère les quantités recalculables dans un texte :
 * « 100 g », « 50 ml », « 2 càs », « 1 sachet », « 3 œufs » (le nombre seul, « œufs » reste du texte).
 * Les températures, durées et dimensions (« 180 °C », « 25 min », « 24 cm ») sont ignorées.
 */
export function trouverQuantites(texte: string): QuantiteTrouvee[] {
  const resultats: QuantiteTrouvee[] = []
  for (const m of texte.matchAll(MOTIF)) {
    const valeur = lireNombre(m[1])
    if (valeur === undefined) continue
    const valeurMax = m[2] !== undefined ? lireNombre(m[2]) : undefined
    const unite = m[3] !== undefined ? reconnaitreUnite(m[3]) : 'piece'
    if (!unite) continue
    const brut = m[0].trimEnd()
    resultats.push({
      debut: m.index,
      fin: m.index + brut.length,
      texte: brut,
      valeur,
      valeurMax: valeurMax !== undefined && valeurMax >= valeur ? valeurMax : undefined,
      unite,
    })
  }
  return resultats
}

/** Normalise un texte pour la recherche : minuscules, sans accents. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
}
