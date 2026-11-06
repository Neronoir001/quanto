import { describe, expect, it } from 'vitest'
import { analyserCollage, depuisSchema, lireDureeIso, trouverRecette } from './importSchema'

const FICHE = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', name: 'Page' },
    {
      '@type': ['Recipe'],
      name: 'Tarte aux pommes',
      recipeYield: ['6', '6 personnes'],
      prepTime: 'PT20M',
      cookTime: 'PT1H5M',
      recipeCategory: 'Dessert',
      keywords: 'tarte, pommes, facile',
      image: [{ '@type': 'ImageObject', url: 'https://exemple.fr/tarte.jpg' }],
      recipeIngredient: ['1 pâte brisée', '4 pommes', '50&nbsp;g de sucre', '30 g de beurre'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Préchauffez le four à 200 °C.' },
        {
          '@type': 'HowToSection',
          name: 'Montage',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Étalez la pâte dans le moule.' },
            { '@type': 'HowToStep', text: 'Disposez les pommes et 50 g de sucre.' },
          ],
        },
      ],
    },
  ],
}

describe('Fiches recettes des sites (schema.org)', () => {
  it('trouve la recette dans un @graph', () => {
    expect(trouverRecette(FICHE)?.name).toBe('Tarte aux pommes')
    expect(trouverRecette({ '@type': 'Article' })).toBeNull()
  })

  it('convertit tous les champs utiles', () => {
    const r = depuisSchema(trouverRecette(FICHE)!, 'https://exemple.fr/tarte')
    expect(r.titre).toBe('Tarte aux pommes')
    expect(r.personnes).toBe(6)
    expect([r.tempsPreparation, r.tempsCuisson]).toEqual([20, 65])
    expect(r.categorie).toBe('dessert')
    expect(r.tags).toEqual(['tarte', 'pommes', 'facile'])
    expect(r.imageUrl).toBe('https://exemple.fr/tarte.jpg')
    expect(r.lignes.filter((l) => l.type === 'ingredient').map((l) => l.texte)).toContain('50 g de sucre')
    expect(r.lignes.filter((l) => l.type === 'etape').map((l) => l.texte)).toEqual([
      'Préchauffez le four à 200 °C.',
      'Montage :',
      'Étalez la pâte dans le moule.',
      'Disposez les pommes et 50 g de sucre.',
    ])
  })

  it('découpe des instructions données en un seul texte', () => {
    const r = depuisSchema({ '@type': 'Recipe', name: 'X', recipeInstructions: '1. Mélangez.<br>2. Enfournez.' })
    expect(r.lignes.map((l) => l.texte)).toEqual(['Mélangez.', 'Enfournez.'])
  })

  it('lit les durées ISO', () => {
    expect(lireDureeIso('PT1H30M')).toBe(90)
    expect(lireDureeIso('PT45M')).toBe(45)
    expect(lireDureeIso('P0DT0H0M')).toBeUndefined()
  })

  it('reconnaît ce que copie le bouton magique', () => {
    const copie = JSON.stringify({ quanto: 'bouton-magique', url: 'https://exemple.fr/t', titre: 'T', recette: trouverRecette(FICHE) })
    const r = analyserCollage(copie)
    expect(r.titre).toBe('Tarte aux pommes')
    expect(r.sourceUrl).toBe('https://exemple.fr/t')
  })

  it('analyse un simple texte collé', () => {
    expect(analyserCollage('Soupe\n200 g de carottes\nFaites cuire les carottes 20 minutes dans l’eau.').titre).toBe('Soupe')
  })
})
