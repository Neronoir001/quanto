import { describe, expect, it } from 'vitest'
import type { Ingredient } from './modele'
import { documentDepuisTexte, estVide, relierIngredient, texteBrut, attributsQuantite } from './texteRiche'

const ing = (id: string, nom: string): Ingredient => ({ id, nom, unite: 'g', quantite: 100, recalcul: 'normal' })
const INGREDIENTS = [ing('choco', 'chocolat noir'), ing('beurre', 'beurre doux'), ing('oeufs', 'œufs'), ing('sucre', 'sucre')]

describe('Texte riche des étapes', () => {
  it('balise les quantités et les relie aux ingrédients', () => {
    const doc = documentDepuisTexte('Faites fondre 200 g de chocolat avec 150 g de beurre, puis 3 œufs.', INGREDIENTS)
    const quantites = doc.content![0].content!.filter((n) => n.type === 'quantite').map(attributsQuantite)
    expect(quantites.map((q) => [q!.valeur, q!.unite, q!.ingredientId])).toEqual([
      [200, 'g', 'choco'],
      [150, 'g', 'beurre'],
      [3, 'piece', 'oeufs'],
    ])
  })

  it('reconstitue le texte', () => {
    const doc = documentDepuisTexte('Ajoutez 100 g de sucre.\nMélangez.')
    expect(texteBrut(doc, (a) => `[${a.valeur}]`)).toBe('Ajoutez [100] de sucre.\nMélangez.\n')
  })

  it('reconnaît un document vide', () => {
    expect(estVide(documentDepuisTexte(''))).toBe(true)
    expect(estVide(documentDepuisTexte('Mélangez'))).toBe(false)
  })

  it('ne relie rien quand aucun ingrédient ne suit', () => {
    expect(relierIngredient(' de farine', INGREDIENTS)).toBeNull()
    expect(relierIngredient(' de sucre glace', INGREDIENTS)).toBe('sucre')
  })
})
