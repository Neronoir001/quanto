import { type BrouillonRecette, type Ingredient, nouvelId, recetteVide } from '../domaine/modele'
import { documentDepuisTexte } from '../domaine/texteRiche'
import type { BaseQuanto } from './base'
import { creerRecette } from './recettes'

type LigneIngredient = [quantite: number | undefined, unite: string, nom: string, options?: Partial<Ingredient>]

function recette(
  base: Partial<BrouillonRecette> & Pick<BrouillonRecette, 'titre'>,
  lignes: LigneIngredient[],
  etapes: string[],
): BrouillonRecette {
  const ingredients: Ingredient[] = lignes.map(([quantite, unite, nom, options]) => ({
    id: nouvelId(),
    quantite,
    unite,
    nom,
    recalcul: 'normal',
    ...options,
  }))
  return {
    ...recetteVide(),
    ...base,
    ingredients,
    etapes: etapes.map((t) => ({ id: nouvelId(), contenu: documentDepuisTexte(t, ingredients) })),
  }
}

/** Trois recettes pour découvrir Quanto. */
export function recettesExemples(): BrouillonRecette[] {
  return [
    recette(
      {
        titre: 'Fondant au chocolat',
        categorie: 'patisserie',
        difficulte: 'facile',
        tempsPreparation: 20,
        tempsCuisson: 25,
        reference: { personnes: 6, contenant: { type: 'rond', diametre: 24 } },
        tags: ['chocolat', 'goûter'],
        notes: 'Le centre doit rester légèrement tremblotant à la sortie du four : il se raffermit en refroidissant.',
      },
      [
        [200, 'g', 'chocolat noir'],
        [150, 'g', 'beurre'],
        [120, 'g', 'sucre'],
        [4, 'piece', 'œufs'],
        [60, 'g', 'farine'],
        [1, 'pincee', 'fleur de sel'],
      ],
      [
        'Préchauffez le four à 180 °C. Beurrez un moule rond de 24 cm.',
        'Faites fondre 200 g de chocolat avec 150 g de beurre au bain-marie.',
        'Fouettez 4 œufs avec 120 g de sucre jusqu’à ce que le mélange blanchisse.',
        'Ajoutez le chocolat fondu, puis 60 g de farine et 1 pincée de fleur de sel.',
        'Versez dans le moule et enfournez 25 min à 180 °C.',
      ],
    ),
    recette(
      {
        titre: 'Crêpes de la Chandeleur',
        categorie: 'dessert',
        difficulte: 'facile',
        tempsPreparation: 10,
        tempsCuisson: 30,
        tempsRepos: 60,
        reference: { personnes: 4 },
        tags: ['rapide', 'végétarien'],
      },
      [
        [250, 'g', 'farine'],
        [4, 'piece', 'œufs'],
        [50, 'cl', 'lait'],
        [50, 'g', 'beurre fondu'],
        [2, 'cas', 'sucre'],
        [1, 'sachet', 'sucre vanillé'],
        [1, 'pincee', 'sel'],
        [2, 'cas', 'rhum', { recalcul: 'fixe', precision: 'facultatif' }],
      ],
      [
        'Versez 250 g de farine dans un saladier, creusez un puits et cassez-y 4 œufs.',
        'Délayez progressivement avec 50 cl de lait en fouettant pour éviter les grumeaux.',
        'Ajoutez 50 g de beurre fondu, 2 càs de sucre, 1 sachet de sucre vanillé et 1 pincée de sel.',
        'Laissez reposer 1 h, puis faites cuire les crêpes dans une poêle bien chaude.',
      ],
    ),
    recette(
      {
        titre: 'Velouté de potiron',
        categorie: 'entree',
        difficulte: 'facile',
        tempsPreparation: 15,
        tempsCuisson: 30,
        reference: { personnes: 4 },
        tags: ['automne', 'végétarien', 'sans gluten'],
      },
      [
        [1, 'kg', 'potiron'],
        [1, 'piece', 'oignon'],
        [2, 'gousse', 'ail'],
        [75, 'cl', 'bouillon de légumes'],
        [20, 'cl', 'crème liquide'],
        [1, 'cac', 'sel'],
        [undefined, 'au-gout', 'poivre'],
      ],
      [
        'Épluchez 1 kg de potiron et coupez-le en cubes. Émincez l’oignon et 2 gousses d’ail.',
        'Faites revenir l’oignon et l’ail 5 min, ajoutez le potiron puis 75 cl de bouillon.',
        'Laissez cuire 25 min, mixez, puis ajoutez 20 cl de crème et 1 càc de sel.',
      ],
    ),
  ]
}

export async function ajouterExemples(db: BaseQuanto): Promise<void> {
  for (const r of recettesExemples()) await creerRecette(db, r)
}
