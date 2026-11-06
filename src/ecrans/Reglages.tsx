import { Calculator, ChevronRight, Sparkles, Trash, Wifi } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'wouter'
import { useMessage } from '../composants/Messages'
import NomAppareil from '../composants/NomAppareil'
import VerificationsAppareil from '../composants/VerificationsAppareil'
import { base } from '../donnees/base'
import { ajouterExemples } from '../donnees/exemples'
import { useCorbeille, useRecettes } from '../donnees/hooks'
import { CLE_FREQUENCE, FREQUENCE_PAR_DEFAUT, FREQUENCES } from '../donnees/sauvegarde'
import { useLiveQuery } from 'dexie-react-hooks'
import { VERSION } from '../version'

export default function Reglages() {
  const recettes = useRecettes()
  const corbeille = useCorbeille()
  const afficher = useMessage()
  const [exemplesEnCours, setExemplesEnCours] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-4xl font-semibold">Réglages</h1>

      <Bloc titre="Cet appareil">
        <NomAppareil />
      </Bloc>

      <Bloc titre="Mes données">
        <ul className="divide-y divide-bord">
          <Lien href="/synchro" Icone={Wifi} detail="Wi-Fi ou fichier">
            Synchroniser et sauvegarder
          </Lien>
          <Lien href="/corbeille" Icone={Trash} detail={corbeille?.length ? `${corbeille.length} recette${corbeille.length > 1 ? 's' : ''}` : 'Vide'}>
            Corbeille
          </Lien>
          <li>
            <button
              disabled={exemplesEnCours}
              onClick={async () => {
                setExemplesEnCours(true)
                await ajouterExemples(base)
                setExemplesEnCours(false)
                afficher('3 recettes d’exemple ajoutées.')
              }}
              className="flex w-full items-center gap-3 py-3.5 text-left disabled:opacity-50"
            >
              <Sparkles className="size-5 text-primaire" aria-hidden="true" />
              <span className="flex-1 font-medium">Ajouter des recettes d'exemple</span>
            </button>
          </li>
        </ul>
        <RappelReglage />
        <p className="mt-2 text-sm text-texte-doux">
          {recettes?.length ?? 0} recette{(recettes?.length ?? 0) > 1 ? 's' : ''} enregistrée{(recettes?.length ?? 0) > 1 ? 's' : ''}{' '}
          uniquement sur cet appareil.
        </p>
      </Bloc>

      <Bloc titre="Vérifications">
        <VerificationsAppareil />
      </Bloc>

      <Bloc titre="Outils">
        <ul className="divide-y divide-bord">
          <Lien href="/calculateur" Icone={Calculator} detail="Phase 1">
            Démonstration du calculateur
          </Lien>
        </ul>
      </Bloc>

      <p className="text-center text-sm text-texte-doux">Quanto · version {VERSION}</p>
    </div>
  )
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-3 font-serif text-2xl font-semibold">{titre}</h2>
      {children}
    </section>
  )
}

function Lien({ href, Icone, detail, children }: { href: string; Icone: typeof Trash; detail?: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3.5">
        <Icone className="size-5 text-primaire" aria-hidden="true" />
        <span className="flex-1 font-medium">{children}</span>
        {detail && <span className="text-sm text-texte-doux">{detail}</span>}
        <ChevronRight className="size-5 text-texte-doux" aria-hidden="true" />
      </Link>
    </li>
  )
}

function RappelReglage() {
  const frequence = useLiveQuery(async () => ((await base.reglages.get(CLE_FREQUENCE))?.valeur as number | undefined) ?? FREQUENCE_PAR_DEFAUT, [])
  if (frequence === undefined) return null
  return (
    <label className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-bord pt-3">
      <span className="font-medium">Me rappeler de sauvegarder</span>
      <select
        value={frequence}
        onChange={(e) => void base.reglages.put({ cle: CLE_FREQUENCE, valeur: Number(e.target.value) })}
        className="rounded-full border border-bord bg-fond px-3 py-1.5"
      >
        {FREQUENCES.map((f) => (
          <option key={f.jours} value={f.jours}>
            {f.libelle}
          </option>
        ))}
      </select>
    </label>
  )
}
