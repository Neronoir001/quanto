import type { JsonValue, Room } from 'trystero'
import { obtenirAppareil } from '../donnees/appareil'
import { noterSynchro } from '../donnees/appareils'
import type { BaseQuanto } from '../donnees/base'
import { DUREE_VALIDITE_CODE_MS, ouvrirLiaison, symbolesDeVerification } from '../lib/liaison'
import { appliquerPaquet, type Inventaire, inventaire, lirePaquet, paquetPour, recevoirPhoto, type ResultatFusion } from './echange'

/**
 * Synchronisation Wi-Fi entre deux appareils, directe et chiffrée (WebRTC).
 *
 * Déroulement :
 * 1. les deux appareils se rejoignent avec le code et se présentent ;
 * 2. l'utilisateur vérifie les symboles et confirme sur chaque appareil ;
 * 3. chacun envoie son inventaire, puis ce qui manque à l'autre (recettes, puis photos) ;
 * 4. quand tout est reçu de part et d'autre, la synchronisation est terminée.
 */

export type Etape = 'attente' | 'verification' | 'echange' | 'termine' | 'erreur'

export interface Resume extends ResultatFusion {
  envoyees: number
  photosRecues: number
  /** Décalage d'horloge constaté avec l'autre appareil, en minutes (si important). */
  decalageMinutes?: number
}

export interface EtatSynchro {
  etape: Etape
  pair?: { id: string; nom: string }
  symboles?: string[]
  confirmeIci: boolean
  confirmeLaBas: boolean
  photos?: { recues: number; attendues: number }
  resume?: Resume
  erreur?: string
}

interface Bonjour {
  id: string
  nom: string
  horloge: number
}

type MetaPhoto = { id: string; taille: 'image' | 'miniature'; type: string; modifieLe: number }

export interface Session {
  confirmer: () => void
  annuler: () => void
}

/** Écart d'horloge au-delà duquel on prévient (la fusion se fonde sur les dates). */
const ECART_HORLOGE_MS = 2 * 60 * 1000

