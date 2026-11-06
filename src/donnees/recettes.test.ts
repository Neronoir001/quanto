import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { recetteVide } from '../domaine/modele'
import { obtenirAppareil } from './appareil'
import { BaseQuanto } from './base'
import {
  creerRecette,
  DUREE_CONSERVATION_MS,
  historique,
  listerCorbeille,
  listerRecettes,
  modifierRecette,
  nettoyer,
  restaurerRecette,
  restaurerVersion,
  supprimerRecette,
} from './recettes'

let db: BaseQuanto

beforeEach(() => {
  db = new BaseQuanto(`test-${crypto.randomUUID()}`)
})

const gateau = () => ({
  ...recetteVide(),
  titre: 'Gâteau au chocolat',
  categorie: 'patisserie' as const,
  reference: { personnes: 6, contenant: { type: 'rond' as const, diametre: 24 } },
  ingredients: [{ id: 'i1', quantite: 200, unite: 'g', nom: 'chocolat noir', recalcul: 'normal' as const }],
})

describe('Stockage des recettes', () => {
  it("donne une identité stable à l'appareil", async () => {
    const a = await obtenirAppareil(db)
    const b = await obtenirAppareil(db)
    expect(a.id).toBe(b.id)
  })

  it('crée une recette avec identifiant, dates et appareil', async () => {
    const r = await creerRecette(db, gateau())
    const appareil = await obtenirAppareil(db)
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(r.modifiePar).toBe(appareil.id)
    expect(r.creeLe).toBe(r.modifieLe)
    expect(await listerRecettes(db)).toHaveLength(1)
  })

  it('refuse une recette sans titre ou avec une unité inconnue', async () => {
    await expect(creerRecette(db, { ...gateau(), titre: '  ' })).rejects.toThrow()
    await expect(
      creerRecette(db, { ...gateau(), ingredients: [{ id: 'x', quantite: 1, unite: 'tasse', nom: 'farine', recalcul: 'normal' }] }),
    ).rejects.toThrow()
  })

  it("garde l'ancienne version dans l'historique et peut la restaurer", async () => {
    const r = await creerRecette(db, gateau())
    const modifiee = await modifierRecette(db, r.id, { titre: 'Fondant au chocolat' })
    expect(modifiee.titre).toBe('Fondant au chocolat')
    expect(modifiee.modifieLe).toBeGreaterThan(r.modifieLe)

    const versions = await historique(db, r.id)
    expect(versions).toHaveLength(1)
    expect(versions[0].contenu.titre).toBe('Gâteau au chocolat')

    const restauree = await restaurerVersion(db, versions[0].num!)
    expect(restauree.titre).toBe('Gâteau au chocolat')
    expect(await historique(db, r.id)).toHaveLength(2)
  })

  it('met à la corbeille puis restaure', async () => {
    const r = await creerRecette(db, gateau())
    await supprimerRecette(db, r.id)
    expect(await listerRecettes(db)).toHaveLength(0)
    expect(await listerCorbeille(db)).toHaveLength(1)

    await restaurerRecette(db, r.id)
    expect(await listerRecettes(db)).toHaveLength(1)
    expect(await listerCorbeille(db)).toHaveLength(0)
  })

  it('efface définitivement après 30 jours, en gardant une trace pour la synchronisation', async () => {
    const r = await creerRecette(db, gateau())
    await modifierRecette(db, r.id, { titre: 'Autre titre' })
    await supprimerRecette(db, r.id)

    // Avant 30 jours : rien n'est effacé.
    expect((await nettoyer(db)).recettes).toBe(0)

    const dans31Jours = Date.now() + DUREE_CONSERVATION_MS + 24 * 60 * 60 * 1000
    const resultat = await nettoyer(db, dans31Jours)
    expect(resultat.recettes).toBe(1)
    expect(await db.recettes.count()).toBe(0)
    expect(await db.versions.count()).toBe(0)
    expect(await db.effacements.get(r.id)).toBeDefined()
  })
})

describe('Mes moules', () => {
  it('mémorise un moule sans doublon, puis l’oublie', async () => {
    const { listerMoules, memoriserMoule, oublierMoule } = await import('./moules')
    await memoriserMoule(db, { type: 'rond', diametre: 22 })
    const m = await memoriserMoule(db, { type: 'rond', diametre: 22 }, 'Moule de mamie')
    expect(await listerMoules(db)).toEqual([{ id: m.id, nom: 'Moule de mamie', contenant: { type: 'rond', diametre: 22 } }])
    await expect(memoriserMoule(db, { type: 'cake', longueur: 26 })).rejects.toThrow()
    await oublierMoule(db, m.id)
    expect(await listerMoules(db)).toEqual([])
  })
})

describe('Carnets', () => {
  it('crée, renomme, range des recettes et supprime sans toucher aux recettes', async () => {
    const { creerCollection, listerCollections, modifierCollection, rangerRecette, supprimerCollection } = await import('./collections')
    const noel = await creerCollection(db, 'Noël')
    const dimanche = await creerCollection(db, 'Desserts du dimanche')
    expect((await listerCollections(db)).map((c) => c.nom)).toEqual(['Noël', 'Desserts du dimanche'])
    expect(noel.couleur).not.toBe(dimanche.couleur)

    await modifierCollection(db, noel.id, { nom: 'Fêtes' })
    const r = await creerRecette(db, gateau())
    await rangerRecette(db, r.id, [noel.id, dimanche.id, noel.id])
    expect((await db.recettes.get(r.id))!.collections).toEqual([noel.id, dimanche.id])
    expect(await historique(db, r.id)).toHaveLength(0)

    await supprimerCollection(db, noel.id)
    expect((await listerCollections(db)).map((c) => c.nom)).toEqual(['Desserts du dimanche'])
    expect(await db.recettes.get(r.id)).toBeDefined()
    expect((await db.collections.get(noel.id))!.supprimeLe).toBeDefined() // trace pour la synchronisation
  })
})
