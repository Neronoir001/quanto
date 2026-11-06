import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Recette } from '../domaine/modele'
import { useNomsAppareils } from '../donnees/appareils'
import { base } from '../donnees/base'
import { DUREE_CONSERVATION_MS, historique, restaurerVersion } from '../donnees/recettes'
import { useMessage } from './Messages'

const date = (t: number) => new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Anciennes versions d'une recette (30 jours), restaurables en un toucher. */
export default function Historique({ recette, ouvert, onFermer }: { recette: Recette; ouvert: boolean; onFermer: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const versions = useLiveQuery(() => (ouvert ? historique(base, recette.id) : []), [ouvert, recette.id, recette.modifieLe])
  const noms = useNomsAppareils()
  const afficher = useMessage()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onFermer()
      }}
      aria-labelledby="titre-historique"
      className="m-auto max-h-[85dvh] w-[min(34rem,calc(100vw-2rem))] rounded-3xl border border-bord bg-surface p-0 text-texte shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-bord bg-surface px-6 py-4">
        <h2 id="titre-historique" className="font-serif text-2xl font-semibold">
          Historique
        </h2>
        <button onClick={onFermer} aria-label="Fermer l'historique" className="rounded-full p-2 text-texte-doux hover:bg-fond hover:text-texte">
          <X className="size-5" />
        </button>
      </div>
      <div className="px-6 py-4">
        <p className="text-sm text-texte-doux">
          Les versions précédentes sont gardées {Math.round(DUREE_CONSERVATION_MS / 86_400_000)} jours. Restaurer une version ne perd rien : la
          version actuelle rejoint l'historique.
        </p>
        <p className="mt-3 rounded-2xl bg-dore-fond px-4 py-3 text-sm">
          <strong>Version actuelle</strong> — {date(recette.modifieLe)}
          {noms[recette.modifiePar] && <> · {noms[recette.modifiePar]}</>}
        </p>
        {versions && versions.length === 0 && <p className="py-8 text-center text-texte-doux">Aucune version précédente.</p>}
        <ul className="mt-2 divide-y divide-bord">
          {versions?.map((v) => (
            <li key={v.num} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.contenu.titre}</p>
                <p className="text-sm text-texte-doux">
                  {date(v.contenu.modifieLe)}
                  {noms[v.contenu.modifiePar] && <> · {noms[v.contenu.modifiePar]}</>} · {v.contenu.ingredients.length} ingrédient
                  {v.contenu.ingredients.length > 1 ? 's' : ''}, {v.contenu.etapes.length} étape{v.contenu.etapes.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={async () => {
                  await restaurerVersion(base, v.num!)
                  afficher(`Version du ${date(v.contenu.modifieLe)} restaurée.`)
                  onFermer()
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primaire px-3 py-1.5 text-sm font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire"
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Restaurer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  )
}
