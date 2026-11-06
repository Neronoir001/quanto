import { describe, expect, it } from 'vitest'
import { formaterRestant, trouverDurees } from './minuteurs'

describe('Minuteurs', () => {
  it.each([
    ['Enfournez 25 min à 180 °C.', [['25 min', 1500]]],
    ['Laissez reposer 1 h 30 au frais.', [['1 h 30', 5400]]],
    ['Laissez reposer 2 heures.', [['2 h', 7200]]],
    ['Faites cuire 10 à 12 minutes.', [['10 min', 600]]],
    ['Mixez 30 secondes, puis cuisez 5 mn.', [['30 s', 30], ['5 min', 300]]],
    ['Préchauffez à 180 °C. Un moule de 24 cm.', []],
    ['Ajoutez 100 g de beurre.', []],
  ])('« %s »', (texte, attendu) => {
    expect(trouverDurees(texte).map((d) => [d.libelle, d.secondes])).toEqual(attendu)
  })

  it('affiche le temps restant', () => {
    expect(formaterRestant(270)).toBe('04:30')
    expect(formaterRestant(3909)).toBe('1 h 05:09')
    expect(formaterRestant(-3)).toBe('00:00')
  })
})
