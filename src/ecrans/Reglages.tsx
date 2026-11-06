import { Bookmark, ChevronRight, CircleHelp, HardDrive, Library, Sparkles, Trash, Wifi } from 'lucide-react'
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
import { type TailleTexte, type Theme, useTailleTexte, useTheme } from '../lib/apparence'
import { useEffect } from 'react'

export default function Reglages() {
  const recettes = useRecettes()
  const corbeille = useCorbeille()
  const afficher = useMessage()
  const [exemplesEnCours, setExemplesEnCours] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-4xl font-semibold">Réglages</h1>

      <Link
        href="/aide"
        className="flex items-center gap-4 rounded-3xl border border-dore bg-dore-fond p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <CircleHelp className="size-8 shrink-0 text-primaire" aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-serif text-xl font-semibold">Aide et guide d'utilisation</span>
          <span className="block text-sm text-texte-doux">Installer, importer, recalculer, synchroniser, sauvegarder…</span>
        </span>
        <ChevronRight className="size-5 text-texte-doux" aria-hidden="true" />
      </Link>

      <Bloc titre="Cet appareil">
        <NomAppareil />
      </Bloc>

      <Bloc titre="Apparence">
        <Apparence />
      </Bloc>

      <Bloc titre="Mes données">
        <ul className="divide-y divide-bord">
          <Lien href="/synchro" Icone={Wifi} detail="Wi-Fi ou fichier">
            Synchroniser et sauvegarder
          </Lien>
          <Lien href="/carnets" Icone={Library}>
            Mes carnets
          </Lien>
          <Lien href="/corbeille" Icone={Trash} detail={corbeille?.length ? `${corbeille.length} recette${corbeille.length > 1 ? 's' : ''}` : 'Vide'}>
            Corbeille
          </Lien>
          <li>
            <button type="button"
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
        <EspaceUtilise />
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
          <Lien href="/importer" Icone={Bookmark} detail="Import depuis un site">
            Installer le bouton magique
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

const THEMES: { valeur: Theme; libelle: string }[] = [
  { valeur: 'auto', libelle: 'Automatique' },
  { valeur: 'clair', libelle: 'Clair' },
  { valeur: 'sombre', libelle: 'Sombre' },
]
const TAILLES: { valeur: TailleTexte; libelle: string }[] = [
  { valeur: 'normal', libelle: 'Normal' },
  { valeur: 'grand', libelle: 'Grand' },
  { valeur: 'tres-grand', libelle: 'Très grand' },
]

function Choix<T extends string>({ titre, options, valeur, onChange }: { titre: string; options: { valeur: T; libelle: string }[]; valeur: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={titre}>
      <p className="mb-2 font-medium">{titre}</p>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-fond p-1">
        {options.map((o) => (
          <button type="button"
            key={o.valeur}
            role="radio"
            aria-checked={valeur === o.valeur}
            onClick={() => onChange(o.valeur)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${valeur === o.valeur ? 'bg-primaire text-sur-primaire shadow-sm' : 'text-texte-doux hover:text-texte'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}

function Apparence() {
  const [theme, setTheme] = useTheme()
  const [taille, setTaille] = useTailleTexte()
  return (
    <div className="space-y-4">
      <Choix titre="Thème" options={THEMES} valeur={theme} onChange={setTheme} />
      <p className="-mt-2 text-sm text-texte-doux">« Automatique » suit le réglage clair ou sombre de l'appareil.</p>
      <Choix titre="Taille du texte" options={TAILLES} valeur={taille} onChange={setTaille} />
    </div>
  )
}

function EspaceUtilise() {
  const [espace, setEspace] = useState<{ utilise: number; total: number } | null>(null)
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setEspace({ utilise: e.usage ?? 0, total: e.quota ?? 0 }))
      .catch(() => {})
  }, [])
  if (!espace) return null
  const mo = (o: number) => (o / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: o < 10 * 1024 * 1024 ? 1 : 0 })
  const part = espace.total ? Math.min(100, (espace.utilise / espace.total) * 100) : 0
  return (
    <div className="mt-3 border-t border-bord pt-3">
      <p className="flex items-center gap-2 font-medium">
        <HardDrive className="size-4 text-primaire" aria-hidden="true" /> Espace utilisé sur cet appareil
      </p>
      <p className="mt-1 text-sm text-texte-doux">
        {mo(espace.utilise)} Mo{espace.total ? ` sur ${mo(espace.total)} Mo disponibles` : ''} (recettes, photos et application).
      </p>
      {espace.total > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-fond" role="progressbar" aria-valuenow={Math.round(part)} aria-valuemin={0} aria-valuemax={100} aria-label="Espace utilisé">
          <div className="h-full rounded-full bg-sauge" style={{ width: `${Math.max(1, part)}%` }} />
        </div>
      )}
    </div>
  )
}
