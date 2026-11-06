import { useLiveQuery } from 'dexie-react-hooks'
import { HardDriveDownload, X } from 'lucide-react'
import { Link } from 'wouter'
import type { Recette } from '../domaine/modele'
import { base } from '../donnees/base'
import { CLE_FREQUENCE, CLE_REPORT, FREQUENCE_PAR_DEFAUT } from '../donnees/sauvegarde'
import { dateDerniereSauvegarde } from '../sync/fichier'

const JOUR = 86_400_000

/** Rappel discret quand aucune sauvegarde complète n'a été faite depuis longtemps. */
export default function RappelSauvegarde({ recettes }: { recettes: Recette[] }) {
  const infos = useLiveQuery(async () => {
    const frequence = ((await base.reglages.get(CLE_FREQUENCE))?.valeur as number | undefined) ?? FREQUENCE_PAR_DEFAUT
    const reporte = ((await base.reglages.get(CLE_REPORT))?.valeur as number | undefined) ?? 0
    return { frequence, reporte, derniere: await dateDerniereSauvegarde(base), maintenant: Date.now() }
  }, [])

  if (!infos || infos.frequence === 0 || recettes.length === 0) return null
  const { maintenant } = infos
  // Jamais sauvegardé : on compte à partir de la première recette, pour ne pas importuner dès le premier jour.
  const reference = infos.derniere ?? Math.min(...recettes.map((r) => r.creeLe))
  if (maintenant - reference < infos.frequence * JOUR || maintenant < infos.reporte) return null

  const jours = Math.floor((maintenant - reference) / JOUR)
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-dore bg-dore-fond px-4 py-3">
      <HardDriveDownload className="size-5 shrink-0 text-primaire" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {infos.derniere ? `Dernière sauvegarde il y a ${jours} jours.` : "Vous n'avez encore jamais sauvegardé votre carnet."} Pensez à
        enregistrer une copie complète.
      </p>
      <Link href="/synchro" className="rounded-full bg-primaire px-4 py-1.5 font-medium text-sur-primaire">
        Sauvegarder
      </Link>
      <button
        onClick={() => void base.reglages.put({ cle: CLE_REPORT, valeur: maintenant + 7 * JOUR })}
        aria-label="Me le rappeler dans une semaine"
        title="Me le rappeler dans une semaine"
        className="rounded-full p-1.5 text-texte-doux hover:bg-surface hover:text-texte"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
