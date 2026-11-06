import { describe, expect, it } from 'vitest'
import { ecrireQuantite, lireNombre, lireQuantite, normaliser, reconnaitreUnite, trouverQuantites } from './analyse'

describe('Lecture des nombres', () => {
  it.each([
    ['200', 200],
    ['1,5', 1.5],
    ['1.5', 1.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['½', 0.5],
    ['1 ½', 1.5],
    ['1½', 1.5],
  ])('« %s » → %d', (texte, attendu) => {
    expect(lireNombre(texte)).toBeCloseTo(attendu)
  })

  it('refuse ce qui n’est pas un nombre', () => {
    expect(lireNombre('beaucoup')).toBeUndefined()
    expect(lireNombre('1/0')).toBeUndefined()
  })

  it('lit les fourchettes', () => {
    expect(lireQuantite('2 à 3')).toEqual({ valeur: 2, valeurMax: 3 })
    expect(lireQuantite('2-3')).toEqual({ valeur: 2, valeurMax: 3 })
    expect(lireQuantite('')).toEqual({})
    expect(lireQuantite('abc')).toBeNull()
  })

  it('réécrit une quantité pour la saisie', () => {
    expect(ecrireQuantite(1.5)).toBe('1,5')
    expect(ecrireQuantite(2, 3)).toBe('2 à 3')
    expect(ecrireQuantite(undefined)).toBe('')
  })
})

describe('Unités', () => {
  it('reconnaît les écritures courantes', () => {
    expect(reconnaitreUnite('grammes')).toBe('g')
    expect(reconnaitreUnite('c. à s.')).toBe('cas')
    expect(reconnaitreUnite('Cuillère à café')).toBe('cac')
    expect(reconnaitreUnite('L')).toBe('l')
    expect(reconnaitreUnite('min')).toBeUndefined()
  })
})

describe('Repérage des quantités dans une étape', () => {
  const textes = (t: string) => trouverQuantites(t).map((q) => q.texte)

  it('trouve masses et volumes', () => {
    const q = trouverQuantites('Faites fondre 100 g de beurre avec 50ml de crème.')
    expect(q.map((x) => [x.texte, x.valeur, x.unite])).toEqual([
      ['100 g', 100, 'g'],
      ['50ml', 50, 'ml'],
    ])
  })

  it('ignore températures, durées et dimensions', () => {
    expect(textes('Enfournez à 180 °C pendant 25 min dans un moule de 24 cm.')).toEqual([])
    expect(textes('Laissez reposer 2 h.')).toEqual([])
  })

  it('trouve cuillères, sachets, fourchettes et fractions', () => {
    expect(textes('Ajoutez 2 c. à s. de sucre, 1 sachet de levure et ½ càc de sel.')).toEqual([
      '2 c. à s.',
      '1 sachet',
      '½ càc',
    ])
    const f = trouverQuantites('Versez 2 à 3 cl de rhum.')[0]
    expect([f.valeur, f.valeurMax, f.unite]).toEqual([2, 3, 'cl'])
  })

  it('trouve les œufs (le nombre seul)', () => {
    const q = trouverQuantites('Fouettez 3 œufs avec 2 jaunes.')
    expect(q.map((x) => [x.texte, x.unite])).toEqual([
      ['3', 'piece'],
      ['2', 'piece'],
    ])
  })

  it('ne coupe pas un mot qui commence comme une unité', () => {
    expect(textes('Ajoutez 2 gros oignons et 3 lardons.')).toEqual([])
    expect(textes('Coupez 2 gousses d’ail.')).toEqual(['2 gousses'])
  })
})

describe('Recherche', () => {
  it('normalise accents et ligatures', () => {
    expect(normaliser('Crème brûlée aux Œufs')).toBe('creme brulee aux oeufs')
  })
})
