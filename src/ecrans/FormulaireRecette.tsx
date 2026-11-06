import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ChevronDown, ChevronUp, Ellipsis, Plus, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Controller, type FieldError, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useParams } from 'wouter'
import ChampPhoto from '../composants/ChampPhoto'
import ChampTags from '../composants/ChampTags'
import Confirmation from '../composants/Confirmation'
import EditeurEtape from '../composants/editeur/EditeurEtape'
import { useMessage } from '../composants/Messages'
import Puce from '../composants/Puce'
import { LIBELLES_TYPES, type TypeContenant } from '../domaine/contenants'
import {
  type ContenuFormulaire,
  etapeVide,
  ligneIngredientVide,
  schemaFormulaire,
  valeursDepuisRecette,
  type ValeursFormulaire,
} from '../domaine/formulaire'
import {
  CATEGORIES,
  DIFFICULTES,
  type Ingredient,
  LIBELLES_CATEGORIES,
  LIBELLES_DIFFICULTES,
  nouvelId,
  type Recette,
} from '../domaine/modele'
import { tousLesTags } from '../domaine/recherche'
import { UNITES, type Famille } from '../domaine/unites'
import { base } from '../donnees/base'
import { useRecette, useRecettes } from '../donnees/hooks'
import { creerRecette, modifierRecette } from '../donnees/recettes'

export default function FormulaireRecette() {
  const { id } = useParams<{ id?: string }>()
  const recette = useRecette(id)
  if (recette === undefined) return <p className="py-20 text-center text-texte-doux">Chargement…</p>
  if (id && recette === null) {
    return (
      <p className="py-20 text-center">
        Recette introuvable.{' '}
        <Link href="/" className="text-primaire underline">
          Retour
        </Link>
      </p>
    )
  }
  return <Formulaire key={id ?? 'nouvelle'} recette={recette ?? undefined} />
}

// ————————————————————————————————————————————————————————————————
// Brouillon automatique
// ————————————————————————————————————————————————————————————————

interface Brouillon {
  date: number
  valeurs: ValeursFormulaire
}

function lireBrouillon(cle: string, recette?: Recette): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(cle) ?? 'null') as Brouillon | null
    if (!b || (recette && b.date <= recette.modifieLe)) return null
    return b
  } catch {
    return null
  }
}

function effacerBrouillon(cle: string) {
  try {
    localStorage.removeItem(cle)
  } catch {
    /* rien à effacer */
  }
}

// ————————————————————————————————————————————————————————————————
// Formulaire
// ————————————————————————————————————————————————————————————————

const FAMILLES: { famille: Famille; libelle: string }[] = [
  { famille: 'masse', libelle: 'Poids' },
  { famille: 'volume', libelle: 'Volume' },
  { famille: 'cuillere', libelle: 'Cuillères' },
  { famille: 'piece', libelle: 'Pièces' },
  { famille: 'conditionnement', libelle: 'Conditionnements' },
  { famille: 'non-mesurable', libelle: 'Sans mesure' },
]

const TYPES_CONTENANT: TypeContenant[] = ['rond', 'carre', 'rectangulaire', 'cake', 'volume']
const CHAMPS_CONTENANT: Record<TypeContenant, { champ: 'diametre' | 'cote' | 'longueur' | 'largeur' | 'hauteur' | 'volume'; libelle: string; unite: string }[]> = {
  rond: [{ champ: 'diametre', libelle: 'Diamètre', unite: 'cm' }],
  carre: [{ champ: 'cote', libelle: 'Côté', unite: 'cm' }],
  rectangulaire: [
    { champ: 'longueur', libelle: 'Longueur', unite: 'cm' },
    { champ: 'largeur', libelle: 'Largeur', unite: 'cm' },
  ],
  cake: [
    { champ: 'longueur', libelle: 'Longueur', unite: 'cm' },
    { champ: 'largeur', libelle: 'Largeur', unite: 'cm' },
    { champ: 'hauteur', libelle: 'Hauteur', unite: 'cm' },
  ],
  volume: [{ champ: 'volume', libelle: 'Volume', unite: 'L' }],
}

const champ = 'w-full rounded-xl border border-bord bg-fond px-3 py-2.5 transition focus:border-primaire focus:outline-none aria-[invalid=true]:border-alerte'
const boutonIcone = 'flex size-9 shrink-0 items-center justify-center rounded-full text-texte-doux transition hover:bg-fond hover:text-texte disabled:invisible'

