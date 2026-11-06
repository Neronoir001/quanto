import { useLiveQuery } from 'dexie-react-hooks'
import { type Contenant, estComplet } from '../domaine/contenants'
import { nouvelId } from '../domaine/modele'
import { base, type BaseQuanto } from './base'

/** Un moule de la cuisine de l'utilisateur, mémorisé pour être choisi en un toucher. */
export interface MonMoule {
  id: string
  nom?: string
  contenant: Contenant
}

const CLE = 'mesMoules'

export async function listerMoules(db: BaseQuanto): Promise<MonMoule[]> {
  return ((await db.reglages.get(CLE))?.valeur ?? []) as MonMoule[]
}

/** Compare deux contenants sur leurs seules dimensions utiles. */
export function memesDimensions(a: Contenant, b: Contenant): boolean {
  const cles = ['type', 'diametre', 'cote', 'longueur', 'largeur', 'hauteur', 'volume'] as const
  return cles.every((k) => (a[k] ?? null) === (b[k] ?? null))
}

export async function memoriserMoule(db: BaseQuanto, contenant: Contenant, nom?: string): Promise<MonMoule> {
  if (!estComplet(contenant)) throw new Error('Dimensions incomplètes.')
  const moules = await listerMoules(db)
  const existant = moules.find((m) => memesDimensions(m.contenant, contenant))
  const moule: MonMoule = { id: existant?.id ?? nouvelId(), nom: nom?.trim() || undefined, contenant: { ...contenant } }
  const suivants = existant ? moules.map((m) => (m.id === existant.id ? moule : m)) : [...moules, moule]
  await db.reglages.put({ cle: CLE, valeur: suivants })
  return moule
}

export async function oublierMoule(db: BaseQuanto, id: string): Promise<void> {
  const moules = await listerMoules(db)
  await db.reglages.put({ cle: CLE, valeur: moules.filter((m) => m.id !== id) })
}

export function useMesMoules(): MonMoule[] {
  return useLiveQuery(() => listerMoules(base), []) ?? []
}
