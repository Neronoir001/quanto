import { useLiveQuery } from 'dexie-react-hooks'
import { base, type BaseQuanto } from './base'

/** Appareils avec lesquels cet appareil s'est déjà synchronisé. */
export interface AppareilConnu {
  id: string
  nom: string
  derniereSynchro: number
}

const CLE = 'appareilsConnus'

export async function listerAppareilsConnus(db: BaseQuanto): Promise<AppareilConnu[]> {
  const brut = ((await db.reglages.get(CLE))?.valeur ?? {}) as Record<string, AppareilConnu>
  return Object.values(brut).sort((a, b) => b.derniereSynchro - a.derniereSynchro)
}

export async function noterSynchro(db: BaseQuanto, appareil: { id: string; nom: string }): Promise<void> {
  const brut = ((await db.reglages.get(CLE))?.valeur ?? {}) as Record<string, AppareilConnu>
  brut[appareil.id] = { ...appareil, derniereSynchro: Date.now() }
  await db.reglages.put({ cle: CLE, valeur: brut })
}

export function useAppareilsConnus(): AppareilConnu[] {
  return useLiveQuery(() => listerAppareilsConnus(base), []) ?? []
}

/** Nom d'un appareil à partir de son identifiant (pour l'historique des versions). */
export function useNomsAppareils(): Record<string, string> {
  return (
    useLiveQuery(async () => {
      const noms: Record<string, string> = {}
      for (const a of await listerAppareilsConnus(base)) noms[a.id] = a.nom
      const moi = (await base.reglages.get('appareil'))?.valeur as { id: string; nom: string } | undefined
      if (moi) noms[moi.id] = `${moi.nom} (cet appareil)`
      return noms
    }, []) ?? {}
  )
}
