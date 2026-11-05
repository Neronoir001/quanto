import { nouvelId } from '../domaine/modele'
import type { BaseQuanto } from './base'

export interface Appareil {
  id: string
  nom: string
}

const CLE = 'appareil'

/** Identité de cet appareil, créée au premier lancement. Sert à la synchronisation. */
export async function obtenirAppareil(db: BaseQuanto): Promise<Appareil> {
  const existant = await db.reglages.get(CLE)
  if (existant) return existant.valeur as Appareil
  const appareil: Appareil = { id: nouvelId(), nom: 'Mon appareil' }
  await db.reglages.put({ cle: CLE, valeur: appareil })
  return appareil
}

export async function renommerAppareil(db: BaseQuanto, nom: string): Promise<Appareil> {
  const appareil = { ...(await obtenirAppareil(db)), nom: nom.trim() || 'Mon appareil' }
  await db.reglages.put({ cle: CLE, valeur: appareil })
  return appareil
}
