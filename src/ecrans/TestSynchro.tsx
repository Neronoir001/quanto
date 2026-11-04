import { useEffect, useRef, useState } from 'react'
import type { Room } from 'trystero'
import { detecterPlateforme } from '../lib/plateforme'
import { codeValide, DUREE_VALIDITE_CODE_MS, genererCode, ouvrirLiaison, symbolesDeVerification } from '../lib/liaison'

type Etape = 'choix' | 'attente' | 'connecte'
type Ligne = { heure: string; texte: string; genre: 'info' | 'succes' | 'erreur' }

const CLE_NOM = 'quanto.nomAppareil'
const TAILLE_ESSAI = 1024 * 1024 // 1 Mo, l'équivalent de 3 ou 4 photos compressées

function nomParDefaut(): string {
  const p = detecterPlateforme()
  return p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'PC'
}

function lireNom(): string {
  try {
    return localStorage.getItem(CLE_NOM) || nomParDefaut()
  } catch {
    return nomParDefaut()
  }
}

export default function TestSynchro() {
  const [nom, setNom] = useState(lireNom)
  const [etape, setEtape] = useState<Etape>('choix')
  const [code, setCode] = useState('')
  const [saisie, setSaisie] = useState('')
  const [pair, setPair] = useState<{ id: string; nom: string } | null>(null)
  const [symboles, setSymboles] = useState<string[]>([])
  const [journal, setJournal] = useState<Ligne[]>([])
  const [essaiEnCours, setEssaiEnCours] = useState(false)
  const [hote, setHote] = useState(true)

  const salle = useRef<Room | null>(null)
  const minuteur = useRef<number | undefined>(undefined)
  const debutEssai = useRef(0)
  const envoyer = useRef<{
    presentation?: (nom: string, cible: string) => void
    message?: (texte: string) => void
    essai?: () => void
  }>({})

  const noter = (texte: string, genre: Ligne['genre'] = 'info') =>
    setJournal((j) => [{ heure: new Date().toLocaleTimeString('fr-FR'), texte, genre }, ...j].slice(0, 30))

  const quitter = () => {
    window.clearTimeout(minuteur.current)
    salle.current?.leave()
    salle.current = null
    envoyer.current = {}
    setPair(null)
    setSymboles([])
    setCode('')
    setEtape('choix')
  }

  useEffect(() => () => {
    window.clearTimeout(minuteur.current)
    salle.current?.leave()
  }, [])

  const enregistrerNom = (valeur: string) => {
    setNom(valeur)
    try {
      localStorage.setItem(CLE_NOM, valeur)
    } catch {
      /* stockage indisponible : le nom reste valable pour cette session */
    }
  }

  const demarrer = (codeChoisi: string, estHote: boolean) => {
    quitter()
    setHote(estHote)
    setCode(codeChoisi)
    setEtape('attente')
    noter(`Recherche de l'autre appareil avec le code ${codeChoisi}…`)

    const room = ouvrirLiaison(codeChoisi, (erreur) => noter(`Connexion impossible : ${erreur}`, 'erreur'))
    salle.current = room

    const presentation = room.makeAction<{ nom: string }>('presentation')
    const message = room.makeAction<string>('message')
    const essai = room.makeAction<ArrayBuffer>('essai')
    const accuse = room.makeAction<{ octets: number }>('accuse')

    envoyer.current = {
      presentation: (n, cible) => void presentation.send({ nom: n }, { target: cible }),
      message: (texte) => void message.send(texte),
      essai: () => {
        debutEssai.current = performance.now()
        void essai.send(new ArrayBuffer(TAILLE_ESSAI))
      },
    }

    minuteur.current = window.setTimeout(() => {
      noter("Code expiré : aucun appareil ne s'est connecté en 2 minutes.", 'erreur')
      quitter()
    }, DUREE_VALIDITE_CODE_MS)

    room.onPeerJoin = async (id) => {
      window.clearTimeout(minuteur.current)
      setPair({ id, nom: 'Appareil' })
      setEtape('connecte')
      setSymboles(await symbolesDeVerification(codeChoisi, id))
      noter('Liaison directe établie.', 'succes')
      envoyer.current.presentation?.(lireNom(), id)
      try {
        const latence = await room.ping(id)
        noter(`Temps de réponse : ${Math.round(latence)} ms.`)
      } catch {
        /* mesure facultative */
      }
    }

    room.onPeerLeave = () => {
      noter("L'autre appareil s'est déconnecté.", 'erreur')
      setPair(null)
      setSymboles([])
      setEtape('attente')
    }

    presentation.onMessage = ({ nom: nomPair }, { peerId }) => {
      setPair({ id: peerId, nom: nomPair })
      noter(`Relié à « ${nomPair} ».`, 'succes')
    }

    message.onMessage = (texte) => noter(`Message reçu : « ${texte} »`, 'succes')

    essai.onMessage = (donnees, { peerId }) => {
      void accuse.send({ octets: donnees.byteLength }, { target: peerId })
      noter(`Fichier d'essai reçu (${(donnees.byteLength / 1024 / 1024).toLocaleString('fr-FR')} Mo).`, 'succes')
    }

    accuse.onMessage = ({ octets }) => {
      const secondes = (performance.now() - debutEssai.current) / 1000
      const debit = octets / 1024 / 1024 / secondes
      setEssaiEnCours(false)
      noter(
        `Envoi réussi : 1 Mo en ${secondes.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s (${debit.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo/s).`,
        'succes',
      )
    }
  }

  const rejoindre = () => {
    const c = saisie.replace(/\s/g, '')
    if (!codeValide(c)) {
      noter('Le code doit comporter 6 chiffres.', 'erreur')
      return
    }
    demarrer(c, false)
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="#/" className="text-primaire underline-offset-4 hover:underline">
          ← Accueil
        </a>
        <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Test de synchronisation</h1>
        <p className="mt-2 text-texte-doux">
          Ouvrez cette page sur deux appareils connectés au <strong>même Wi-Fi</strong>.
        </p>
      </div>

      <div className="rounded-2xl border border-bord bg-surface p-4">
        <label htmlFor="nom-appareil" className="block font-semibold">
          Nom de cet appareil
        </label>
        <input
          id="nom-appareil"
          value={nom}
          onChange={(e) => enregistrerNom(e.target.value)}
          maxLength={30}
          className="mt-2 w-full rounded-xl border border-bord bg-fond px-4 py-3 text-lg"
          disabled={etape !== 'choix'}
        />
      </div>

      {etape === 'choix' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-bord bg-surface p-5">
            <h2 className="font-serif text-xl font-semibold">Sur le premier appareil</h2>
            <p className="mt-1 text-texte-doux">Affichez un code à saisir sur l'autre appareil.</p>
            <button
              onClick={() => demarrer(genererCode(), true)}
              className="mt-4 w-full rounded-full bg-primaire px-5 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98]"
            >
              Afficher un code
            </button>
          </div>
          <div className="rounded-2xl border border-bord bg-surface p-5">
            <h2 className="font-serif text-xl font-semibold">Sur le second appareil</h2>
            <label htmlFor="code" className="mt-1 block text-texte-doux">
              Saisissez le code affiché sur l'autre appareil.
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rejoindre()}
              className="mt-3 w-full rounded-xl border border-bord bg-fond px-4 py-3 text-center font-mono text-2xl tracking-[0.3em]"
            />
            <button
              onClick={rejoindre}
              className="mt-3 w-full rounded-full border border-primaire px-5 py-3 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire"
            >
              Se connecter
            </button>
          </div>
        </div>
      )}

      {etape === 'attente' && (
        <div className="rounded-3xl border border-bord bg-surface p-6 text-center" aria-live="polite">
          <p className="text-texte-doux">{hote ? "Code à saisir sur l'autre appareil" : 'Connexion avec le code'}</p>
          <p className="my-3 font-mono text-5xl font-semibold tracking-[0.25em] text-primaire">
            {code.slice(0, 3)} {code.slice(3)}
          </p>
          <p className="animate-pulse text-texte-doux">En attente de l'autre appareil… (valable 2 minutes)</p>
          <button onClick={quitter} className="mt-4 text-primaire underline underline-offset-4">
            Annuler
          </button>
        </div>
      )}

      {etape === 'connecte' && pair && (
        <div className="space-y-4 rounded-3xl border border-sauge bg-sauge-fond p-6" aria-live="polite">
          <p className="text-lg font-semibold text-sauge">✓ Relié à « {pair.nom} »</p>
          <div>
            <p className="text-texte-doux">Vérifiez que l'autre écran affiche les mêmes symboles :</p>
            <p className="mt-2 text-5xl tracking-widest" aria-label={`Symboles : ${symboles.join(', ')}`}>
              {symboles.join(' ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                envoyer.current.message?.(`Bonjour de ${nom} !`)
                noter('Message « Bonjour » envoyé.')
              }}
              className="rounded-full bg-primaire px-5 py-3 font-medium text-sur-primaire transition hover:opacity-90 active:scale-[0.98]"
            >
              Envoyer « Bonjour »
            </button>
            <button
              disabled={essaiEnCours}
              onClick={() => {
                setEssaiEnCours(true)
                noter("Envoi d'un fichier d'essai de 1 Mo…")
                envoyer.current.essai?.()
              }}
              className="rounded-full border border-primaire px-5 py-3 font-medium text-primaire transition hover:bg-primaire hover:text-sur-primaire disabled:opacity-50"
            >
              {essaiEnCours ? 'Envoi en cours…' : 'Envoyer 1 Mo d’essai'}
            </button>
            <button onClick={quitter} className="px-2 py-3 text-primaire underline underline-offset-4">
              Terminer
            </button>
          </div>
        </div>
      )}

      {journal.length > 0 && (
        <section aria-labelledby="titre-journal">
          <h2 id="titre-journal" className="mb-2 font-semibold">
            Journal
          </h2>
          <ul className="space-y-1 rounded-2xl border border-bord bg-surface p-4 text-sm" aria-live="polite">
            {journal.map((l, i) => (
              <li
                key={i}
                className={l.genre === 'erreur' ? 'text-alerte' : l.genre === 'succes' ? 'text-sauge' : 'text-texte-doux'}
              >
                <span className="font-mono opacity-70">{l.heure}</span> — {l.texte}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
