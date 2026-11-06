import { ArrowLeft, ChefHat, Clock, Copy, Flame, Heart, Hourglass, Pencil, RotateCcw, Trash, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { VisuelRecette } from '../composants/Categorie'
import Confirmation from '../composants/Confirmation'
import Historique from '../composants/Historique'
import { useMessage } from '../composants/Messages'
import BandeauRecalcul from '../composants/BandeauRecalcul'
import PanneauRecalcul from '../composants/PanneauRecalcul'
import TexteRiche, { Quantite } from '../composants/TexteRiche'
import { accorderNom } from '../domaine/accord'
import { decrireContenant } from '../domaine/contenants'
import { type Ingredient, LIBELLES_CATEGORIES, LIBELLES_DIFFICULTES, quantiteDeIngredient, type Recette } from '../domaine/modele'
import { avertissements, calculerRatio, type Cible, recalculerQuantite } from '../domaine/recalcul'
import { formaterDuree } from '../domaine/recherche'
import { base } from '../donnees/base'
import { useRecette } from '../donnees/hooks'
import { usePhoto } from '../donnees/photos'
import { basculerFavori, dupliquerRecette, noterConsultation, restaurerRecette, supprimerRecette } from '../donnees/recettes'

const cleCible = (id: string) => `quanto.recalcul.${id}`

function cibleInitiale(r: Recette): Cible | null {
  try {
    const memorisee = JSON.parse(sessionStorage.getItem(cleCible(r.id)) ?? 'null') as Cible | null
    if (memorisee?.mode === 'personnes' && r.reference.personnes) return memorisee
    if (memorisee?.mode === 'contenant' && r.reference.contenant) return memorisee
  } catch {
    /* rien de mémorisé */
  }
  if (r.reference.personnes) return { mode: 'personnes', personnes: r.reference.personnes }
  if (r.reference.contenant) return { mode: 'contenant', contenant: { ...r.reference.contenant } }
  return null
}

export default function FicheRecette() {
  const { id } = useParams<{ id: string }>()
  const recette = useRecette(id)

  useEffect(() => {
    if (id) void noterConsultation(base, id)
  }, [id])

  if (recette === undefined) return <p className="py-20 text-center text-texte-doux">Chargement…</p>
  if (recette === null || recette.supprimeLe) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-2xl">Cette recette n'existe plus.</p>
        <Link href="/" className="mt-4 inline-block text-primaire underline underline-offset-4">
          Retour à mes recettes
        </Link>
      </div>
    )
  }
  // La clé réinitialise le recalcul quand on change de recette.
  return <Fiche key={recette.id} r={recette} />
}

