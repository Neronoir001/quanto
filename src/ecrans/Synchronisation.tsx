import { CircleCheck, Download, FileUp, Share2, ShieldCheck, Smartphone, Wifi } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useMessage } from '../composants/Messages'
import NomAppareil from '../composants/NomAppareil'
import { base } from '../donnees/base'
import { useAppareilsConnus } from '../donnees/appareils'
import { codeValide, genererCode } from '../lib/liaison'
import { dateDernierEnvoi, exporterCarnet, importerFichier, type ModeExport, noterEnvoi, type ResultatImport } from '../sync/fichier'
import { demarrerSynchro, type EtatSynchro, type Session } from '../sync/wifi'
import { useLiveQuery } from 'dexie-react-hooks'
import { partagerOuEnregistrer } from '../import/partage'

const dateLongue = (t: number) => new Date(t).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
/** « 2 nouvelles recettes » : chaque mot prend la marque du pluriel. */
const pluriel = (n: number, mots: string) => `${n} ${n > 1 ? mots.split(' ').map((m) => `${m}s`).join(' ') : mots}`

export default function Synchronisation() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-4xl font-semibold">Synchronisation</h1>
        <p className="mt-2 text-texte-doux">Retrouvez les mêmes recettes sur tous vos appareils, dans les deux sens.</p>
      </div>

      <Bloc>
        <NomAppareil />
      </Bloc>

      <SynchroWifi />
      <TransfertFichier />
      <AppareilsConnus />

      <p className="flex items-start gap-2 text-sm text-texte-doux">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sauge" aria-hidden="true" />
        Vos recettes passent directement d'un appareil à l'autre, chiffrées. Aucun serveur ne les reçoit ni ne les conserve.
      </p>
    </div>
  )
}

