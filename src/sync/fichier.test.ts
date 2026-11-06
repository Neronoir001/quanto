import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { recetteVide } from '../domaine/modele'
import { BaseQuanto } from '../donnees/base'
import { creerRecette } from '../donnees/recettes'
import { dateDerniereSauvegarde, exporterCarnet, importerFichier, noterEnvoi } from './fichier'

let a: BaseQuanto
let b: BaseQuanto

beforeEach(() => {
  a = new BaseQuanto(`fa-${crypto.randomUUID()}`)
  b = new BaseQuanto(`fb-${crypto.randomUUID()}`)
})

describe('Fichier du carnet', () => {
  it('transfère recettes et photos d’un appareil à l’autre', async () => {
    const photo = { id: 'p1', image: new Blob(['IMAGE'], { type: 'image/webp' }), miniature: new Blob(['MINI'], { type: 'image/webp' }), modifieLe: 1 }
    await a.photos.add(photo)
    await creerRecette(a, { ...recetteVide(), titre: 'Clafoutis', photoId: 'p1' })

    const { fichier, recettes } = await exporterCarnet(a, 'complet')
    expect(recettes).toBe(1)
    expect(fichier.name).toMatch(/^Quanto - carnet complet - \d{4}-\d{2}-\d{2}\.zip$/)

    const resultat = await importerFichier(b, fichier)
    expect(resultat).toMatchObject({ nouvelles: 1, photos: 1, ignorees: 0 })
    expect((await b.recettes.toArray())[0].titre).toBe('Clafoutis')
    expect(await (await b.photos.get('p1'))!.image.text()).toBe('IMAGE')

    // Importer deux fois le même fichier ne crée pas de doublon.
    expect((await importerFichier(b, fichier)).nouvelles).toBe(0)
    expect(await b.recettes.count()).toBe(1)
  })

  it('n’exporte que les nouveautés depuis le dernier envoi', async () => {
    await creerRecette(a, { ...recetteVide(), titre: 'Avant' })
    await noterEnvoi(a, 'complet')
    expect(await dateDerniereSauvegarde(a)).toBeDefined()
    await new Promise((ok) => setTimeout(ok, 5))
    await creerRecette(a, { ...recetteVide(), titre: 'Après' })
    const { recettes } = await exporterCarnet(a, 'nouveautes')
    expect(recettes).toBe(1)
  })

  it('refuse un fichier qui n’est pas un carnet', async () => {
    await expect(importerFichier(b, new Blob(['bonjour']))).rejects.toThrow("n'est pas un carnet Quanto")
    await expect(importerFichier(b, new Blob([JSON.stringify({ format: 'autre' })]))).rejects.toThrow()
  })
})

describe('Export d’une sélection', () => {
  it('n’exporte que les recettes choisies, avec leurs carnets', async () => {
    const { exporterRecettes, exporterJson } = await import('./fichier')
    const { creerCollection, rangerRecette } = await import('../donnees/collections')
    const noel = await creerCollection(a, 'Noël')
    const buche = await creerRecette(a, { ...recetteVide(), titre: 'Bûche' })
    await creerRecette(a, { ...recetteVide(), titre: 'Autre' })
    await rangerRecette(a, buche.id, [noel.id])

    const fichier = await exporterRecettes(a, [buche.id], 'Noël : desserts')
    expect(fichier.name).toBe('Quanto - Noël desserts.zip')
    const r = await importerFichier(b, fichier)
    expect(r.nouvelles).toBe(1)
    expect((await b.collections.toArray()).map((c) => c.nom)).toEqual(['Noël'])

    const json = JSON.parse(await (await exporterJson(a, [buche.id], 'Bûche')).text())
    expect(json.recettes.map((x: { titre: string }) => x.titre)).toEqual(['Bûche'])
  })
})
