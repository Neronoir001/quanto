import { useLiveQuery } from 'dexie-react-hooks'
import { Calculator, ChevronRight, Sparkles, Trash, Wifi } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { Link } from 'wouter'
import { useMessage } from '../composants/Messages'
import VerificationsAppareil from '../composants/VerificationsAppareil'
import { base } from '../donnees/base'
import { obtenirAppareil, renommerAppareil } from '../donnees/appareil'
import { ajouterExemples } from '../donnees/exemples'
import { useCorbeille, useRecettes } from '../donnees/hooks'
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
          <Lien href="/synchro" Icone={Wifi} detail="Phase 0">
            Test de synchronisation Wi-Fi
          </Lien>
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

function NomAppareil() {
  const id = useId()
  const appareil = useLiveQuery(() => obtenirAppareil(base), [])
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
