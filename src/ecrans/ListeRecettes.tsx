import { Heart, Import, LayoutGrid, Library, List, Plus, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useMemo, useState } from 'react'
import { Link } from 'wouter'
import { CarteRecette, LigneRecette } from '../composants/CarteRecette'
import { APPARENCE } from '../composants/Categorie'
import { useMessage } from '../composants/Messages'
import Puce from '../composants/Puce'
import RappelSauvegarde from '../composants/RappelSauvegarde'
import {
  CATEGORIES,
  DIFFICULTES,
  LIBELLES_CATEGORIES,
  LIBELLES_DIFFICULTES,
  type Recette,
} from '../domaine/modele'
import { construireIndex, type Criteres, CRITERES_VIDES, filtrerRecettes, tousLesTags } from '../domaine/recherche'
import { base } from '../donnees/base'
import { ajouterExemples } from '../donnees/exemples'
import { useConsultations, useRecettes } from '../donnees/hooks'
import { useCollections } from '../donnees/collections'
import { basculerFavori } from '../donnees/recettes'
import { useMemorise } from '../lib/stockage'

const TEMPS = [15, 30, 45, 60, 120]
const TRIS: { valeur: Criteres['tri']; libelle: string }[] = [
  { valeur: 'recentes', libelle: 'Récemment modifiées' },
  { valeur: 'consultees', libelle: 'Récemment consultées' },
  { valeur: 'alphabetique', libelle: 'De A à Z' },
  { valeur: 'temps', libelle: 'Les plus rapides' },
]

const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v])

