import { joinRoom, selfId, type Room } from 'trystero'

/**
 * Liaison directe et chiffrée entre deux appareils (WebRTC).
 * Un service public de mise en relation (relais Nostr) sert uniquement à échanger
 * les informations de connexion, elles-mêmes chiffrées avec le code à 6 chiffres.
 * Les données (messages, recettes, photos) passent ensuite directement d'un appareil à l'autre.
 */

const APP_ID = 'quanto-recettes-a7c41e9b'
export const DUREE_VALIDITE_CODE_MS = 2 * 60 * 1000

export function genererCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return n.toString().padStart(6, '0')
}

export function codeValide(code: string): boolean {
  return /^\d{6}$/.test(code)
}

export function ouvrirLiaison(code: string, surErreur: (message: string) => void): Room {
  return joinRoom({ appId: APP_ID, password: `quanto:${code}` }, `liaison-${code}`, {
    onJoinError: ({ error }) => surErreur(error),
  })
}

const SYMBOLES = ['🍅', '🧀', '🍋', '🫒', '🥖', '🍝', '🍕', '🥕', '🍇', '🍐', '🥐', '🍓', '🌿', '🧄', '🍄', '🍰']

/**
 * Trois symboles calculés à partir du code et des deux appareils.
 * Ils sont identiques sur les deux écrans si — et seulement si — ce sont bien vos deux appareils qui sont reliés.
 */
export async function symbolesDeVerification(code: string, idPair: string): Promise<string[]> {
  const ids = [selfId, idPair].sort().join('|')
  const octets = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${code}|${ids}`)))
  return [octets[0] % 16, octets[1] % 16, octets[2] % 16].map((i) => SYMBOLES[i])
}