function Bloc({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>
}

const boutonPrincipal =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primaire px-5 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50'
const boutonSecondaire =
  'inline-flex items-center justify-center gap-2 rounded-full border border-primaire px-5 py-3 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire disabled:opacity-50'

// ————————————————————————————————————————————————————————————————
// Wi-Fi
// ————————————————————————————————————————————————————————————————

function SynchroWifi() {
  const idCode = useId()
  const [code, setCode] = useState('')
  const [hote, setHote] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [etat, setEtat] = useState<EtatSynchro | null>(null)
  const session = useRef<Session | null>(null)

  useEffect(() => () => session.current?.annuler(), [])

  const lancer = (c: string, estHote: boolean) => {
    session.current?.annuler()
    setCode(c)
    setHote(estHote)
    session.current = demarrerSynchro(base, c, setEtat)
    setEtat({ etape: 'attente', confirmeIci: false, confirmeLaBas: false })
  }

  const terminer = () => {
    session.current?.annuler()
    session.current = null
    setEtat(null)
    setSaisie('')
  }

  return (
    <Bloc>
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <Wifi className="size-6 text-primaire" aria-hidden="true" /> Par Wi-Fi
      </h2>

      {!etat && (
        <>
          <p className="mt-2 text-texte-doux">
            Les deux appareils sur le <strong className="text-texte">même Wi-Fi</strong>, Quanto ouverte sur chacun.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-bord bg-fond p-4">
              <p className="font-semibold">Sur le premier appareil</p>
              <button onClick={() => lancer(genererCode(), true)} className={`${boutonPrincipal} mt-3 w-full`}>
                Afficher un code
              </button>
            </div>
            <form
              className="rounded-2xl border border-bord bg-fond p-4"
              onSubmit={(e) => {
                e.preventDefault()
                const c = saisie.replace(/\s/g, '')
                if (codeValide(c)) lancer(c, false)
              }}
            >
              <label htmlFor={idCode} className="font-semibold">
                Sur le second appareil
              </label>
              <input
                id={idCode}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="Code à 6 chiffres"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                className="mt-3 w-full rounded-xl border border-bord bg-surface px-3 py-2.5 text-center font-mono text-xl tracking-[0.25em]"
              />
              <button type="submit" disabled={!codeValide(saisie.replace(/\s/g, ''))} className={`${boutonSecondaire} mt-3 w-full`}>
                Se connecter
              </button>
            </form>
          </div>
        </>
      )}

      {etat?.etape === 'attente' && (
        <div className="mt-4 text-center" aria-live="polite">
          {hote ? (
            <>
              <p className="text-texte-doux">Code à saisir sur l'autre appareil</p>
              <p className="my-3 font-mono text-5xl font-semibold tracking-[0.25em] text-primaire">
                {code.slice(0, 3)} {code.slice(3)}
              </p>
            </>
          ) : (
            <p className="my-3 font-mono text-2xl text-texte-doux">Code {code}</p>
          )}
          <p className="animate-pulse text-texte-doux">Recherche de l'autre appareil… (2 minutes au plus)</p>
          <button onClick={terminer} className="mt-4 text-primaire underline underline-offset-4">
            Annuler
          </button>
        </div>
      )}

      {etat?.etape === 'verification' && (
        <div className="mt-4 space-y-4" aria-live="polite">
          <p className="text-lg font-semibold">
            Relié à « {etat.pair?.nom} »
          </p>
          <div className="rounded-2xl bg-fond p-4 text-center">
            <p className="text-texte-doux">Les mêmes symboles doivent s'afficher sur les deux écrans :</p>
            <p className="mt-2 text-5xl tracking-widest" aria-label={`Symboles : ${etat.symboles?.join(', ')}`}>
              {etat.symboles?.join(' ')}
            </p>
          </div>
          {etat.confirmeIci ? (
            <p className="animate-pulse text-center text-texte-doux">En attente de la confirmation sur « {etat.pair?.nom} »…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => session.current?.confirmer()} className={boutonPrincipal}>
                <CircleCheck className="size-5" aria-hidden="true" /> Identiques : synchroniser
              </button>
              <button onClick={terminer} className="px-3 py-3 text-texte-doux hover:text-texte">
                Ils sont différents
              </button>
            </div>
          )}
          {etat.confirmeLaBas && !etat.confirmeIci && (
            <p className="text-sm text-sauge">« {etat.pair?.nom} » a déjà confirmé.</p>
          )}
        </div>
      )}

      {etat?.etape === 'echange' && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="font-semibold">Échange avec « {etat.pair?.nom} »…</p>
          <div className="h-3 overflow-hidden rounded-full bg-fond" role="progressbar" aria-label="Progression">
            <motion.div
              className="h-full rounded-full bg-primaire"
              initial={{ width: '8%' }}
              animate={{
                width: etat.photos?.attendues ? `${Math.max(8, (etat.photos.recues / etat.photos.attendues) * 100)}%` : '60%',
              }}
            />
          </div>
          {!!etat.photos?.attendues && (
            <p className="text-sm text-texte-doux">
              Photos reçues : {etat.photos.recues} / {etat.photos.attendues}
            </p>
          )}
          <p className="text-sm text-texte-doux">Gardez les deux écrans allumés jusqu'à la fin.</p>
        </div>
      )}

      {etat?.etape === 'termine' && etat.resume && (
        <div className="mt-4 space-y-3 rounded-2xl border border-sauge bg-sauge-fond p-5" aria-live="polite">
          <p className="flex items-center gap-2 text-lg font-semibold text-sauge">
            <CircleCheck className="size-6" aria-hidden="true" /> Synchronisation terminée avec « {etat.pair?.nom} »
          </p>
          <ul className="space-y-1">
            <li>{pluriel(etat.resume.nouvelles, 'nouvelle recette')} reçue{etat.resume.nouvelles > 1 ? 's' : ''}</li>
            {etat.resume.misesAJour > 0 && <li>{pluriel(etat.resume.misesAJour, 'recette')} mise{etat.resume.misesAJour > 1 ? 's' : ''} à jour</li>}
            {etat.resume.supprimees > 0 && <li>{pluriel(etat.resume.supprimees, 'recette')} supprimée{etat.resume.supprimees > 1 ? 's' : ''}</li>}
            <li>{pluriel(etat.resume.envoyees, 'recette')} envoyée{etat.resume.envoyees > 1 ? 's' : ''}</li>
            {etat.resume.photosRecues > 0 && <li>{pluriel(etat.resume.photosRecues, 'photo')} reçue{etat.resume.photosRecues > 1 ? 's' : ''}</li>}
          </ul>
          {etat.resume.decalageMinutes !== undefined && (
            <p className="rounded-xl bg-dore-fond p-3 text-sm">
              L'heure de « {etat.pair?.nom} » semble décalée d'environ {Math.abs(etat.resume.decalageMinutes)} minutes. Quanto se
              sert de l'heure pour savoir quelle version est la plus récente : vérifiez la date et l'heure de vos appareils.
            </p>
          )}
          <button onClick={terminer} className={boutonPrincipal}>
            Terminer
          </button>
        </div>
      )}

      {etat?.etape === 'erreur' && (
        <div className="mt-4 space-y-3 rounded-2xl border border-alerte bg-alerte-fond p-5" role="alert">
          <p className="font-semibold text-alerte">{etat.erreur}</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={terminer} className={boutonPrincipal}>
              Recommencer
            </button>
          </div>
        </div>
      )}
    </Bloc>
  )
}

// ————————————————————————————————————————————————————————————————
// Fichier
// ————————————————————————————————————————————————————————————————

