import { describe, expect, it } from 'vitest'
import { decrireContenant, ratioContenants } from './contenants'
import { formaterRatio } from './format'
import { avertissements, calculerRatio, recalculerQuantite, type QuantiteSource } from './recalcul'

/** Remplace les espaces insécables par des espaces ordinaires, pour des tests lisibles. */
const lisible = (s: string) => s.replace(/[  ]/g, ' ')
const texte = (q: QuantiteSource, ratio: number) => lisible(recalculerQuantite(q, ratio).texte)

describe('Critères de validation du cahier des charges (§ 13)', () => {
  it('1. 4 → 8 personnes double les quantités', () => {
    const ratio = calculerRatio({ personnes: 4 }, { mode: 'personnes', personnes: 8 })
    expect(ratio).toBe(2)
    expect(texte({ valeur: 100, unite: 'g' }, 2)).toBe('200 g')
    expect(texte({ valeur: 50, unite: 'ml' }, 2)).toBe('100 ml')
  })

  it('2. la valeur recalculée est signalée comme modifiée', () => {
    const r = recalculerQuantite({ valeur: 100, unite: 'g' }, 2)
    expect(r.modifiee).toBe(true)
    expect(recalculerQuantite({ valeur: 100, unite: 'g' }, 1).modifiee).toBe(false)
  })

  it('4. moule rond 24 cm → rond 20 cm : × 0,69', () => {
    const r = ratioContenants({ type: 'rond', diametre: 24 }, { type: 'rond', diametre: 20 })!
    expect(lisible(formaterRatio(r))).toBe('× 0,69')
  })

  it('5. moule rond 24 cm → carré 20 cm : × 0,88', () => {
    const r = ratioContenants({ type: 'rond', diametre: 24 }, { type: 'carre', cote: 20 })!
    expect(lisible(formaterRatio(r))).toBe('× 0,88')
  })

  it('6. conversions : 600 ml × 2 → 1,2 L ; 750 g × 2 → 1,5 kg', () => {
    expect(texte({ valeur: 600, unite: 'ml' }, 2)).toBe('1,2 L')
    expect(texte({ valeur: 750, unite: 'g' }, 2)).toBe('1,5 kg')
  })

  it('7. 2 œufs × 1,17 → « 2 à 3 » (≈ 117 g battus)', () => {
    const r = recalculerQuantite({ valeur: 2, unite: 'piece', nom: 'œufs' }, 1.17)
    expect(lisible(r.texte)).toBe('2 à 3')
    expect(lisible(r.equivalent!)).toBe('≈ 117 g battus')
    expect(r.approximative).toBe(true)
  })

  it('8. une pincée de sel ne change jamais', () => {
    const r = recalculerQuantite({ valeur: 1, unite: 'pincee', nom: 'sel' }, 3)
    expect(lisible(r.texte)).toBe('1 pincée')
    expect(r.modifiee).toBe(false)
    expect(r.note).toBe('à ajuster')
  })
})

describe('Masses', () => {
  it('arrondit à 0,5 g sous 10 g', () => {
    expect(texte({ valeur: 3, unite: 'g' }, 1.4)).toBe('4 g') // 4,2 → 4
    expect(texte({ valeur: 5, unite: 'g' }, 0.5)).toBe('2,5 g')
  })
  it('arrondit au gramme entre 10 et 100 g', () => {
    expect(texte({ valeur: 60, unite: 'g' }, 0.69)).toBe('41 g')
  })
  it('arrondit par 5 g au-delà de 100 g', () => {
    expect(texte({ valeur: 200, unite: 'g' }, 0.69)).toBe('140 g') // 138 → 140
  })
  it('repasse en grammes sous le kilo', () => {
    expect(texte({ valeur: 1, unite: 'kg' }, 0.8)).toBe('800 g')
  })
  it('garde 2 décimales en kilos', () => {
    expect(texte({ valeur: 500, unite: 'g' }, 2.5)).toBe('1,25 kg')
  })
  it('ne descend jamais à 0', () => {
    expect(texte({ valeur: 1, unite: 'g' }, 0.1)).toBe('0,5 g')
  })
})

describe('Volumes', () => {
  it('garde les centilitres sous le litre', () => {
    expect(texte({ valeur: 25, unite: 'cl' }, 2)).toBe('50 cl')
  })
  it('arrondit les centilitres à l’unité au-delà de 10 cl, au demi en dessous', () => {
    expect(texte({ valeur: 25, unite: 'cl' }, 0.694)).toBe('17 cl')
    expect(texte({ valeur: 10, unite: 'cl' }, 0.42)).toBe('4 cl')
    expect(texte({ valeur: 10, unite: 'cl' }, 0.47)).toBe('4,5 cl')
  })
  it('passe en litres à partir de 100 cl', () => {
    expect(texte({ valeur: 50, unite: 'cl' }, 2)).toBe('1 L')
  })
  it('convertit les litres en centilitres sous le litre', () => {
    expect(texte({ valeur: 0.5, unite: 'l' }, 0.8)).toBe('40 cl')
  })
  it('affiche les litres avec 2 décimales au plus', () => {
    expect(texte({ valeur: 1, unite: 'l' }, 1.333)).toBe('1,33 L')
  })
})

