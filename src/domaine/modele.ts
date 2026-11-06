import { z } from 'zod'
import { estUniteConnue } from './unites'
import type { QuantiteSource } from './recalcul'

/**
 * Modèle de données de Quanto (cahier des charges, annexe C).
 * Les mêmes schémas valident la saisie, les imports et la synchronisation.
 */

export const CATEGORIES = ['entree', 'plat', 'dessert', 'patisserie', 'boisson', 'autre'] as const
export type Categorie = (typeof CATEGORIES)[number]
export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  entree: 'Entrée',
  plat: 'Plat',
  dessert: 'Dessert',
  patisserie: 'Pâtisserie',
  boisson: 'Boisson',
  autre: 'Autre',
}

export const DIFFICULTES = ['facile', 'moyen', 'difficile'] as const
export type Difficulte = (typeof DIFFICULTES)[number]
export const LIBELLES_DIFFICULTES: Record<Difficulte, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
}

const id = z.string().min(1)
const dimension = z.number().positive().optional()
const minutes = z.number().int().nonnegative().optional()
/** Horodatage en millisecondes (Date.now()). */
const horodatage = z.number().int().nonnegative()

export const contenantSchema = z.object({
  type: z.enum(['rond', 'carre', 'rectangulaire', 'cake', 'volume']),
  diametre: dimension,
  cote: dimension,
  longueur: dimension,
  largeur: dimension,
  hauteur: dimension,
  volume: dimension,
})

export const ingredientSchema = z
  .object({
    id,
    quantite: z.number().nonnegative().optional(),
    quantiteMax: z.number().nonnegative().optional(),
    unite: z.string().refine(estUniteConnue, 'Unité inconnue'),
    nom: z.string().trim().min(1, "Le nom de l'ingrédient est obligatoire"),
    precision: z.string().optional(),
    recalcul: z.enum(['normal', 'fixe']).default('normal'),
    groupeId: z.string().optional(),
  })
  .refine((i) => i.quantiteMax === undefined || (i.quantite !== undefined && i.quantiteMax >= i.quantite), {
    message: 'La fourchette doit aller du plus petit au plus grand',
    path: ['quantiteMax'],
  })

/**
 * Nœud de texte riche (format de l'éditeur TipTap).
 * Les quantités recalculables sont des nœuds de type « quantite » dont les attributs
 * sont { valeur, valeurMax?, unite, ingredientId? }.
 */
export interface NoeudRiche {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: NoeudRiche[]
}

export const noeudRicheSchema: z.ZodType<NoeudRiche, NoeudRiche> = z.lazy(() =>
  z.object({
    type: z.string(),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() })).optional(),
    content: z.array(noeudRicheSchema).optional(),
  }),
)

export const etapeSchema = z.object({ id, contenu: noeudRicheSchema })

export const recetteSchema = z.object({
  id,
  titre: z.string().trim().min(1, 'Le titre est obligatoire'),
  categorie: z.enum(CATEGORIES),
  photoId: z.string().optional(),
  tempsPreparation: minutes,
  tempsCuisson: minutes,
  tempsRepos: minutes,
  difficulte: z.enum(DIFFICULTES),
  reference: z.object({
    personnes: z.number().positive().optional(),
    contenant: contenantSchema.optional(),
  }),
  groupes: z.array(z.object({ id, nom: z.string().trim().min(1) })),
  ingredients: z.array(ingredientSchema),
  etapes: z.array(etapeSchema),
  notes: z.string().optional(),
  tags: z.array(z.string().trim().min(1)),
  favori: z.boolean(),
  collections: z.array(id),
  source: z
    .object({
      type: z.enum(['saisie', 'texte', 'web', 'pdf', 'photo', 'fichier']),
      url: z.string().optional(),
    })
    .optional(),
  creeLe: horodatage,
  modifieLe: horodatage,
  /** Identifiant de l'appareil qui a fait la dernière modification. */
  modifiePar: id,
  /** Présent si la recette est dans la corbeille. */
  supprimeLe: horodatage.optional(),
})

export const collectionSchema = z.object({
  id,
  nom: z.string().trim().min(1, 'Le nom est obligatoire'),
  couleur: z.string().optional(),
  ordre: z.number(),
  creeLe: horodatage,
  modifieLe: horodatage,
  modifiePar: id,
  supprimeLe: horodatage.optional(),
})

export type Contenant = z.infer<typeof contenantSchema>
export type Ingredient = z.infer<typeof ingredientSchema>
export type Etape = z.infer<typeof etapeSchema>
export type Recette = z.infer<typeof recetteSchema>
export type Collection = z.infer<typeof collectionSchema>

/** Champs gérés automatiquement par le stockage. */
export type ChampsAuto = 'id' | 'creeLe' | 'modifieLe' | 'modifiePar' | 'supprimeLe'
export type BrouillonRecette = Omit<Recette, ChampsAuto>

export interface Photo {
  id: string
  /** Image compressée (WebP, 1 600 px maximum). */
  image: Blob
  miniature: Blob
  modifieLe: number
}

/** Ancienne version d'une recette, conservée 30 jours. */
export interface Version {
  num?: number
  recetteId: string
  contenu: Recette
  date: number
}

/** Trace d'une recette définitivement effacée, pour que la synchronisation ne la fasse pas revenir. */
export interface Effacement {
  id: string
  date: number
}

export interface Reglage {
  cle: string
  valeur: unknown
}

export function nouvelId(): string {
  return crypto.randomUUID()
}

/** Recette vide avec des valeurs par défaut raisonnables. */
export function recetteVide(): BrouillonRecette {
  return {
    titre: '',
    categorie: 'plat',
    difficulte: 'facile',
    reference: { personnes: 4 },
    groupes: [],
    ingredients: [],
    etapes: [],
    tags: [],
    favori: false,
    collections: [],
    source: { type: 'saisie' },
  }
}

/** Passe d'un ingrédient enregistré à une quantité pour le moteur de recalcul. */
export function quantiteDeIngredient(i: Ingredient): QuantiteSource {
  return { valeur: i.quantite, valeurMax: i.quantiteMax, unite: i.unite, recalcul: i.recalcul, nom: i.nom }
}