function TransfertFichier() {
  const afficher = useMessage()
  const dernierEnvoi = useLiveQuery(() => dateDernierEnvoi(base), [])
  const [mode, setMode] = useState<ModeExport>('complet')
  const [enCours, setEnCours] = useState(false)
  const [resultat, setResultat] = useState<ResultatImport | null>(null)
  const [erreur, setErreur] = useState('')
  const champFichier = useRef<HTMLInputElement>(null)
  const peutPartager = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.zip', { type: 'application/zip' })] })

  const exporter = async (partager: boolean) => {
    setEnCours(true)
    try {
      const { fichier, recettes } = await exporterCarnet(base, mode)
      if (recettes === 0 && mode === 'nouveautes') {
        afficher('Aucune nouveauté depuis le dernier envoi.')
        return
      }
      if (await partagerOuEnregistrer(fichier, partager)) {
        await noterEnvoi(base, mode)
        afficher(partager ? 'Carnet partagé.' : `Fichier enregistré : ${fichier.name}`)
      }
    } catch {
      afficher('La préparation du fichier a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  const importer = async (f: File) => {
    setErreur('')
    setResultat(null)
    setEnCours(true)
    try {
      setResultat(await importerFichier(base, f))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Import impossible.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Bloc>
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <Share2 className="size-6 text-primaire" aria-hidden="true" /> Par fichier
      </h2>
      <p className="mt-2 text-texte-doux">
        Envoyez votre carnet par e-mail, Quick Share, câble… Le carnet complet sert aussi de sauvegarde.
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 font-semibold">Que mettre dans le fichier ?</legend>
        <label className="flex items-start gap-3 rounded-2xl border border-bord bg-fond p-3 has-[:checked]:border-primaire">
          <input type="radio" name="mode-export" checked={mode === 'complet'} onChange={() => setMode('complet')} className="mt-1 size-4 accent-[var(--primaire)]" />
          <span>
            <span className="font-medium">Carnet complet</span>
            <span className="block text-sm text-texte-doux">Toutes les recettes et photos. Idéal comme sauvegarde.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-bord bg-fond p-3 has-[:checked]:border-primaire">
          <input type="radio" name="mode-export" checked={mode === 'nouveautes'} onChange={() => setMode('nouveautes')} className="mt-1 size-4 accent-[var(--primaire)]" />
          <span>
            <span className="font-medium">Nouveautés uniquement</span>
            <span className="block text-sm text-texte-doux">
              {dernierEnvoi ? `Ce qui a changé depuis le ${dateLongue(dernierEnvoi)}.` : 'Aucun envoi pour l’instant : tout sera inclus.'} Fichier léger, idéal par e-mail.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-3">
        {peutPartager && (
          <button disabled={enCours} onClick={() => void exporter(true)} className={boutonPrincipal}>
            <Share2 className="size-5" aria-hidden="true" /> Partager…
          </button>
        )}
        <button disabled={enCours} onClick={() => void exporter(false)} className={peutPartager ? boutonSecondaire : boutonPrincipal}>
          <Download className="size-5" aria-hidden="true" /> Enregistrer le fichier
        </button>
      </div>

      <div className="mt-6 border-t border-bord pt-5">
        <p className="font-semibold">Recevoir un carnet</p>
        <p className="mt-1 text-sm text-texte-doux">Choisissez le fichier .zip reçu d'un autre appareil. Ses recettes seront fusionnées avec les vôtres, sans doublon.</p>
        <button disabled={enCours} onClick={() => champFichier.current?.click()} className={`${boutonSecondaire} mt-3`}>
          <FileUp className="size-5" aria-hidden="true" /> Importer un fichier
        </button>
        <input
          ref={champFichier}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,.json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importer(f)
          }}
        />
        {enCours && <p className="mt-3 animate-pulse text-texte-doux">Traitement en cours…</p>}
        {erreur && (
          <p role="alert" className="mt-3 rounded-xl bg-alerte-fond p-3 font-medium text-alerte">
            {erreur}
          </p>
        )}
        {resultat && (
          <div role="status" className="mt-3 rounded-2xl border border-sauge bg-sauge-fond p-4">
            <p className="font-semibold text-sauge">Carnet importé{resultat.provenance ? ` depuis « ${resultat.provenance} »` : ''}</p>
            <p className="mt-1">
              {pluriel(resultat.nouvelles, 'nouvelle recette')}, {pluriel(resultat.misesAJour, 'mise')} à jour,{' '}
              {pluriel(resultat.supprimees, 'suppression')}, {pluriel(resultat.photos, 'photo')}.
              {resultat.ignorees > 0 && ` ${pluriel(resultat.ignorees, 'recette illisible')} ignorée${resultat.ignorees > 1 ? 's' : ''}.`}
            </p>
          </div>
        )}
      </div>
    </Bloc>
  )
}

// ————————————————————————————————————————————————————————————————
// Appareils connus
// ————————————————————————————————————————————————————————————————

function AppareilsConnus() {
  const appareils = useAppareilsConnus()
  if (appareils.length === 0) return null
  return (
    <Bloc>
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <Smartphone className="size-6 text-primaire" aria-hidden="true" /> Mes appareils
      </h2>
      <ul className="mt-3 divide-y divide-bord">
        {appareils.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <span className="font-medium">{a.nom}</span>
            <span className="text-sm text-texte-doux">Synchronisé le {dateLongue(a.derniereSynchro)}</span>
          </li>
        ))}
      </ul>
    </Bloc>
  )
}