describe('Cuillères', () => {
  it('3 càc deviennent 1 càs', () => {
    expect(texte({ valeur: 1, unite: 'cac' }, 3)).toBe('1 càs')
  })
  it('arrondit en quarts avec des fractions', () => {
    expect(texte({ valeur: 1, unite: 'cas' }, 1.5)).toBe('1 ½ càs')
    expect(texte({ valeur: 1, unite: 'cac' }, 0.5)).toBe('½ càc')
  })
  it('moins d’une càs se convertit en càc', () => {
    expect(texte({ valeur: 1, unite: 'cas' }, 0.5)).toBe('1 ½ càc')
  })
})

describe('Pièces et conditionnements', () => {
  it('arrondit à l’entier hors de la zone de fourchette', () => {
    expect(texte({ valeur: 4, unite: 'piece', nom: 'œufs' }, 1.5)).toBe('6')
    expect(texte({ valeur: 3, unite: 'piece' }, 0.95)).toBe('3') // 2,85 → 3
    expect(texte({ valeur: 3, unite: 'piece' }, 0.9)).toBe('2 à 3') // 2,7 : dans la zone de fourchette
  })
  it('met au pluriel', () => {
    expect(texte({ valeur: 1, unite: 'gousse' }, 2)).toBe('2 gousses')
    expect(texte({ valeur: 2, unite: 'gousse' }, 0.75)).toBe('1 à 2 gousses')
  })
  it('jamais moins d’une pièce', () => {
    const r = recalculerQuantite({ valeur: 1, unite: 'piece', nom: 'œuf' }, 0.4)
    expect(r.texte).toBe('1')
    expect(lisible(r.equivalent!)).toBe('≈ 20 g battus')
  })
  it('donne l’équivalent des jaunes en grammes', () => {
    const r = recalculerQuantite({ valeur: 3, unite: 'piece', nom: "jaunes d'œufs" }, 0.5)
    expect(lisible(r.texte)).toBe('1 à 2')
    expect(lisible(r.equivalent!)).toBe('≈ 30 g')
  })
  it('arrondit les sachets à la demi-unité : « 1 sachet ½ »', () => {
    expect(texte({ valeur: 1, unite: 'sachet' }, 1.5)).toBe('1 sachet ½')
    expect(texte({ valeur: 1, unite: 'sachet' }, 0.5)).toBe('½ sachet')
    expect(texte({ valeur: 2, unite: 'feuille' }, 1.6)).toBe('3 feuilles') // 3,2 → 3
  })
})

describe('Fourchettes, quantités fixes et assaisonnements', () => {
  it('recalcule les deux bornes d’une fourchette', () => {
    expect(texte({ valeur: 100, valeurMax: 150, unite: 'g' }, 2)).toBe('200 à 300 g')
    expect(texte({ valeur: 400, valeurMax: 600, unite: 'g' }, 2)).toBe('800 g à 1,2 kg')
  })
  it('ne recalcule pas une quantité fixe', () => {
    const r = recalculerQuantite({ valeur: 1, unite: 'piece', recalcul: 'fixe', nom: 'citron' }, 2)
    expect(r.texte).toBe('1')
    expect(r.note).toBe('quantité fixe')
  })
  it('signale les assaisonnements quand le coefficient est fort', () => {
    expect(recalculerQuantite({ valeur: 1, unite: 'cac', nom: 'sel fin' }, 2).note).toBe('à doser selon le goût')
    expect(recalculerQuantite({ valeur: 1, unite: 'cac', nom: 'sel fin' }, 1.2).note).toBeUndefined()
    expect(recalculerQuantite({ valeur: 100, unite: 'g', nom: 'sucre' }, 2).note).toBeUndefined()
  })
  it('affiche « QS » sans valeur', () => {
    expect(recalculerQuantite({ unite: 'qs', nom: 'huile' }, 2).texte).toBe('QS')
  })
})

describe('Coefficients et contenants', () => {
  it('compare un moule rond à un moule à cake par les volumes (hauteur par défaut 5 cm)', () => {
    // rond 24 cm × 5 cm ≈ 2 262 cm³ ; cake 26 × 10 × 8 = 2 080 cm³
    const r = ratioContenants({ type: 'rond', diametre: 24 }, { type: 'cake', longueur: 26, largeur: 10, hauteur: 8 })!
    expect(r).toBeCloseTo(0.92, 2)
  })
  it('compare des volumes libres', () => {
    expect(ratioContenants({ type: 'volume', volume: 1 }, { type: 'volume', volume: 1.5 })).toBe(1.5)
  })
  it('refuse un contenant incomplet', () => {
    expect(ratioContenants({ type: 'rond', diametre: 24 }, { type: 'rectangulaire', longueur: 30 })).toBeNull()
    expect(calculerRatio({ personnes: 4 }, { mode: 'contenant', contenant: { type: 'rond', diametre: 20 } })).toBeNull()
  })
  it('décrit un contenant', () => {
    expect(lisible(decrireContenant({ type: 'rond', diametre: 24 }))).toBe('moule rond de 24 cm')
  })
  it('avertit sur la cuisson quand le moule change nettement', () => {
    const cible = { mode: 'contenant' as const, contenant: { type: 'rond' as const, diametre: 20 } }
    expect(avertissements(0.69, cible)).toHaveLength(1)
    expect(avertissements(0.95, cible)).toHaveLength(0)
  })
})