export function demarrerSynchro(db: BaseQuanto, code: string, surEtat: (e: EtatSynchro) => void): Session {
  let etat: EtatSynchro = { etape: 'attente', confirmeIci: false, confirmeLaBas: false }
  const maj = (changements: Partial<EtatSynchro>) => {
    etat = { ...etat, ...changements }
    surEtat(etat)
  }

  let salle: Room | null = null
  let idPair: string | null = null
  let decalage: number | undefined
  let echangeLance = false
  let envoiTermine = false
  let envoyees = 0
  let fusion: ResultatFusion | null = null
  let photosAttendues: number | null = null
  let photosRecues = 0
  const morceauxPhotos = new Map<string, Partial<Record<'image' | 'miniature', Blob>> & { modifieLe?: number }>()
  let fini = false
  let sessionConfirmer: () => void = () => {}

  const minuteur = window.setTimeout(() => {
    if (etat.etape === 'attente') echouer("Aucun appareil ne s'est connecté en 2 minutes. Recommencez avec un nouveau code.")
  }, DUREE_VALIDITE_CODE_MS)

  const fermer = () => {
    window.clearTimeout(minuteur)
    void salle?.leave()
    salle = null
  }

  function echouer(message: string) {
    if (fini) return
    fini = true
    fermer()
    maj({ etape: 'erreur', erreur: message })
  }

  async function verifierFin() {
    if (fini || !envoiTermine || !fusion || photosAttendues === null || photosRecues < photosAttendues) return
    fini = true
    if (etat.pair) await noterSynchro(db, etat.pair)
    maj({
      etape: 'termine',
      resume: { ...fusion, envoyees, photosRecues, decalageMinutes: decalage },
      photos: { recues: photosRecues, attendues: photosAttendues },
    })
    // Laisse le temps aux derniers accusés de partir avant de fermer la liaison.
    window.setTimeout(fermer, 1500)
  }

  void (async () => {
    const moi = await obtenirAppareil(db)
    salle = ouvrirLiaison(code, () => echouer('La connexion directe a échoué. Vérifiez que les deux appareils sont sur le même Wi-Fi, ou utilisez le transfert par fichier.'))

    // Les données circulent en JSON ; leur forme est vérifiée à la réception.
    const bonjour = salle.makeAction<JsonValue>('bonjour')
    const confirme = salle.makeAction<boolean>('confirme')
    const inv = salle.makeAction<JsonValue>('inventaire')
    const paquet = salle.makeAction<JsonValue>('paquet')
    const photo = salle.makeAction<ArrayBuffer>('photo')
    const termine = salle.makeAction<number>('envoi-termine')

    const lancerEchange = async () => {
      if (echangeLance || !idPair) return
      echangeLance = true
      maj({ etape: 'echange', photos: { recues: 0, attendues: 0 } })
      await inv.send((await inventaire(db)) as unknown as JsonValue, { target: idPair })
    }

    salle.onPeerJoin = async (id) => {
      if (idPair && id !== idPair) return // un seul appareil à la fois
      idPair = id
      window.clearTimeout(minuteur)
      const b: Bonjour = { id: moi.id, nom: moi.nom, horloge: Date.now() }
      await bonjour.send(b as unknown as JsonValue, { target: id })
      maj({ symboles: await symbolesDeVerification(code, id) })
    }

    salle.onPeerLeave = (id) => {
      if (id === idPair && !fini) echouer("L'autre appareil s'est déconnecté avant la fin. Rien n'a été perdu : relancez la synchronisation.")
    }

    bonjour.onMessage = (brut, { peerId }) => {
      const b = brut as unknown as Bonjour
      if (peerId !== idPair || typeof b?.id !== 'string' || typeof b.horloge !== 'number') return
      const ecart = Date.now() - b.horloge
      if (Math.abs(ecart) > ECART_HORLOGE_MS) decalage = Math.round(ecart / 60000)
      maj({ etape: 'verification', pair: { id: b.id, nom: b.nom } })
    }

    confirme.onMessage = (_v, { peerId }) => {
      if (peerId !== idPair) return
      maj({ confirmeLaBas: true })
      if (etat.confirmeIci) void lancerEchange()
    }

    // Ce que l'autre possède : on lui envoie ce qui lui manque.
    inv.onMessage = async (brut, { peerId }) => {
      if (peerId !== idPair) return
      const autre = brut as unknown as Inventaire
      try {
        const p = await paquetPour(db, autre)
        envoyees = p.recettes.length
        await paquet.send(p as unknown as JsonValue, { target: peerId })
        for (const id of p.photos) {
          const ph = await db.photos.get(id)
          if (!ph) continue
          for (const taille of ['image', 'miniature'] as const) {
            await photo.send(await ph[taille].arrayBuffer(), {
              target: peerId,
              metadata: { id, taille, type: ph[taille].type, modifieLe: ph.modifieLe },
            })
          }
        }
        await termine.send(p.photos.length, { target: peerId })
        envoiTermine = true
        await verifierFin()
      } catch {
        echouer("L'envoi des recettes a échoué. Réessayez.")
      }
    }

    paquet.onMessage = async (brut, { peerId }) => {
      if (peerId !== idPair) return
      try {
        const { paquet: p } = lirePaquet(brut)
        photosAttendues = p.photos.length
        maj({ photos: { recues: photosRecues, attendues: photosAttendues } })
        fusion = await appliquerPaquet(db, p)
        await verifierFin()
      } catch {
        echouer('Les recettes reçues sont illisibles. Vérifiez que les deux appareils ont la même version de Quanto.')
      }
    }

    photo.onMessage = async (donnees, { peerId, metadata }) => {
      if (peerId !== idPair || !metadata) return
      const m = metadata as unknown as MetaPhoto
      const morceaux = morceauxPhotos.get(m.id) ?? {}
      morceaux[m.taille] = new Blob([donnees], { type: m.type })
      morceaux.modifieLe = m.modifieLe
      morceauxPhotos.set(m.id, morceaux)
      if (morceaux.image && morceaux.miniature) {
        await recevoirPhoto(db, { id: m.id, image: morceaux.image, miniature: morceaux.miniature, modifieLe: m.modifieLe })
        morceauxPhotos.delete(m.id)
        photosRecues++
        maj({ photos: { recues: photosRecues, attendues: photosAttendues ?? photosRecues } })
        await verifierFin()
      }
    }

    termine.onMessage = () => void verifierFin()

    // Confirmation locale, déclenchée par l'utilisateur.
    sessionConfirmer = () => {
      if (!idPair || etat.confirmeIci) return
      maj({ confirmeIci: true })
      void confirme.send(true, { target: idPair })
      if (etat.confirmeLaBas) void lancerEchange()
    }
  })().catch(() => echouer('Impossible de démarrer la synchronisation.'))

  return {
    confirmer: () => sessionConfirmer(),
    annuler: () => {
      fini = true
      fermer()
    },
  }
}