export default function ListeRecettes() {
  const recettes = useRecettes()
  const consultations = useConsultations()
  const afficher = useMessage()
  const [criteres, setCriteres] = useMemorise<Criteres>('quanto.criteres', CRITERES_VIDES, 'session')
  const [affichage, setAffichage] = useMemorise('quanto.affichage', { mode: 'grille' as 'grille' | 'liste' })
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const carnets = useCollections()
  const carnetActif = carnets?.find((c) => c.id === criteres.carnet)

  const index = useMemo(() => construireIndex(recettes ?? []), [recettes])
  const tags = useMemo(() => tousLesTags(recettes ?? []), [recettes])
  const resultats = useMemo(
    () => filtrerRecettes(recettes ?? [], index, criteres, consultations),
    [recettes, index, criteres, consultations],
  )

  const nbFiltres =
    criteres.categories.length +
    criteres.difficultes.length +
    criteres.tags.length +
    (criteres.tempsMax ? 1 : 0) +
    (criteres.favorisSeulement ? 1 : 0)
  const maj = (c: Partial<Criteres>) => setCriteres((avant) => ({ ...avant, ...c }))

  const favori = async (r: Recette) => {
    const est = await basculerFavori(base, r.id)
    afficher(est ? `« ${r.titre} » ajoutée aux favoris` : `« ${r.titre} » retirée des favoris`)
  }

  if (recettes === undefined) return <p className="py-20 text-center text-texte-doux">Chargement…</p>
  if (recettes.length === 0) return <Bienvenue />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold">
            {carnetActif && <span className="size-4 rounded-full" style={{ background: carnetActif.couleur }} aria-hidden="true" />}
            {carnetActif?.nom ?? 'Mes recettes'}
          </h1>
          <p className="mt-1 text-texte-doux">
            {carnetActif ? `${resultats.length} recette${resultats.length > 1 ? 's' : ''} dans ce carnet` : `${recettes.length} recette${recettes.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Link href="/importer" className="inline-flex items-center gap-2 rounded-full border border-bord bg-surface px-4 py-2 font-medium transition hover:border-primaire">
          <Import className="size-4 text-primaire" aria-hidden="true" /> Importer
        </Link>
        <div className="flex items-center gap-1 rounded-full border border-bord bg-surface p-1" role="radiogroup" aria-label="Affichage">
          {(['grille', 'liste'] as const).map((mode) => {
            const Icone = mode === 'grille' ? LayoutGrid : List
            return (
              <button type="button"
                key={mode}
                role="radio"
                aria-checked={affichage.mode === mode}
                aria-label={mode === 'grille' ? 'Affichage en grille' : 'Affichage en liste'}
                onClick={() => setAffichage({ mode })}
                className={`rounded-full p-2 transition ${affichage.mode === mode ? 'bg-primaire text-sur-primaire' : 'text-texte-doux hover:text-texte'}`}
              >
                <Icone className="size-5" />
              </button>
            )
          })}
        </div>
        </div>
      </div>

      <RappelSauvegarde recettes={recettes} />

      {/* Recherche */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texte-doux" aria-hidden="true" />
          <input
            type="search"
            value={criteres.texte}
            onChange={(e) => maj({ texte: e.target.value })}
            placeholder="Rechercher une recette, un ingrédient…"
            aria-label="Rechercher une recette, un ingrédient, un tag"
            className="w-full rounded-full border border-bord bg-surface py-3 pr-11 pl-12 text-base shadow-sm placeholder:text-texte-doux/80 focus:border-primaire focus:outline-none"
          />
          {criteres.texte && (
            <button type="button"
              onClick={() => maj({ texte: '' })}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-texte-doux hover:text-texte"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button type="button"
          onClick={() => setFiltresOuverts((o) => !o)}
          aria-expanded={filtresOuverts}
          aria-controls="panneau-filtres"
          className={`relative flex items-center gap-2 rounded-full border px-4 font-medium transition ${
            filtresOuverts || nbFiltres ? 'border-primaire text-primaire' : 'border-bord bg-surface text-texte'
          }`}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Filtres</span>
          {nbFiltres > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primaire text-xs text-sur-primaire">
              {nbFiltres}
              <span className="sr-only"> actifs</span>
            </span>
          )}
        </button>
      </div>

      {/* Carnets */}
      {!!carnets?.length && (
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Carnets">
          <Library className="size-5 shrink-0 text-texte-doux" aria-hidden="true" />
          {carnets.map((c) => (
            <Puce key={c.id} actif={criteres.carnet === c.id} onClick={() => maj({ carnet: criteres.carnet === c.id ? undefined : c.id })} taille="petite">
              <span className="size-2.5 rounded-full" style={{ background: c.couleur }} aria-hidden="true" /> {c.nom}
            </Puce>
          ))}
          <Link href="/carnets" className="shrink-0 px-2 text-sm font-medium text-primaire underline-offset-4 hover:underline">
            Gérer
          </Link>
        </div>
      )}

      {/* Catégories, toujours visibles */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Catégories">
        <Puce actif={criteres.favorisSeulement} onClick={() => maj({ favorisSeulement: !criteres.favorisSeulement })} taille="petite">
          <Heart className={`size-4 ${criteres.favorisSeulement ? 'fill-current' : ''}`} aria-hidden="true" /> Favoris
        </Puce>
        {CATEGORIES.map((c) => {
          const { Icone } = APPARENCE[c]
          return (
            <Puce key={c} actif={criteres.categories.includes(c)} onClick={() => maj({ categories: basculer(criteres.categories, c) })} taille="petite">
              <Icone className="size-4" aria-hidden="true" /> {LIBELLES_CATEGORIES[c]}
            </Puce>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {filtresOuverts && (
          <motion.section
            id="panneau-filtres"
            aria-label="Filtres"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-3xl border border-bord bg-surface p-5">
              <Groupe titre="Difficulté">
                {DIFFICULTES.map((d) => (
                  <Puce key={d} actif={criteres.difficultes.includes(d)} onClick={() => maj({ difficultes: basculer(criteres.difficultes, d) })} taille="petite">
                    {LIBELLES_DIFFICULTES[d]}
                  </Puce>
                ))}
              </Groupe>
              <Groupe titre="Temps total">
                {TEMPS.map((t) => (
                  <Puce key={t} actif={criteres.tempsMax === t} onClick={() => maj({ tempsMax: criteres.tempsMax === t ? undefined : t })} taille="petite">
                    {t < 60 ? `≤ ${t} min` : `≤ ${t / 60} h`}
                  </Puce>
                ))}
              </Groupe>
              {tags.length > 0 && (
                <Groupe titre="Tags">
                  {tags.map((t) => (
                    <Puce key={t} actif={criteres.tags.includes(t)} onClick={() => maj({ tags: basculer(criteres.tags, t) })} taille="petite">
                      #{t}
                    </Puce>
                  ))}
                </Groupe>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bord pt-4">
                <label className="flex items-center gap-2">
                  <span className="text-sm font-medium">Trier</span>
                  <select
                    value={criteres.tri}
                    onChange={(e) => maj({ tri: e.target.value as Criteres['tri'] })}
                    className="rounded-full border border-bord bg-fond px-3 py-1.5"
                  >
                    {TRIS.map((t) => (
                      <option key={t.valeur} value={t.valeur}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                {nbFiltres > 0 && (
                  <button type="button" onClick={() => maj({ ...CRITERES_VIDES, texte: criteres.texte, tri: criteres.tri })} className="text-primaire underline underline-offset-4">
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Résultats */}
      <p className="sr-only" aria-live="polite">
        {resultats.length} recette{resultats.length > 1 ? 's' : ''} trouvée{resultats.length > 1 ? 's' : ''}
      </p>
      {resultats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-bord py-16 text-center">
          <p className="font-serif text-2xl">Aucune recette trouvée</p>
          <p className="mt-2 text-texte-doux">Essayez un autre mot ou retirez des filtres.</p>
          <button type="button" onClick={() => setCriteres({ ...CRITERES_VIDES, tri: criteres.tri })} className="mt-4 text-primaire underline underline-offset-4">
            Tout afficher
          </button>
        </div>
      ) : affichage.mode === 'grille' ? (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {resultats.map((r) => (
              <CarteRecette key={r.id} r={r} onFavori={favori} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {resultats.map((r) => (
              <LigneRecette key={r.id} r={r} onFavori={favori} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{titre}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Bienvenue() {
  const afficher = useMessage()
  const [enCours, setEnCours] = useState(false)
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <motion.img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt=""
        className="mx-auto size-20 rounded-3xl shadow-md"
        initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      />
      <h1 className="mt-6 font-serif text-4xl leading-tight font-semibold">
        Bienvenue dans <span className="text-primaire italic">Quanto</span>
      </h1>
      <p className="mt-3 text-lg text-texte-doux">
        Votre carnet de recettes, toujours à la bonne mesure. Commencez par créer une recette, ou découvrez l'application avec quelques exemples.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/nouvelle" className="inline-flex items-center gap-2 rounded-full bg-primaire px-6 py-3 font-medium text-sur-primaire shadow-sm transition hover:opacity-90">
          <Plus className="size-5" aria-hidden="true" /> Créer ma première recette
        </Link>
        <button type="button"
          disabled={enCours}
          onClick={async () => {
            setEnCours(true)
            await ajouterExemples(base)
            afficher('3 recettes d’exemple ajoutées. Vous pourrez les supprimer quand vous voudrez.')
          }}
          className="inline-flex items-center gap-2 rounded-full border border-primaire px-6 py-3 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire disabled:opacity-50"
        >
          <Sparkles className="size-5" aria-hidden="true" /> Ajouter des exemples
        </button>
        <Link href="/importer" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-primaire underline-offset-4 hover:underline">
          <Import className="size-5" aria-hidden="true" /> Importer une recette
        </Link>
      </div>
      <p className="mt-6 text-texte-doux">
        Première fois ?{' '}
        <Link href="/aide" className="font-medium text-primaire underline underline-offset-4">
          Découvrez le guide d'utilisation
        </Link>
        .
      </p>
    </div>
  )
}
