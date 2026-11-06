import { describe, expect, it } from 'vitest'
import { analyserTexte, lireLigneIngredient } from './importTexte'

const sans = (o: object) => JSON.parse(JSON.stringify(o)) // retire les « undefined »
const deType = (r: ReturnType<typeof analyserTexte>, type: string) => r.lignes.filter((l) => l.type === type).map((l) => l.texte)

describe('Lecture d’une ligne d’ingrédient', () => {
  it.each([
    ['200 g de farine', { quantite: 200, unite: 'g', nom: 'farine' }],
    ['- 250g farine T55', { quantite: 250, unite: 'g', nom: 'farine T55' }],
    ['3 œufs', { quantite: 3, unite: 'piece', nom: 'œufs' }],
    ["1/2 pot d'huile", { quantite: 0.5, unite: 'pot', nom: 'huile' }],
    ['2 c. à s. de sucre', { quantite: 2, unite: 'cas', nom: 'sucre' }],
    ['1 cuillère à café de cannelle', { quantite: 1, unite: 'cac', nom: 'cannelle' }],
    ['50 cl de lait entier', { quantite: 50, unite: 'cl', nom: 'lait entier' }],
    ['1 sachet de levure chimique', { quantite: 1, unite: 'sachet', nom: 'levure chimique' }],
    ['une pincée de sel', { quantite: 1, unite: 'pincee', nom: 'sel' }],
    ['2 à 3 gousses d’ail', { quantite: 2, quantiteMax: 3, unite: 'gousse', nom: 'ail' }],
    ['100 g de beurre (mou)', { quantite: 100, unite: 'g', nom: 'beurre', precision: 'mou' }],
    ['1 citron, pressé', { quantite: 1, unite: 'piece', nom: 'citron', precision: 'pressé' }],
    ['Farine : 200 g', { quantite: 200, unite: 'g', nom: 'Farine' }],
    ['Sel, poivre', { unite: 'au-gout', nom: 'Sel, poivre' }],
    ["Huile d'olive", { unite: 'piece', nom: "Huile d'olive" }],
    ['Sucre glace QS', { unite: 'qs', nom: 'Sucre glace' }],
  ])('« %s »', (ligne, attendu) => {
    expect(sans(lireLigneIngredient(ligne))).toEqual(attendu)
  })
})

describe('Analyse d’un texte de recette', () => {
  it('lit un texte avec titres de sections (copié d’un site)', () => {
    const r = analyserTexte(`Gâteau au yaourt
Préparation : 10 min
Cuisson : 35 min
Ingrédients (pour 6 personnes)
1 pot de yaourt nature
3 pots de farine
2 pots de sucre
3 œufs
1/2 pot d'huile
1 sachet de levure chimique
Préparation
1. Préchauffez le four à 180 °C.
2. Mélangez le yaourt, le sucre et les œufs.
3. Ajoutez la farine et la levure, puis l'huile.
4. Versez dans un moule beurré et enfournez 35 min.
Astuce
Ajoutez un zeste de citron.`)
    expect(r.titre).toBe('Gâteau au yaourt')
    expect(r.personnes).toBe(6)
    expect([r.tempsPreparation, r.tempsCuisson]).toEqual([10, 35])
    expect(deType(r, 'ingredient')).toHaveLength(6)
    expect(deType(r, 'etape')).toEqual([
      'Préchauffez le four à 180 °C.',
      'Mélangez le yaourt, le sucre et les œufs.',
      "Ajoutez la farine et la levure, puis l'huile.",
      'Versez dans un moule beurré et enfournez 35 min.',
    ])
    expect(r.notes).toBe('Ajoutez un zeste de citron.')
  })

  it('lit un texte sans aucun titre de section', () => {
    const r = analyserTexte(`Pâtes carbonara
Pour 4 personnes
400 g de spaghetti
200 g de lardons
3 jaunes d'œufs
50 g de parmesan râpé
Poivre
Faites cuire les pâtes dans une grande casserole d'eau bouillante salée.
Faites revenir les lardons à la poêle sans matière grasse.
Mélangez les jaunes avec le parmesan, puis ajoutez aux pâtes égouttées.`)
    expect(r.titre).toBe('Pâtes carbonara')
    expect(r.personnes).toBe(4)
    expect(deType(r, 'ingredient')).toEqual(['400 g de spaghetti', '200 g de lardons', "3 jaunes d'œufs", '50 g de parmesan râpé', 'Poivre'])
    expect(deType(r, 'etape')).toHaveLength(3)
  })

  it('recolle les lignes coupées (PDF, photo) et repère le moule', () => {
    const r = analyserTexte(`Fondant
Ingrédients
200 g de chocolat
Étapes
Faites fondre le chocolat avec le beurre
dans un bain-marie, sans cesser de remuer.
Versez dans un moule de 24 cm.`)
    expect(deType(r, 'etape')).toEqual([
      'Faites fondre le chocolat avec le beurre dans un bain-marie, sans cesser de remuer.',
      'Versez dans un moule de 24 cm.',
    ])
    expect(r.contenant).toEqual({ type: 'rond', diametre: 24 })
  })

  it('reconnaît une courte phrase comme une étape', () => {
    const r = analyserTexte(`Soupe
500 g de carottes
1 oignon
Faites revenir l’oignon puis les carottes.
Versez le bouillon.`)
    expect(deType(r, 'ingredient')).toEqual(['500 g de carottes', '1 oignon'])
    expect(deType(r, 'etape')).toEqual(['Faites revenir l’oignon puis les carottes.', 'Versez le bouillon.'])
  })

  it('lit les durées en heures', () => {
    expect(analyserTexte('Repos : 1 h 30\n').tempsRepos).toBe(90)
  })
})
