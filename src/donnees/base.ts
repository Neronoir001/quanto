import Dexie, { type EntityTable } from 'dexie'
import type { Collection, Effacement, Photo, Recette, Reglage, Version } from '../domaine/modele'

/**
 * Base de données locale de Quanto (IndexedDB, via Dexie).
 * Tout reste sur l'appareil : rien n'est envoyé sur Internet.
 */
export class BaseQuanto extends Dexie {
  recettes!: EntityTable<Recette, 'id'>
  photos!: EntityTable<Photo, 'id'>
  collections!: EntityTable<Collection, 'id'>
  versions!: EntityTable<Version, 'num'>
  effacements!: EntityTable<Effacement, 'id'>
  reglages!: EntityTable<Reglage, 'cle'>

  constructor(nom = 'quanto') {
    super(nom)
    this.version(1).stores({
      recettes: 'id, titre, categorie, modifieLe, supprimeLe, *tags, *collections',
      photos: 'id, modifieLe',
      collections: 'id, modifieLe, supprimeLe',
      versions: '++num, recetteId, date',
      effacements: 'id, date',
      reglages: 'cle',
    })
  }
}

export const base = new BaseQuanto()
