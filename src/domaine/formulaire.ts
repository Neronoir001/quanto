import { z } from 'zod'
import { ecrireQuantite, lireNombre, lireQuantite } from './analyse'
import { type Contenant, estComplet, type TypeContenant } from './contenants'
import {
  type BrouillonRecette,
  CATEGORIES,
  DIFFICULTES,
  type Ingredient,
  noeudRicheSchema,
  nouvelId,
  type Recette,
} from './modele'
import { documentVide, estVide } from './texteRiche'

/**
 * Formulaire de saisie : les champs sont du texte (« 1,5 », « 2 à 3 »…), convertis
 * en recette à l'enregistrement. Le même schéma Zod sert à valider et à convertir.
 */

export interface LigneIngredientFormulaire {
  id: string
  quantite: string
  unite: string
  nom: string
  precision: string
  fixe: boolean
  groupeId: string
}

const dimensions = ['diametre', 'cote', 'longueur', 'largeur', 'hauteur', 'volume'] as const
type Dimensions = Record<(typeof dimensions)[number], string>

export interface ValeursFormulaire {
  titre: string
  categorie: (typeof CATEGORIES)[number]
  difficulte: (typeof DIFFICULTES)[number]
  photoId: string
  tempsPreparation: string
  tempsCuisson: string
  tempsRepos: string
  personnes: string
  avecContenant: boolean
  contenant: { type: TypeContenant } & Dimensions
  groupes: { id: string; nom: string }[]
  ingredients: LigneIngredientFormulaire[]
  etapes: { id: string; contenu: z.infer<typeof noeudRicheSchema> }[]
  notes: string
  tags: string[]
}

/** Ce que produit le formulaire (favoris, collections et source sont gérés ailleurs). */
export type ContenuFormulaire = Omit<BrouillonRecette, 'favori' | 'collections' | 'source'>

export function ligneIngredientVide(groupeId = ''): LigneIngredientFormulaire {
  return { id: nouvelId(), quantite: '', unite: 'g', nom: '', precision: '', fixe: false, groupeId }
}

export function etapeVide() {
  return { id: nouvelId(), contenu: documentVide() }
}

const ligneVide = (i: LigneIngredientFormulaire) => !i.nom.trim() && !i.quantite.trim() && !i.precision.trim()

const texteNombre = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','))

function lireContenant(c: ValeursFormulaire['contenant']): Contenant | undefined {
  const contenant: Contenant = { type: c.type }
  for (const d of dimensions) {
    const v = lireNombre(c[d])
    if (v !== undefined && v > 0) contenant[d] = v
  }
  // Ne garde que les dimensions utiles au type choisi.
  const utiles: Record<TypeContenant, (typeof dimensions)[number][]> = {
    rond: ['diametre', 'hauteur'],
    carre: ['cote', 'hauteur'],
    rectangulaire: ['longueur', 'largeur', 'hauteur'],
    cake: ['longueur', 'largeur', 'hauteur'],
    volume: ['volume'],
  }
  for (const d of dimensions) if (!utiles[c.type].includes(d)) delete contenant[d]
  return estComplet(contenant) ? contenant : undefined
}

const minutes = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{1,4}$/.test(v), 'En minutes, sans virgule (ex. : 45)')

