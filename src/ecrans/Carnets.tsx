import { ArrowLeft, Check, Library, Pencil, Plus, Share2, Trash } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'wouter'
import Confirmation from '../composants/Confirmation'
import { useMessage } from '../composants/Messages'
import type { Collection } from '../domaine/modele'
import { base } from '../donnees/base'
import { COULEURS_CARNETS, creerCollection, modifierCollection, supprimerCollection, useCollections } from '../donnees/collections'
import { useRecettes } from '../donnees/hooks'
import { partagerRecettes } from '../import/partage'
import { CRITERES_VIDES } from '../domaine/recherche'

export default function Carnets() {
  const carnets = useCollections()
  const recettes = useRecettes()
  const afficher = useMessage()
  const idNom = useId()
  const [nom, setNom] = useState('')
  const [aSupprimer, setASupprimer] = useState<Collection | null>(null)

  const compte = (id: string) => (recettes ?? []).filter((r) => r.collections.includes(id)).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-primaire underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Mes recettes
        </Link>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Mes carnets</h1>
        <p className="mt-2 text-texte-doux">Rangez vos recettes par thème. Une recette peut être dans plusieurs carnets.</p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!nom.trim()) return
          await creerCollection(base, nom)
          afficher(`Carnet « ${nom.trim()} » créé.`)
          setNom('')
        }}
        className="flex gap-2 rounded-3xl border border-bord bg-surface p-3 shadow-sm"
      >
        <label htmlFor={idNom} className="sr-only">
          Nom du nouveau carnet
        </label>
        <input
          id={idNom}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          maxLength={40}
          placeholder="Nouveau carnet : Noël, Apéritifs, Recettes de mamie…"
          className="min-w-0 flex-1 rounded-full bg-fond px-4 py-2.5 focus:outline-none"
        />
        <button type="submit" disabled={!nom.trim()} className="inline-flex items-center gap-2 rounded-full bg-primaire px-5 font-medium text-sur-primaire disabled:opacity-50">
          <Plus className="size-4" aria-hidden="true" /> Créer
        </button>
      </form>

      {carnets?.length === 0 && (
        <div className="rounded-3xl border border-dashed border-bord py-14 text-center text-texte-doux">
          <Library className="mx-auto size-10 opacity-50" aria-hidden="true" />
          <p className="mt-3">Aucun carnet pour l'instant.</p>
        </div>
      )}

      <ul className="space-y-3">
        {carnets?.map((c) => (
          <Ligne
            key={c.id}
            c={c}
            nombre={compte(c.id)}
            onSupprimer={() => setASupprimer(c)}
            onPartager={async () => {
              const ids = (recettes ?? []).filter((r) => r.collections.includes(c.id)).map((r) => r.id)
              if (!ids.length) return afficher('Ce carnet est vide.')
              afficher((await partagerRecettes(ids, c.nom)) ? 'Carnet partagé.' : 'Partage annulé.')
            }}
          />
        ))}
      </ul>

      <Confirmation
        ouvert={!!aSupprimer}
        titre="Supprimer ce carnet ?"
        message={`Le carnet « ${aSupprimer?.nom} » sera supprimé. Les recettes qu'il contient restent dans vos recettes.`}
        confirmer="Supprimer le carnet"
        dangereux
        onAnnuler={() => setASupprimer(null)}
        onConfirmer={async () => {
          if (aSupprimer) await supprimerCollection(base, aSupprimer.id)
          setASupprimer(null)
        }}
      />
    </div>
  )
}

function Ligne({ c, nombre, onSupprimer, onPartager }: { c: Collection; nombre: number; onSupprimer: () => void; onPartager: () => void }) {
  const [edition, setEdition] = useState(false)
  const [nom, setNom] = useState(c.nom)
  const action = 'rounded-full p-2 text-texte-doux transition hover:bg-fond hover:text-texte'

  return (
    <li className="rounded-3xl border border-bord bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="size-4 shrink-0 rounded-full" style={{ background: c.couleur }} aria-hidden="true" />
        {edition ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (nom.trim()) await modifierCollection(base, c.id, { nom: nom.trim() })
              setEdition(false)
            }}
          >
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus aria-label="Nouveau nom du carnet" className="min-w-0 flex-1 rounded-xl border border-bord bg-fond px-3 py-1.5" />
            <button type="submit" aria-label="Enregistrer le nom" className={action}>
              <Check className="size-5" />
            </button>
          </form>
        ) : (
          <Link
            href="/"
            onClick={() => sessionStorage.setItem('quanto.criteres', JSON.stringify({ ...CRITERES_VIDES, carnet: c.id }))}
            className="min-w-0 flex-1"
          >
            <span className="block truncate font-serif text-xl font-semibold">{c.nom}</span>
            <span className="text-sm text-texte-doux">
              {nombre} recette{nombre > 1 ? 's' : ''}
            </span>
          </Link>
        )}
        {!edition && (
          <>
            <button onClick={() => setEdition(true)} aria-label={`Renommer ${c.nom}`} className={action}>
              <Pencil className="size-4" />
            </button>
            <button onClick={onPartager} aria-label={`Partager le carnet ${c.nom}`} className={action}>
              <Share2 className="size-4" />
            </button>
            <button onClick={onSupprimer} aria-label={`Supprimer le carnet ${c.nom}`} className={action}>
              <Trash className="size-4" />
            </button>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2 pl-7" role="radiogroup" aria-label={`Couleur du carnet ${c.nom}`}>
        {COULEURS_CARNETS.map((couleur) => (
          <button
            key={couleur}
            role="radio"
            aria-checked={c.couleur === couleur}
            aria-label={`Couleur ${couleur}`}
            onClick={() => void modifierCollection(base, c.id, { couleur })}
            className={`size-7 rounded-full transition ${c.couleur === couleur ? 'ring-2 ring-texte ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'}`}
            style={{ background: couleur }}
          />
        ))}
      </div>
    </li>
  )
}
