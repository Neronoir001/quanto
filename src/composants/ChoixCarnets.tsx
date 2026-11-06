import { Check, Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { Recette } from '../domaine/modele'
import { base } from '../donnees/base'
import { basculerCarnet, creerCollection, useCollections } from '../donnees/collections'

/** Fenêtre « Ranger dans les carnets » : cocher les carnets de la recette, ou en créer un. */
export default function ChoixCarnets({ recette, ouvert, onFermer }: { recette: Recette; ouvert: boolean; onFermer: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const carnets = useCollections()
  const idNom = useId()
  const [nom, setNom] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  const basculer = (id: string) => void basculerCarnet(base, recette.id, id, !recette.collections.includes(id))

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onFermer()
      }}
      aria-labelledby="titre-carnets"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border border-bord bg-surface p-0 text-texte shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-bord px-6 py-4">
        <h2 id="titre-carnets" className="font-serif text-2xl font-semibold">
          Ranger dans…
        </h2>
        <button onClick={onFermer} aria-label="Fermer" className="rounded-full p-2 text-texte-doux hover:bg-fond hover:text-texte">
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-4 px-6 py-4">
        {carnets?.length === 0 && <p className="text-texte-doux">Aucun carnet pour l'instant : créez le premier ci-dessous.</p>}
        <ul className="space-y-1">
          {carnets?.map((c) => {
            const coche = recette.collections.includes(c.id)
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-fond">
                  <input type="checkbox" checked={coche} onChange={() => basculer(c.id)} className="size-5 accent-[var(--primaire)]" />
                  <span className="size-3 rounded-full" style={{ background: c.couleur }} aria-hidden="true" />
                  <span className="flex-1 font-medium">{c.nom}</span>
                  {coche && <Check className="size-4 text-sauge" aria-hidden="true" />}
                </label>
              </li>
            )
          })}
        </ul>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!nom.trim()) return
            const saisi = nom
            setNom('')
            const c = await creerCollection(base, saisi)
            await basculerCarnet(base, recette.id, c.id, true)
          }}
          className="flex gap-2"
        >
          <label htmlFor={idNom} className="sr-only">
            Nouveau carnet
          </label>
          <input
            id={idNom}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={40}
            placeholder="Nouveau carnet…"
            className="min-w-0 flex-1 rounded-full border border-bord bg-fond px-4 py-2"
          />
          <button type="submit" disabled={!nom.trim()} aria-label="Créer le carnet" className="rounded-full bg-primaire p-2.5 text-sur-primaire disabled:opacity-50">
            <Plus className="size-5" />
          </button>
        </form>
      </div>
    </dialog>
  )
}