function Fiche({ r }: { r: Recette }) {
  const [, naviguer] = useLocation()
  const afficher = useMessage()
  const photo = usePhoto(r.photoId, 'image')
  const [cible, setCible] = useState<Cible | null>(() => cibleInitiale(r))
  useEffect(() => {
    try {
      if (cible) sessionStorage.setItem(cleCible(r.id), JSON.stringify(cible))
    } catch {
      /* stockage indisponible */
    }
  }, [cible, r.id])

  // Bandeau de recalcul sur téléphone : visible quand le panneau sort de l'écran.
  const refPanneau = useRef<HTMLDivElement>(null)
  const [panneauVisible, setPanneauVisible] = useState(true)
  useEffect(() => {
    const el = refPanneau.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setPanneauVisible(e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const [survole, setSurvole] = useState<string | null>(null)
  const [coches, setCoches] = useState<Set<string>>(new Set())
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false)

  const ratio = cible ? calculerRatio(r.reference, cible) : 1
  const k = ratio ?? 1
  const alertes = cible && ratio !== null ? avertissements(ratio, cible) : []

  const supprimer = async () => {
    setConfirmerSuppression(false)
    await supprimerRecette(base, r.id)
    naviguer('/')
    afficher(`« ${r.titre} » mise à la corbeille.`, {
      action: { libelle: 'Annuler', faire: () => void restaurerRecette(base, r.id) },
    })
  }

  const dupliquer = async () => {
    const copie = await dupliquerRecette(base, r.id)
    naviguer(`/recette/${copie.id}`)
    afficher('Copie créée.')
  }

  const sansGroupe = r.ingredients.filter((i) => !i.groupeId || !r.groupes.some((g) => g.id === i.groupeId))
  const groupes = [
    ...(sansGroupe.length ? [{ id: '', nom: '', ingredients: sansGroupe }] : []),
    ...r.groupes.map((g) => ({ ...g, ingredients: r.ingredients.filter((i) => i.groupeId === g.id) })),
  ].filter((g) => g.ingredients.length)

  const temps = [
    { Icone: Clock, libelle: 'Préparation', valeur: r.tempsPreparation },
    { Icone: Flame, libelle: 'Cuisson', valeur: r.tempsCuisson },
    { Icone: Hourglass, libelle: 'Repos', valeur: r.tempsRepos },
  ].filter((t) => t.valeur)

  const action = 'flex size-11 items-center justify-center rounded-full border border-bord bg-surface transition hover:border-primaire active:scale-95'

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Mes recettes
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const est = await basculerFavori(base, r.id)
              afficher(est ? 'Ajoutée aux favoris' : 'Retirée des favoris')
            }}
            aria-pressed={r.favori}
            aria-label={r.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={action}
          >
            <motion.span key={String(r.favori)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
              <Heart className={`size-5 ${r.favori ? 'fill-primaire text-primaire' : 'text-texte-doux'}`} />
            </motion.span>
          </button>
          <button onClick={() => setHistoriqueOuvert(true)} aria-label="Historique des versions" title="Historique des versions" className={action}>
            <RotateCcw className="size-5 text-texte-doux" />
          </button>
          <button onClick={dupliquer} aria-label="Dupliquer la recette" className={action}>
            <Copy className="size-5 text-texte-doux" />
          </button>
          <button onClick={() => setConfirmerSuppression(true)} aria-label="Mettre la recette à la corbeille" className={action}>
            <Trash className="size-5 text-texte-doux" />
          </button>
          <Link href={`/recette/${r.id}/modifier`} className="inline-flex h-11 items-center gap-2 rounded-full bg-primaire px-5 font-medium text-sur-primaire transition hover:opacity-90">
            <Pencil className="size-4" aria-hidden="true" /> Modifier
          </Link>
        </div>
      </div>

      {/* En-tête */}
      <header className="overflow-hidden rounded-3xl border border-bord bg-surface shadow-sm">
        <VisuelRecette url={photo} categorie={r.categorie} taille="grande" className={`w-full ${photo ? 'aspect-[16/9] max-h-[420px]' : 'h-40'}`} />
        <div className="p-5 sm:p-7">
          <p className="text-sm font-semibold tracking-widest text-sauge uppercase">{LIBELLES_CATEGORIES[r.categorie]}</p>
          <h1 className="mt-1 font-serif text-4xl leading-tight font-semibold sm:text-5xl">{r.titre}</h1>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-texte-doux">
            {temps.map(({ Icone, libelle, valeur }) => (
              <div key={libelle} className="flex items-center gap-1.5">
                <Icone className="size-4" aria-hidden="true" />
                <dt>{libelle}</dt>
                <dd className="font-semibold text-texte">{formaterDuree(valeur!)}</dd>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <ChefHat className="size-4" aria-hidden="true" />
              <dt className="sr-only">Difficulté</dt>
              <dd className="font-semibold text-texte">{LIBELLES_DIFFICULTES[r.difficulte]}</dd>
            </div>
            {(r.reference.personnes || r.reference.contenant) && (
              <div className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                <dt className="sr-only">Prévue pour</dt>
                <dd className="font-semibold text-texte">
                  {[r.reference.personnes && `${r.reference.personnes} personnes`, r.reference.contenant && decrireContenant(r.reference.contenant)]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
          {r.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
              {r.tags.map((t) => (
                <li key={t} className="rounded-full bg-sauge-fond px-3 py-1 text-sm font-medium text-sauge">
                  #{t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
        <div className="space-y-6 lg:sticky lg:top-24">
          {cible && (
            <div ref={refPanneau} className="scroll-mt-24">
              <PanneauRecalcul reference={r.reference} cible={cible} ratio={ratio} onCible={setCible} />
            </div>
          )}
          {alertes.map((a) => (
            <p key={a} role="status" className="rounded-2xl border border-dore bg-dore-fond px-4 py-3">
              {a}
            </p>
          ))}

          {r.ingredients.length > 0 && (
            <section aria-labelledby="titre-ingredients" className="rounded-3xl border border-bord bg-surface p-5 sm:p-6">
              <h2 id="titre-ingredients" className="font-serif text-2xl font-semibold">
                Ingrédients
              </h2>
              {groupes.map((g) => (
                <div key={g.id} className="mt-4">
                  {g.nom && <h3 className="mb-1 font-semibold text-primaire">{g.nom}</h3>}
                  <ul className="divide-y divide-bord">
                    {g.ingredients.map((i) => (
                      <LigneIngredient
                        key={i.id}
                        i={i}
                        ratio={k}
                        coche={coches.has(i.id)}
                        onCocher={() =>
                          setCoches((c) => {
                            const n = new Set(c)
                            if (n.has(i.id)) n.delete(i.id)
                            else n.add(i.id)
                            return n
                          })
                        }
                        onSurvol={setSurvole}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="mt-6 space-y-6 lg:mt-0">
          {r.etapes.length > 0 && (
            <section aria-labelledby="titre-etapes" className="rounded-3xl border border-bord bg-surface p-5 sm:p-6">
              <h2 id="titre-etapes" className="font-serif text-2xl font-semibold">
                Préparation
              </h2>
              <ol className="mt-4 space-y-5">
                {r.etapes.map((e, n) => (
                  <li key={e.id} className="flex gap-4">
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primaire font-serif font-semibold text-sur-primaire">
                      {n + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <span className="sr-only">Étape {n + 1} : </span>
                      <TexteRiche doc={e.contenu} ratio={k} ingredients={r.ingredients} surbrillance={survole} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {r.notes && (
            <section aria-labelledby="titre-notes" className="rounded-3xl border border-dore bg-dore-fond p-5 sm:p-6">
              <h2 id="titre-notes" className="font-serif text-2xl font-semibold">
                Notes et conseils
              </h2>
              <p className="mt-2 leading-relaxed whitespace-pre-line">{r.notes}</p>
            </section>
          )}
        </div>
      </div>

      <AnimatePresence>
        {cible && !panneauVisible && (
          <BandeauRecalcul
            reference={r.reference}
            cible={cible}
            ratio={ratio}
            onCible={setCible}
            onModifier={() => refPanneau.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        )}
      </AnimatePresence>

      <Historique recette={r} ouvert={historiqueOuvert} onFermer={() => setHistoriqueOuvert(false)} />

      <Confirmation
        ouvert={confirmerSuppression}
        titre="Mettre à la corbeille ?"
        message={`« ${r.titre} » restera récupérable pendant 30 jours dans la corbeille (Réglages).`}
        confirmer="Mettre à la corbeille"
        dangereux
        onConfirmer={supprimer}
        onAnnuler={() => setConfirmerSuppression(false)}
      />
    </article>
  )
}

function LigneIngredient({
  i,
  ratio,
  coche,
  onCocher,
  onSurvol,
}: {
  i: Ingredient
  ratio: number
  coche: boolean
  onCocher: () => void
  onSurvol: (id: string | null) => void
}) {
  const q = recalculerQuantite(quantiteDeIngredient(i), ratio)
  const details = [q.equivalent, q.note].filter(Boolean)
  return (
    <li onMouseEnter={() => onSurvol(i.id)} onMouseLeave={() => onSurvol(null)}>
      <label className="flex cursor-pointer items-baseline gap-3 py-2.5" onFocus={() => onSurvol(i.id)} onBlur={() => onSurvol(null)}>
        <input type="checkbox" checked={coche} onChange={onCocher} className="relative top-0.5 size-5 shrink-0 accent-[var(--sauge)]" />
        <span className={`flex flex-1 flex-wrap items-baseline gap-x-2 transition ${coche ? 'text-texte-doux line-through opacity-60' : ''}`}>
          <Quantite q={q} />
          <span>
            {i.unite === 'piece' && q.nombrePieces !== undefined ? accorderNom(i.nom, q.nombrePieces) : i.nom}
            {i.precision && <span className="text-texte-doux">, {i.precision}</span>}
          </span>
          {details.length > 0 && <span className="text-sm text-texte-doux italic">({details.join(' · ')})</span>}
        </span>
      </label>
    </li>
  )
}
