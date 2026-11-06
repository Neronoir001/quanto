import { describe, expect, it } from 'vitest'
import { recettesExemples } from '../donnees/exemples'
import { ligneIngredientVide, schemaFormulaire, valeursDepuisRecette } from './formulaire'
import type { Recette } from './modele'

const enRecette = (): Recette => ({
  ...recettesExemples()[0],
  id: 'x',
  creeLe: 1,
  modifieLe: 1,
  modifiePar: 'a',
})

describe('Formulaire de saisie', () => {
  it('retrouve la même recette après un aller-retour dans le formulaire', () => {
    const r = enRecette()
    const sortie = schemaFormulaire.parse(valeursDepuisRecette(r))
    expect(sortie.titre).toBe(r.titre)
    expect(sortie.reference).toEqual(r.reference)
    expect(sortie.ingredients).toEqual(r.ingredients.map((i) => ({ ...i, quantiteMax: undefined, precision: undefined, groupeId: undefined })))
    expect(sortie.etapes).toEqual(r.etapes)
    expect(sortie.tempsCuisson).toBe(25)
  })

  it('ignore les lignes vides et lit les quantités saisies librement', () => {
    const v = valeursDepuisRecette()
    v.titre = 'Test'
    v.ingredients = [
      { ...ligneIngredientVide(), quantite: '1/2', unite: 'cac', nom: 'sel' },
      { ...ligneIngredientVide(), quantite: '2 à 3', unite: 'piece', nom: 'œufs' },
      ligneIngredientVide(),
    ]
    const sortie = schemaFormulaire.parse(v)
    expect(sortie.ingredients.map((i) => [i.quantite, i.quantiteMax])).toEqual([
      [0.5, undefined],
      [2, 3],
    ])
    expect(sortie.etapes).toEqual([]) // l'étape vide est retirée
  })

  it('signale les erreurs en français', () => {
    const v = valeursDepuisRecette()
    v.personnes = ''
    v.ingredients = [{ ...ligneIngredientVide(), quantite: 'beaucoup', nom: '' }]
    const r = schemaFormulaire.safeParse(v)
    expect(r.success).toBe(false)
    const messages = r.error!.issues.map((i) => `${i.path.join('.')} : ${i.message}`)
    expect(messages).toEqual(
      expect.arrayContaining([
        'titre : Donnez un titre à la recette',
        "ingredients.0.nom : Nom de l'ingrédient manquant",
        'ingredients.0.quantite : Quantité illisible (ex. : 200, 1,5, 1/2, 2 à 3)',
        'personnes : Indiquez un nombre de personnes ou un moule, pour pouvoir recalculer',
      ]),
    )
  })

  it('exige des dimensions complètes pour le moule', () => {
    const v = valeursDepuisRecette()
    v.titre = 'Cake'
    v.avecContenant = true
    v.contenant = { ...v.contenant, type: 'cake', longueur: '26', largeur: '', hauteur: '8' }
    expect(schemaFormulaire.safeParse(v).success).toBe(false)
    v.contenant.largeur = '10'
    expect(schemaFormulaire.parse(v).reference.contenant).toEqual({ type: 'cake', longueur: 26, largeur: 10, hauteur: 8 })
  })
})
