/**
 * Durées citées dans une étape (« enfournez 25 min », « laissez reposer 1 h 30 »),
 * proposées comme minuteurs dans le mode cuisine.
 */

export interface DureeTrouvee {
  /** Texte affiché sur le bouton : « 25 min », « 1 h 30 ». */
  libelle: string
  secondes: number
}

const MOTIF =
  /(\d+)(?:\s*(?:à|-|–)\s*\d+)?\s*(h(?:eures?)?|min(?:utes?)?|mn|s(?:ec(?:ondes?)?)?)(?![\p{L}])(?:\s*(\d{1,2})(?!\s*(?:°|cm|g\b)))?/giu

export function trouverDurees(texte: string): DureeTrouvee[] {
  const vues = new Set<number>()
  const durees: DureeTrouvee[] = []
  for (const m of texte.matchAll(MOTIF)) {
    const n = Number(m[1])
    const unite = m[2].toLowerCase()
    let secondes: number
    let libelle: string
    if (unite.startsWith('h')) {
      const minutes = m[3] ? Number(m[3]) : 0
      secondes = n * 3600 + minutes * 60
      libelle = minutes ? `${n} h ${String(minutes).padStart(2, '0')}` : `${n} h`
    } else if (unite.startsWith('m')) {
      secondes = n * 60
      libelle = `${n} min`
    } else {
      secondes = n
      libelle = `${n} s`
    }
    // Les durées plausibles en cuisine : de 10 secondes à 12 heures.
    if (secondes < 10 || secondes > 12 * 3600 || vues.has(secondes)) continue
    vues.add(secondes)
    durees.push({ libelle, secondes })
  }
  return durees
}

/** Temps restant lisible : 1 h 05:09, 04:30. */
export function formaterRestant(secondes: number): string {
  const s = Math.max(0, Math.ceil(secondes))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return h ? `${h} h ${mmss}` : mmss
}
