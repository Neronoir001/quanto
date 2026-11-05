/** Mise en forme des nombres à la française. */

/** Espace insécable, pour ne jamais séparer un nombre de son unité en fin de ligne. */
export const INSECABLE = ' '

/** Arrondit au multiple de `pas` le plus proche, sans erreurs d'arrondi flottant (0,30000000004…). */
export function arrondirAu(valeur: number, pas: number): number {
  const r = Math.round(valeur / pas) * pas
  return Number(r.toFixed(6))
}

/** Nombre à la française : virgule décimale, zéros inutiles supprimés. */
export function nombre(valeur: number, decimalesMax = 2): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: decimalesMax })
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' }

/** Nombre en quarts, avec fractions typographiques : 1,5 → « 1 ½ », 0,25 → « ¼ ». */
export function enQuarts(valeur: number): string {
  const v = arrondirAu(valeur, 0.25)
  const entier = Math.floor(v)
  const reste = Number((v - entier).toFixed(2))
  const fraction = FRACTIONS[String(reste)]
  if (!fraction) return nombre(entier, 0)
  return entier === 0 ? fraction : `${entier}${INSECABLE}${fraction}`
}

/** Coefficient de recalcul, tel qu'affiché à l'utilisateur : « × 1,78 ». */
export function formaterRatio(ratio: number): string {
  return `×${INSECABLE}${nombre(ratio, 2)}`
}
