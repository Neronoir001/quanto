import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState } from 'react'
import { lireAppareil, renommerAppareil } from '../donnees/appareil'
import { base } from '../donnees/base'
import { useMessage } from './Messages'

/** Nom de cet appareil, affiché lors des synchronisations. */
export default function NomAppareil() {
  const id = useId()
  const appareil = useLiveQuery(() => lireAppareil(base), [])
  const afficher = useMessage()
  const [saisie, setSaisie] = useState<string | null>(null)
  if (!appareil) return null
  const valeur = saisie ?? appareil.nom
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await renommerAppareil(base, valeur)
        setSaisie(null)
        afficher('Nom de l’appareil enregistré.')
      }}
    >
      <label htmlFor={id} className="mb-1.5 block font-medium">
        Nom de cet appareil
      </label>
      <p className="mb-2 text-sm text-texte-doux">Il apparaîtra lors des synchronisations (« iPhone », « Tablette cuisine »…).</p>
      <div className="flex gap-2">
        <input id={id} value={valeur} maxLength={30} onChange={(e) => setSaisie(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-bord bg-fond px-3 py-2.5" />
        {saisie !== null && saisie !== appareil.nom && (
          <button type="submit" className="rounded-full bg-primaire px-5 font-medium text-sur-primaire">
            Enregistrer
          </button>
        )}
      </div>
    </form>
  )
}
