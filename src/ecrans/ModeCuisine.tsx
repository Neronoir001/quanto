import { ChevronLeft, ChevronRight, ListChecks, PartyPopper, Sun, Timer, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import Minuteurs, { type Minuteur } from '../composants/Minuteurs'
import TexteRiche, { Quantite } from '../composants/TexteRiche'
import { accorderNom } from '../domaine/accord'
import { formaterRatio } from '../domaine/format'
import { trouverDurees } from '../domaine/minuteurs'
import { type Ingredient, quantiteDeIngredient, type Recette } from '../domaine/modele'
import { calculerRatio, recalculerQuantite } from '../domaine/recalcul'
import { texteBrut } from '../domaine/texteRiche'
import { useRecette } from '../donnees/hooks'
import { useEcranAllume } from '../lib/ecranAllume'
import { lireCible } from '../lib/recalculMemorise'

export default function ModeCuisine() {
  const { id } = useParams<{ id: string }>()
  const recette = useRecette(id)
  if (recette === undefined) return null
  if (!recette || recette.supprimeLe) {
    return (
      <p className="py-20 text-center">
        Recette introuvable.{' '}
        <Link href="/" className="text-primaire underline">
          Retour
        </Link>
      </p>
    )
  }
  return <Cuisine r={recette} />
}

function Cuisine({ r }: { r: Recette }) {
  const [, naviguer] = useLocation()
  const ecran = useEcranAllume()
  const cible = useMemo(() => lireCible(r), [r])
  const ratio = (cible ? calculerRatio(r.reference, cible) : 1) ?? 1
  const total = r.etapes.length
  const [n, setN] = useState(0) // n === total : écran « Bon appétit »
  const [sens, setSens] = useState(1)
  const [ingredientsOuverts, setIngredientsOuverts] = useState(false)
  const [coches, setCoches] = useState<Set<string>>(new Set())
  const [minuteurs, setMinuteurs] = useState<Minuteur[]>([])
  const compteur = useRef(0)
  const depart = useRef<number | null>(null)

  const quitter = useCallback(() => naviguer(`/recette/${r.id}`), [naviguer, r.id])
  const aller = useCallback(
    (delta: number) => {
      setSens(delta)
      setN((x) => Math.min(total, Math.max(0, x + delta)))
    },
    [total],
  )

  // Clavier (ordinateur) : flèches, espace, Échap.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        aller(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        aller(-1)
      } else if (e.key === 'Escape') {
        if (ingredientsOuverts) setIngredientsOuverts(false)
        else quitter()
      } else if (e.key.toLowerCase() === 'i') setIngredientsOuverts((o) => !o)
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [aller, quitter, ingredientsOuverts])

  const etape = r.etapes[n]
  const durees = etape ? trouverDurees(texteBrut(etape.contenu)) : []
  const cocher = (id: string) =>
    setCoches((c) => {
      const s = new Set(c)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  const lancerMinuteur = (libelle: string, secondes: number) =>
    setMinuteurs((m) => [...m, { id: ++compteur.current, libelle: `Étape ${n + 1} · ${libelle}`, restant: secondes, fin: Date.now() + secondes * 1000 }])

  const listeIngredients = <ListeIngredients ingredients={r.ingredients} groupes={r.groupes} ratio={ratio} coches={coches} onCocher={cocher} />

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-fond text-texte" role="dialog" aria-modal="true" aria-label={`Mode cuisine : ${r.titre}`}>
      {/* En-tête */}
      <header className="flex items-center gap-3 border-b border-bord bg-surface px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <button onClick={quitter} aria-label="Quitter le mode cuisine" className="flex size-11 items-center justify-center rounded-full hover:bg-fond">
          <X className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg font-semibold">{r.titre}</p>
          <p className="flex items-center gap-2 text-xs text-texte-doux">
            {Math.abs(ratio - 1) > 1e-9 && <span className="rounded-full bg-dore-fond px-2 font-semibold text-texte">{formaterRatio(ratio)}</span>}
            {ecran === 'actif' && (
              <span className="inline-flex items-center gap-1">
                <Sun className="size-3.5" aria-hidden="true" /> Écran maintenu allumé
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIngredientsOuverts(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-bord bg-fond px-4 font-medium lg:hidden"
        >
          <ListChecks className="size-5 text-primaire" aria-hidden="true" /> Ingrédients
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Ingrédients toujours visibles sur grand écran (tablette à l'horizontale, ordinateur) */}
        <aside aria-label="Ingrédients" className="hidden w-[23rem] shrink-0 overflow-y-auto border-r border-bord bg-surface p-6 lg:block">
          <h2 className="mb-3 font-serif text-2xl font-semibold">Ingrédients</h2>
          {listeIngredients}
        </aside>

        {/* Étape en cours */}
        <main
          className="relative min-w-0 flex-1 overflow-y-auto"
          onPointerDown={(e) => {
            depart.current = e.clientX
          }}
          onPointerUp={(e) => {
            if (depart.current === null) return
            const dx = e.clientX - depart.current
            depart.current = null
            if (Math.abs(dx) > 70) aller(dx < 0 ? 1 : -1)
          }}
        >
          <AnimatePresence mode="wait" custom={sens} initial={false}>
            <motion.div
              key={n}
              custom={sens}
              initial={{ opacity: 0, x: sens * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: sens * -40 }}
              transition={{ duration: 0.22 }}
              className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-10 sm:px-10"
            >
              {etape ? (
                <>
                  <p className="text-sm font-semibold tracking-widest text-sauge uppercase" aria-live="polite">
                    Étape {n + 1} sur {total}
                  </p>
                  <div className="mt-4 font-serif text-2xl leading-relaxed sm:text-3xl lg:text-[2.1rem]">
                    <TexteRiche doc={etape.contenu} ratio={ratio} ingredients={r.ingredients} />
                  </div>
                  {durees.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-3">
                      {durees.map((d) => (
                        <button
                          key={d.secondes}
                          onClick={() => lancerMinuteur(d.libelle, d.secondes)}
                          className="inline-flex items-center gap-2 rounded-full border-2 border-primaire px-5 py-3 text-lg font-semibold text-primaire transition hover:bg-primaire hover:text-sur-primaire active:scale-95"
                        >
                          <Timer className="size-5" aria-hidden="true" /> Minuteur {d.libelle}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <PartyPopper className="mx-auto size-16 text-dore" aria-hidden="true" />
                  <p className="mt-4 font-serif text-4xl font-semibold">Bon appétit !</p>
                  <p className="mt-2 text-texte-doux">Toutes les étapes sont terminées.</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <button onClick={() => aller(-total)} className="rounded-full border border-primaire px-6 py-3 font-medium text-primaire">
                      Recommencer
                    </button>
                    <button onClick={quitter} className="rounded-full bg-primaire px-6 py-3 font-medium text-sur-primaire">
                      Revenir à la recette
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Navigation entre les étapes */}
      <footer className="border-t border-bord bg-surface px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-2 flex max-w-3xl gap-1" aria-hidden="true">
          {r.etapes.map((e, i) => (
            <span key={e.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= n ? 'bg-primaire' : 'bg-bord'}`} />
          ))}
        </div>
        <div className="mx-auto flex max-w-3xl gap-3">
          <button
            onClick={() => aller(-1)}
            disabled={n === 0}
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl border border-bord bg-fond text-lg font-semibold transition active:scale-[0.98] disabled:opacity-40"
          >
            <ChevronLeft className="size-6" aria-hidden="true" /> Précédente
          </button>
          <button
            onClick={() => aller(1)}
            disabled={n === total}
            className="flex h-16 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-primaire text-lg font-semibold text-sur-primaire transition active:scale-[0.98] disabled:opacity-40"
          >
            {n === total - 1 ? 'Terminer' : 'Suivante'} <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {/* Ingrédients sur téléphone : panneau qui glisse depuis le bas */}
      <AnimatePresence>
        {ingredientsOuverts && (
          <>
            <motion.div
              className="fixed inset-0 z-[61] bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIngredientsOuverts(false)}
            />
            <motion.section
              aria-label="Ingrédients"
              className="fixed inset-x-0 bottom-0 z-[62] max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-surface px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-bord" aria-hidden="true" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-semibold">Ingrédients</h2>
                <button onClick={() => setIngredientsOuverts(false)} aria-label="Fermer les ingrédients" className="rounded-full p-2 hover:bg-fond">
                  <X className="size-5" />
                </button>
              </div>
              {listeIngredients}
            </motion.section>
          </>
        )}
      </AnimatePresence>

      <Minuteurs minuteurs={minuteurs} onChange={setMinuteurs} />
    </div>
  )
}

function ListeIngredients({
  ingredients,
  groupes,
  ratio,
  coches,
  onCocher,
}: {
  ingredients: Ingredient[]
  groupes: Recette['groupes']
  ratio: number
  coches: Set<string>
  onCocher: (id: string) => void
}) {
  const sansGroupe = ingredients.filter((i) => !i.groupeId || !groupes.some((g) => g.id === i.groupeId))
  const blocs = [{ id: '', nom: '', liste: sansGroupe }, ...groupes.map((g) => ({ ...g, liste: ingredients.filter((i) => i.groupeId === g.id) }))].filter(
    (b) => b.liste.length,
  )
  return (
    <div className="space-y-4">
      {blocs.map((b) => (
        <div key={b.id}>
          {b.nom && <h3 className="mb-1 font-semibold text-primaire">{b.nom}</h3>}
          <ul className="divide-y divide-bord">
            {b.liste.map((i) => {
              const q = recalculerQuantite(quantiteDeIngredient(i), ratio)
              const coche = coches.has(i.id)
              return (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-baseline gap-3 py-3 text-lg">
                    <input type="checkbox" checked={coche} onChange={() => onCocher(i.id)} className="relative top-1 size-6 shrink-0 accent-[var(--sauge)]" />
                    <span className={`flex flex-wrap items-baseline gap-x-2 ${coche ? 'text-texte-doux line-through opacity-60' : ''}`}>
                      <Quantite q={q} />
                      <span>{i.unite === 'piece' && q.nombrePieces !== undefined ? accorderNom(i.nom, q.nombrePieces) : i.nom}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
