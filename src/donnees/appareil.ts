import { nouvelId } from '../domaine/modele'
import type { BaseQuanto } from './base'
import { detecterPlateforme } from '../lib/plateforme'

export interface Appareil {
  id: string
  nom: string
}

const CLE = 'appareil'

/** Lecture seule (utilisable dans un affichage réactif) : `null` tant que l'identité n'est pas créée. */
export async function lireAppareil(db: BaseQuanto): Promise<Appareil | null> {
  return ((await db.reglages.get(CLE))?.valeur as Appareil | undefined) ?? null
}

/** Identité de cet appareil, créée au premier lancement. Sert à la synchronisation. */
export async function obtenirAppareil(db: BaseQuanto): Promise<Appareil> {
  const existant = await db.reglages.get(CLE)
  if (existant) return existant.valeur as Appareil
  const p = typeof navigator === 'undefined' ? 'ordinateur' : detecterPlateforme()
  const nom = p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'PC'
  const appareil: Appareil = { id: nouvelId(), nom }
  await db.reglages.put({ cle: CLE, valeur: appareil })
  return appareil
}

export async function renommerAppareil(db: BaseQuanto, nom: string): Promise<Appareil> {
  const appareil = { ...(await obtenirAppareil(db)), nom: nom.trim() || 'Mon appareil' }
  await db.reglages.put({ cle: CLE, valeur: appareil })
  return appareil
}
