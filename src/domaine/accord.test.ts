import { describe, expect, it } from 'vitest'
import { accorderNom, accorderPremierMot } from './accord'
import { calculerRatio, recalculerQuantite } from './recalcul'

describe('Accord des noms', () => {
  it.each([
    ['œufs', 1, 'œuf'],
    ['œuf', 3, 'œufs'],
    ['oignons rouges', 1, 'oignon rouge'],
    ['oignon rouge', 2, 'oignons rouges'],
    ['pommes de terre', 1, 'pomme de terre'],
    ['pomme de terre', 4, 'pommes de terre'],
    ["jaunes d'œufs", 1, "jaune d'œufs"],
    ['poireau', 2, 'poireaux'],
    ['poireaux', 1, 'poireau'],
    ['ananas', 1, 'ananas'],
    ['noix', 3, 'noix'],
    ['gros oignons', 1, 'gros oignon'],
    ['tomates cerises', 1, 'tomate cerise'],
  ])('« %s » pour %d → « %s »', (nom, n, attendu) => {
    expect(accorderNom(nom, n)).toBe(attendu)
  })

  it('accorde le mot qui suit une quantité dans une étape', () => {
    expect(accorderPremierMot(' œufs avec le sucre', 'œufs', 1)).toBe(' œuf avec le sucre')
    expect(accorderPremierMot(' œuf entier', 'œufs', 3)).toBe(' œufs entier')
    expect(accorderPremierMot(' grammes de farine', 'œufs', 1)).toBe(' grammes de farine')
  })

  it('le moteur indique le nombre de pièces affiché', () => {
    expect(recalculerQuantite({ valeur: 4, unite: 'piece' }, 0.2).nombrePieces).toBe(1)
    expect(recalculerQuantite({ valeur: 2, unite: 'piece' }, 1.17).nombrePieces).toBe(3)
    expect(recalculerQuantite({ valeur: 100, unite: 'g' }, 2).nombrePieces).toBeUndefined()
  })
})

describe('Hauteur du moule de référence', () => {
  it('modifie le rapport entre un moule rond et un moule à cake', () => {
    const reference = { contenant: { type: 'rond' as const, diametre: 24 } }
    const cake = { type: 'cake' as const, longueur: 26, largeur: 10, hauteur: 8 }
    const parDefaut = calculerRatio(reference, { mode: 'contenant', contenant: cake })!
    const avecHauteur = calculerRatio(reference, { mode: 'contenant', contenant: cake, hauteurReference: 4 })!
    expect(avecHauteur).toBeCloseTo(parDefaut * (5 / 4))
  })
})
