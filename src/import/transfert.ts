import type { ValeursFormulaire } from '../domaine/formulaire'
import type { Recette } from '../domaine/modele'

/** Recette importée, transmise de l'écran « Importer » au formulaire de saisie. */
export interface ImportEnCours {
  valeurs: ValeursFormulaire
  source: NonNullable<Recette['source']>
  avertissement?: string
}

const CLE = 'quanto.import'

export function preparerImport(i: ImportEnCours): void {
  sessionStorage.setItem(CLE, JSON.stringify(i))
}

export function lireImport(): ImportEnCours | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLE) ?? 'null') as ImportEnCours | null
  } catch {
    return null
  }
}

export function oublierImport(): void {
  try {
    sessionStorage.removeItem(CLE)
  } catch {
    /* rien à oublier */
  }
}
