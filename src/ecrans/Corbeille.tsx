import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Link } from 'wouter'
import { VisuelRecette } from '../composants/Categorie'
import { useMessage } from '../composants/Messages'
import type { Recette } from '../domaine/modele'
import { base } from '../donnees/base'
import { useCorbeille } from '../donnees/hooks'
import { usePhoto } from '../donnees/photos'
import { DUREE_CONSERVATION_MS, restaurerRecette } from '../donnees/recettes'

const JOUR = 24 * 60 * 60 * 1000

export default function Corbeille() {
  const recettes = useCorbeille()
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/reglages" className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Réglages
        </Link>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Corbeille</h1>
        <p className="mt-2 text-texte-doux">Les recettes supprimées restent ici 30 jours, puis sont effacées définitivement.</p>
      </div>
      {recettes === undefined ? null : recettes.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-bord py-16 text-center text-texte-doux">La corbeille est vide.</p>
      ) : (
        <ul className="space-y-2.5">
          {recettes.map((r) => (
            <Ligne key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Ligne({ r }: { r: Recette }) {
  const photo = usePhoto(r.photoId)
  const afficher = useMessage()
  const restants = Math.max(0, Math.ceil((r.supprimeLe! + DUREE_CONSERVATION_MS - Date.now()) / JOUR))
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-bord bg-surface p-2.5 pr-3">
      <VisuelRecette url={photo} categorie={r.categorie} taille="petite" className="size-14 shrink-0 rounded-xl opacity-70" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg font-semibold">{r.titre}</p>
        <p className="text-sm text-texte-doux">
          Effacée dans {restants} jour{restants > 1 ? 's' : ''}
        </p>
      </div>
      <button
        onClick={async () => {
          await restaurerRecette(base, r.id)
          afficher(`« ${r.titre} » est de retour dans vos recettes.`)
        }}
        className="inline-flex items-center gap-2 rounded-full border border-primaire px-4 py-2 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire"
      >
        <RotateCcw className="size-4" aria-hidden="true" /> Restaurer
      </button>
    </li>
  )
}