function Formulaire({ recette }: { recette?: Recette }) {
  const [, naviguer] = useLocation()
  const afficher = useMessage()
  const toutes = useRecettes()
  const cleBrouillon = `quanto.brouillon.${recette?.id ?? 'nouvelle'}`
  const [brouillon, setBrouillon] = useState(() => lireBrouillon(cleBrouillon, recette))
  const [versionEditeurs, setVersionEditeurs] = useState(0)
  const [confirmerAbandon, setConfirmerAbandon] = useState(false)
  const [optionsOuvertes, setOptionsOuvertes] = useState<Set<string>>(new Set())

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ValeursFormulaire, unknown, ContenuFormulaire>({
    resolver: zodResolver(schemaFormulaire),
    defaultValues: valeursDepuisRecette(recette),
    mode: 'onTouched',
  })

  const lignes = useFieldArray({ control, name: 'ingredients', keyName: 'cle' })
  const etapes = useFieldArray({ control, name: 'etapes', keyName: 'cle' })
  const groupes = useFieldArray({ control, name: 'groupes', keyName: 'cle' })

  const categorie = useWatch({ control, name: 'categorie' })
  const avecContenant = useWatch({ control, name: 'avecContenant' })
  const typeContenant = useWatch({ control, name: 'contenant.type' })
  const lignesSaisies = useWatch({ control, name: 'ingredients' })
  const groupesSaisis = useWatch({ control, name: 'groupes' })

  // Ingrédients connus de l'éditeur, pour relier « 200 g de chocolat » à l'ingrédient « chocolat noir ».
  const ingredientsPourEditeur = useMemo<Ingredient[]>(
    () =>
      (lignesSaisies ?? [])
        .filter((l) => l.nom.trim())
        .map((l) => ({ id: l.id, nom: l.nom, unite: l.unite, recalcul: l.fixe ? 'fixe' : 'normal' })),
    [lignesSaisies],
  )
  const nomsConnus = useMemo(
    () => [...new Set((toutes ?? []).flatMap((r) => r.ingredients.map((i) => i.nom)))].sort((a, b) => a.localeCompare(b, 'fr')),
    [toutes],
  )
  const tagsExistants = useMemo(() => tousLesTags(toutes ?? []), [toutes])

  // Sauvegarde automatique du brouillon, une seconde après la dernière frappe.
  const minuteur = useRef<number | undefined>(undefined)
  useEffect(() => {
    const abonnement = watch(() => {
      window.clearTimeout(minuteur.current)
      minuteur.current = window.setTimeout(() => {
        try {
          localStorage.setItem(cleBrouillon, JSON.stringify({ date: Date.now(), valeurs: getValues() }))
        } catch {
          /* stockage plein ou indisponible */
        }
      }, 1000)
    })
    return () => {
      abonnement.unsubscribe()
      window.clearTimeout(minuteur.current)
    }
  }, [watch, getValues, cleBrouillon])

  const retour = recette ? `/recette/${recette.id}` : '/'

  const enregistrer = handleSubmit(
    async (contenu) => {
      window.clearTimeout(minuteur.current)
      let idFinal: string
      if (recette) {
        await modifierRecette(base, recette.id, contenu)
        idFinal = recette.id
      } else {
        const r = await creerRecette(base, { ...contenu, favori: false, collections: [], source: { type: 'saisie' } })
        idFinal = r.id
      }
      effacerBrouillon(cleBrouillon)
      afficher(recette ? 'Modifications enregistrées.' : 'Recette enregistrée.')
      naviguer(`/recette/${idFinal}`, { replace: true })
    },
    () => afficher('Il manque des informations : vérifiez les champs signalés en rouge.'),
  )

  const abandonner = () => {
    window.clearTimeout(minuteur.current)
    effacerBrouillon(cleBrouillon)
    naviguer(retour)
  }

  const ajouterIngredient = (index?: number) => {
    const ligne = ligneIngredientVide()
    if (index === undefined) lignes.append(ligne, { focusName: `ingredients.${lignes.fields.length}.quantite` })
    else lignes.insert(index + 1, ligne, { focusName: `ingredients.${index + 1}.quantite` })
  }

  const basculerOptions = (cle: string) =>
    setOptionsOuvertes((o) => {
      const n = new Set(o)
      if (n.has(cle)) n.delete(cle)
      else n.add(cle)
      return n
    })

  return (
    <form onSubmit={enregistrer} noValidate className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={retour} className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> {recette ? 'Retour à la recette' : 'Mes recettes'}
        </Link>
        <h1 className="mt-3 font-serif text-4xl font-semibold">{recette ? 'Modifier la recette' : 'Nouvelle recette'}</h1>
      </div>

      {brouillon && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dore bg-dore-fond px-4 py-3">
          <span>
            Un brouillon non enregistré du{' '}
            {new Date(brouillon.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} a été retrouvé.
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset(brouillon.valeurs, { keepDefaultValues: true })
                setVersionEditeurs((v) => v + 1)
                setBrouillon(null)
              }}
              className="rounded-full bg-primaire px-4 py-1.5 font-medium text-sur-primaire"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => {
                effacerBrouillon(cleBrouillon)
                setBrouillon(null)
              }}
              className="rounded-full px-3 py-1.5 font-medium text-texte-doux hover:text-texte"
            >
              Ignorer
            </button>
          </span>
        </div>
      )}

      {/* L'essentiel */}
      <Section titre="L'essentiel">
        <Champ libelle="Titre de la recette" erreur={errors.titre}>
          {(p) => <input {...p} {...register('titre')} autoComplete="off" placeholder="Ex. : Tarte aux pommes de mamie" className={`${champ} font-serif text-xl`} />}
        </Champ>

        <Controller
          control={control}
          name="categorie"
          render={({ field }) => (
            <Groupe libelle="Catégorie">
              {CATEGORIES.map((c) => (
                <Puce key={c} actif={field.value === c} onClick={() => field.onChange(c)} taille="petite">
                  {LIBELLES_CATEGORIES[c]}
                </Puce>
              ))}
            </Groupe>
          )}
        />

        <Controller
          control={control}
          name="difficulte"
          render={({ field }) => (
            <Groupe libelle="Difficulté">
              {DIFFICULTES.map((d) => (
                <Puce key={d} actif={field.value === d} onClick={() => field.onChange(d)} taille="petite">
                  {LIBELLES_DIFFICULTES[d]}
                </Puce>
              ))}
            </Groupe>
          )}
        />

        <div>
          <p className="mb-2 font-medium">Photo</p>
          <Controller
            control={control}
            name="photoId"
            render={({ field }) => <ChampPhoto photoId={field.value} categorie={categorie} onChange={field.onChange} />}
          />
        </div>
      </Section>

      {/* Temps */}
      <Section titre="Temps">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['tempsPreparation', 'Préparation'],
              ['tempsCuisson', 'Cuisson'],
              ['tempsRepos', 'Repos'],
            ] as const
          ).map(([nom, libelle]) => (
            <Champ key={nom} libelle={libelle} erreur={errors[nom]}>
              {(p) => (
                <div className="relative">
                  <input {...p} {...register(nom)} inputMode="numeric" placeholder="0" className={`${champ} pr-12 tabular-nums`} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texte-doux">min</span>
                </div>
              )}
            </Champ>
          ))}
        </div>
      </Section>

      {/* Référence */}
      <Section titre="Pour combien ?" description="C'est la base du recalcul : indiquez le nombre de personnes, le moule utilisé, ou les deux.">
        <div className="max-w-[12rem]">
          <Champ libelle="Nombre de personnes" erreur={errors.personnes}>
            {(p) => <input {...p} {...register('personnes')} inputMode="decimal" className={`${champ} tabular-nums`} />}
          </Champ>
        </div>
        <label className="flex items-center gap-3 font-medium">
          <input type="checkbox" {...register('avecContenant')} className="size-5 accent-[var(--primaire)]" />
          Préciser le moule ou le plat de la recette
        </label>
        {avecContenant && (
          <div className="space-y-3 rounded-2xl border border-bord bg-fond p-4">
            <Controller
              control={control}
              name="contenant.type"
              render={({ field }) => (
                <Groupe libelle="Type de moule">
                  {TYPES_CONTENANT.map((t) => (
                    <Puce key={t} actif={field.value === t} onClick={() => field.onChange(t)} taille="petite">
                      {LIBELLES_TYPES[t]}
                    </Puce>
                  ))}
                </Groupe>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              {CHAMPS_CONTENANT[typeContenant].map(({ champ: nom, libelle, unite }) => (
                <Champ key={nom} libelle={libelle}>
                  {(p) => (
                    <div className="relative">
                      <input {...p} {...register(`contenant.${nom}`)} inputMode="decimal" className={`${champ} pr-10 tabular-nums`} />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texte-doux">{unite}</span>
                    </div>
                  )}
                </Champ>
              ))}
            </div>
            {errors.contenant?.type && <MessageErreur>{errors.contenant.type.message}</MessageErreur>}
          </div>
        )}
      </Section>

      {/* Ingrédients */}
      <Section titre="Ingrédients" description="Quantités acceptées : 200, 1,5, 1/2, ½, ou une fourchette « 2 à 3 ». Laissez vide pour « sel, poivre ».">
        {groupes.fields.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-bord bg-fond p-3">
            <p className="text-sm font-semibold">Groupes d'ingrédients</p>
            {groupes.fields.map((g, n) => (
              <div key={g.cle} className="flex items-center gap-2">
                <input {...register(`groupes.${n}.nom`)} aria-label={`Nom du groupe ${n + 1}`} placeholder="Ex. : Pour la pâte" className={champ} />
                <button type="button" onClick={() => groupes.remove(n)} aria-label={`Supprimer le groupe ${n + 1}`} className={boutonIcone}>
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <datalist id="noms-ingredients">
          {nomsConnus.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <ol className="space-y-3">
          {lignes.fields.map((f, n) => {
            const err = errors.ingredients?.[n]
            const ouvert = optionsOuvertes.has(f.cle)
            const groupe = groupesSaisis?.find((g) => g.id === lignesSaisies?.[n]?.groupeId && g.nom.trim())
            return (
              <li key={f.cle} className="rounded-2xl border border-bord bg-surface p-2.5">
                <div className="grid grid-cols-[5.5rem_6.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[5.5rem_6.5rem_minmax(0,1fr)_auto]">
                  <div>
                    <input
                      {...register(`ingredients.${n}.quantite`)}
                      aria-label={`Quantité, ingrédient ${n + 1}`}
                      aria-invalid={!!err?.quantite}
                      inputMode="decimal"
                      placeholder="Qté"
                      className={`${champ} text-right tabular-nums`}
                    />
                  </div>
                  <select {...register(`ingredients.${n}.unite`)} aria-label={`Unité, ingrédient ${n + 1}`} className={`${champ} px-2`}>
                    {FAMILLES.map(({ famille, libelle }) => (
                      <optgroup key={famille} label={libelle}>
                        {UNITES.filter((u) => u.famille === famille).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.id === 'piece' ? 'pièce(s)' : u.singulier}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    {...register(`ingredients.${n}.nom`)}
                    aria-label={`Nom, ingrédient ${n + 1}`}
                    aria-invalid={!!err?.nom}
                    list="noms-ingredients"
                    autoComplete="off"
                    placeholder="Ingrédient"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        ajouterIngredient(n)
                      }
                    }}
                    className={`${champ} col-span-3 row-start-2 sm:col-span-1 sm:row-start-1`}
                  />
                  <div className="col-start-3 row-start-1 flex items-center justify-self-end sm:col-start-4">
                    <button type="button" onClick={() => lignes.move(n, n - 1)} disabled={n === 0} aria-label={`Monter l'ingrédient ${n + 1}`} className={boutonIcone}>
                      <ChevronUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => lignes.move(n, n + 1)} disabled={n === lignes.fields.length - 1} aria-label={`Descendre l'ingrédient ${n + 1}`} className={boutonIcone}>
                      <ChevronDown className="size-4" />
                    </button>
                    <button type="button" onClick={() => basculerOptions(f.cle)} aria-expanded={ouvert} aria-label={`Plus d'options, ingrédient ${n + 1}`} className={boutonIcone}>
                      <Ellipsis className="size-4" />
                    </button>
                    <button type="button" onClick={() => lignes.remove(n)} aria-label={`Supprimer l'ingrédient ${n + 1}`} className={boutonIcone}>
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                {(err?.quantite || err?.nom) && <MessageErreur>{err.quantite?.message ?? err.nom?.message}</MessageErreur>}
                {groupe && !ouvert && <p className="mt-1 px-1 text-xs font-medium text-primaire">{groupe.nom}</p>}
                {ouvert && (
                  <div className="mt-2 grid gap-3 border-t border-bord pt-3 sm:grid-cols-2">
                    <input {...register(`ingredients.${n}.precision`)} aria-label={`Précision, ingrédient ${n + 1}`} placeholder="Précision (ex. : tamisée)" className={champ} />
                    {groupes.fields.length > 0 && (
                      <select {...register(`ingredients.${n}.groupeId`)} aria-label={`Groupe, ingrédient ${n + 1}`} className={champ}>
                        <option value="">Sans groupe</option>
                        {groupesSaisis?.map((g, i) => (
                          <option key={g.id} value={g.id}>
                            {g.nom.trim() || `Groupe ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-center gap-2 sm:col-span-2">
                      <input type="checkbox" {...register(`ingredients.${n}.fixe`)} className="size-5 accent-[var(--primaire)]" />
                      Ne pas recalculer cette quantité (zeste, piment…)
                    </label>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => ajouterIngredient()} className="inline-flex items-center gap-2 rounded-full border border-primaire px-4 py-2 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire">
            <Plus className="size-4" aria-hidden="true" /> Ajouter un ingrédient
          </button>
          <button type="button" onClick={() => groupes.append({ id: nouvelId(), nom: '' }, { focusName: `groupes.${groupes.fields.length}.nom` })} className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-texte-doux transition hover:text-texte">
            <Plus className="size-4" aria-hidden="true" /> Ajouter un groupe
          </button>
        </div>
      </Section>

      {/* Étapes */}
      <Section
        titre="Préparation"
        description="Les quantités en pastille dorée seront recalculées. Quanto repère automatiquement « 100 g », « 2 càs »… : touchez « Les rendre recalculables »."
      >
        <ol className="space-y-4">
          {etapes.fields.map((f, n) => (
            <li key={f.cle} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-primaire font-serif font-semibold text-sur-primaire">
                {n + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Controller
                  control={control}
                  name={`etapes.${n}.contenu`}
                  render={({ field }) => (
                    <EditeurEtape
                      key={`${f.cle}-${versionEditeurs}`}
                      valeur={field.value}
                      onChange={field.onChange}
                      ingredients={ingredientsPourEditeur}
                      libelle={`Étape ${n + 1}`}
                    />
                  )}
                />
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={() => etapes.move(n, n - 1)} disabled={n === 0} aria-label={`Monter l'étape ${n + 1}`} className={boutonIcone}>
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={() => etapes.move(n, n + 1)} disabled={n === etapes.fields.length - 1} aria-label={`Descendre l'étape ${n + 1}`} className={boutonIcone}>
                  <ChevronDown className="size-4" />
                </button>
                <button type="button" onClick={() => etapes.remove(n)} aria-label={`Supprimer l'étape ${n + 1}`} className={boutonIcone}>
                  <X className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => etapes.append(etapeVide())} className="inline-flex items-center gap-2 rounded-full border border-primaire px-4 py-2 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire">
          <Plus className="size-4" aria-hidden="true" /> Ajouter une étape
        </button>
      </Section>

      {/* Notes et tags */}
      <Section titre="Notes et conseils">
        <Champ libelle="Notes (facultatif)">
          {(p) => <textarea {...p} {...register('notes')} rows={4} placeholder="Astuces, variantes, accords…" className={champ} />}
        </Champ>
        <div>
          <p className="mb-2 font-medium">Tags</p>
          <Controller control={control} name="tags" render={({ field }) => <ChampTags valeur={field.value} onChange={field.onChange} existants={tagsExistants} />} />
        </div>
      </Section>

      {/* Barre d'enregistrement */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-2 flex items-center justify-end gap-3 rounded-full border border-bord bg-surface/95 p-2 shadow-lg backdrop-blur md:bottom-4">
        <span className="mr-auto pl-3 text-sm text-texte-doux">{isDirty ? 'Brouillon sauvegardé automatiquement' : ''}</span>
        <button type="button" onClick={() => (isDirty ? setConfirmerAbandon(true) : naviguer(retour))} className="rounded-full px-4 py-2.5 font-medium text-texte-doux hover:text-texte">
          Annuler
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-full bg-primaire px-6 py-2.5 font-semibold text-sur-primaire shadow-sm transition hover:opacity-90 disabled:opacity-60">
          Enregistrer
        </button>
      </div>

      <Confirmation
        ouvert={confirmerAbandon}
        titre="Abandonner les modifications ?"
        message="Ce que vous avez saisi depuis le dernier enregistrement sera perdu."
        confirmer="Abandonner"
        dangereux
        onConfirmer={abandonner}
        onAnnuler={() => setConfirmerAbandon(false)}
      />
    </form>
  )
}

// ————————————————————————————————————————————————————————————————
// Petits éléments de mise en page
// ————————————————————————————————————————————————————————————————

function Section({ titre, description, children }: { titre: string; description?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-4 rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 id={id} className="font-serif text-2xl font-semibold">
          {titre}
        </h2>
        {description && <p className="mt-1 text-sm text-texte-doux">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Groupe({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={libelle}>
      <p className="mb-2 font-medium">{libelle}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function MessageErreur({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1 px-1 text-sm font-medium text-alerte">
      {children}
    </p>
  )
}

/** Champ avec libellé et message d'erreur reliés pour les lecteurs d'écran. */
function Champ({
  libelle,
  erreur,
  children,
}: {
  libelle: string
  erreur?: FieldError
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {libelle}
      </label>
      {children({ id, 'aria-invalid': !!erreur, 'aria-describedby': erreur ? `${id}-erreur` : undefined })}
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="mt-1 text-sm font-medium text-alerte">
          {erreur.message}
        </p>
      )}
    </div>
  )
}