export const schemaFormulaire = z
  .object({
    titre: z.string().trim().min(1, 'Donnez un titre à la recette'),
    categorie: z.enum(CATEGORIES),
    difficulte: z.enum(DIFFICULTES),
    photoId: z.string(),
    tempsPreparation: minutes,
    tempsCuisson: minutes,
    tempsRepos: minutes,
    personnes: z
      .string()
      .trim()
      .refine((v) => v === '' || (lireNombre(v) ?? 0) > 0, 'Nombre de personnes invalide'),
    avecContenant: z.boolean(),
    contenant: z.object({
      type: z.enum(['rond', 'carre', 'rectangulaire', 'cake', 'volume']),
      diametre: z.string(),
      cote: z.string(),
      longueur: z.string(),
      largeur: z.string(),
      hauteur: z.string(),
      volume: z.string(),
    }),
    groupes: z.array(z.object({ id: z.string(), nom: z.string() })),
    ingredients: z.array(
      z.object({
        id: z.string(),
        quantite: z.string(),
        unite: z.string(),
        nom: z.string(),
        precision: z.string(),
        fixe: z.boolean(),
        groupeId: z.string(),
      }),
    ),
    etapes: z.array(z.object({ id: z.string(), contenu: noeudRicheSchema })),
    notes: z.string(),
    tags: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    v.ingredients.forEach((i, n) => {
      if (ligneVide(i)) return
      if (!i.nom.trim()) {
        ctx.addIssue({ code: 'custom', path: ['ingredients', n, 'nom'], message: "Nom de l'ingrédient manquant" })
      }
      if (lireQuantite(i.quantite) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['ingredients', n, 'quantite'],
          message: 'Quantité illisible (ex. : 200, 1,5, 1/2, 2 à 3)',
        })
      }
    })
    if (v.avecContenant && !lireContenant(v.contenant)) {
      ctx.addIssue({ code: 'custom', path: ['contenant', 'type'], message: 'Dimensions du moule incomplètes' })
    }
    if (v.personnes.trim() === '' && !v.avecContenant) {
      ctx.addIssue({
        code: 'custom',
        path: ['personnes'],
        message: 'Indiquez un nombre de personnes ou un moule, pour pouvoir recalculer',
      })
    }
  })
  .transform((v): ContenuFormulaire => {
    const groupesNommes = v.groupes.filter((g) => g.nom.trim())
    const idsGroupes = new Set(groupesNommes.map((g) => g.id))
    const ingredients: Ingredient[] = v.ingredients
      .filter((i) => !ligneVide(i))
      .map((i) => {
        const q = lireQuantite(i.quantite) ?? {}
        return {
          id: i.id,
          quantite: q.valeur,
          quantiteMax: q.valeurMax,
          unite: i.unite,
          nom: i.nom.trim(),
          precision: i.precision.trim() || undefined,
          recalcul: i.fixe ? 'fixe' : 'normal',
          groupeId: idsGroupes.has(i.groupeId) ? i.groupeId : undefined,
        }
      })
    const minutesOuRien = (t: string) => (t.trim() === '' ? undefined : Number(t))
    return {
      titre: v.titre.trim(),
      categorie: v.categorie,
      difficulte: v.difficulte,
      photoId: v.photoId || undefined,
      tempsPreparation: minutesOuRien(v.tempsPreparation),
      tempsCuisson: minutesOuRien(v.tempsCuisson),
      tempsRepos: minutesOuRien(v.tempsRepos),
      reference: {
        personnes: lireNombre(v.personnes),
        contenant: v.avecContenant ? lireContenant(v.contenant) : undefined,
      },
      groupes: groupesNommes.map((g) => ({ id: g.id, nom: g.nom.trim() })),
      ingredients,
      etapes: v.etapes.filter((e) => !estVide(e.contenu)),
      notes: v.notes.trim() || undefined,
      tags: [...new Set(v.tags.map((t) => t.trim()).filter(Boolean))],
    }
  })

/** Valeurs du formulaire pour une nouvelle recette, ou pour modifier une recette existante. */
export function valeursDepuisRecette(r?: Recette): ValeursFormulaire {
  const c = r?.reference.contenant
  return {
    titre: r?.titre ?? '',
    categorie: r?.categorie ?? 'plat',
    difficulte: r?.difficulte ?? 'facile',
    photoId: r?.photoId ?? '',
    tempsPreparation: texteNombre(r?.tempsPreparation),
    tempsCuisson: texteNombre(r?.tempsCuisson),
    tempsRepos: texteNombre(r?.tempsRepos),
    personnes: r ? texteNombre(r.reference.personnes) : '4',
    avecContenant: !!c,
    contenant: {
      type: c?.type ?? 'rond',
      diametre: texteNombre(c?.diametre ?? (c ? undefined : 24)),
      cote: texteNombre(c?.cote),
      longueur: texteNombre(c?.longueur),
      largeur: texteNombre(c?.largeur),
      hauteur: texteNombre(c?.hauteur),
      volume: texteNombre(c?.volume),
    },
    groupes: r?.groupes.map((g) => ({ ...g })) ?? [],
    ingredients: r?.ingredients.length
      ? r.ingredients.map((i) => ({
          id: i.id,
          quantite: ecrireQuantite(i.quantite, i.quantiteMax),
          unite: i.unite,
          nom: i.nom,
          precision: i.precision ?? '',
          fixe: i.recalcul === 'fixe',
          groupeId: i.groupeId ?? '',
        }))
      : [ligneIngredientVide()],
    etapes: r?.etapes.length ? r.etapes.map((e) => ({ ...e })) : [etapeVide()],
    notes: r?.notes ?? '',
    tags: [...(r?.tags ?? [])],
  }
}
