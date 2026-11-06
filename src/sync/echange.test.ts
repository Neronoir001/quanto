import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { recetteVide } from '../domaine/modele'
import { BaseQuanto } from '../donnees/base'
import { creerRecette, DUREE_CONSERVATION_MS, historique, modifierRecette, nettoyer, supprimerRecette } from '../donnees/recettes'
import { appliquerPaquet, inventaire, lirePaquet, paquetDepuis, paquetPour } from './echange'

let a: BaseQuanto
let b: BaseQuanto

beforeEach(() => {
  a = new BaseQuanto(`a-${crypto.randomUUID()}`)
  b = new BaseQuanto(`b-${crypto.randomUUID()}`)
})

const recette = (titre: string) => ({ ...recetteVide(), titre })

/** Synchronisation dans les deux sens, comme le fait le Wi-Fi. */
async function synchroniser(x: BaseQuanto, y: BaseQuanto) {
  const [invX, invY] = await Promise.all([inventaire(x), inventaire(y)])
  const [pourY, pourX] = await Promise.all([paquetPour(x, invY), paquetPour(y, invX)])
  const [resY, resX] = await Promise.all([appliquerPaquet(y, pourY), appliquerPaquet(x, pourX)])
  return { envoyesParX: pourY.recettes.length, envoyesParY: pourX.recettes.length, resX, resY }
}

const titres = async (db: BaseQuanto) => (await db.recettes.toArray()).filter((r) => !r.supprimeLe).map((r) => r.titre).sort()
const attendre = () => new Promise((ok) => setTimeout(ok, 5))

describe('Synchronisation entre deux appareils', () => {
  it('réunit les recettes des deux appareils, sans doublon', async () => {
    await creerRecette(a, recette('Crêpes'))
    await creerRecette(b, recette('Gaufres'))
    const r = await synchroniser(a, b)
    expect(r.resX.nouvelles).toBe(1)
    expect(r.resY.nouvelles).toBe(1)
    expect(await titres(a)).toEqual(['Crêpes', 'Gaufres'])
    expect(await titres(b)).toEqual(['Crêpes', 'Gaufres'])

    // Une seconde synchronisation n'échange plus rien.
    const encore = await synchroniser(a, b)
    expect(encore.envoyesParX + encore.envoyesParY).toBe(0)
  })

  it('garde la version la plus récente et met l’autre dans l’historique', async () => {
    const r = await creerRecette(a, recette('Tarte'))
    await synchroniser(a, b)
    await modifierRecette(a, r.id, { titre: 'Tarte aux pommes' })
    await attendre()
    await modifierRecette(b, r.id, { titre: 'Tarte aux poires' })
    await synchroniser(a, b)

    expect(await titres(a)).toEqual(['Tarte aux poires'])
    expect(await titres(b)).toEqual(['Tarte aux poires'])
    const versionsA = await historique(a, r.id)
    expect(versionsA.map((v) => v.contenu.titre)).toContain('Tarte aux pommes')
  })

  it('propage la mise à la corbeille', async () => {
    const r = await creerRecette(a, recette('Soupe'))
    await synchroniser(a, b)
    await supprimerRecette(b, r.id)
    const res = await synchroniser(a, b)
    expect(res.resX.supprimees).toBe(1)
    expect(await titres(a)).toEqual([])
    expect((await a.recettes.get(r.id))?.supprimeLe).toBeDefined()
  })

  it('ne fait jamais revenir une recette effacée définitivement', async () => {
    const r = await creerRecette(a, recette('Quiche'))
    await synchroniser(a, b)
    await supprimerRecette(a, r.id)
    await nettoyer(a, Date.now() + DUREE_CONSERVATION_MS + 1000)
    // B a toujours la recette (pas encore synchronisé) : elle ne doit pas revenir sur A.
    await synchroniser(a, b)
    expect(await a.recettes.get(r.id)).toBeUndefined()
    expect(await b.recettes.get(r.id)).toBeUndefined()
    expect(await b.effacements.get(r.id)).toBeDefined()
  })

  it('n’envoie que les nouveautés depuis une date (fichier « nouveautés »)', async () => {
    await creerRecette(a, recette('Ancienne'))
    await attendre()
    const depuis = Date.now()
    await attendre()
    await creerRecette(a, recette('Nouvelle'))
    const p = await paquetDepuis(a, depuis)
    expect(p.recettes.map((r) => r.titre)).toEqual(['Nouvelle'])
    expect((await paquetDepuis(a)).recettes).toHaveLength(2)
  })

  it('écarte les recettes invalides d’un paquet reçu', () => {
    const { paquet, ignorees } = lirePaquet({ recettes: [{ titre: 'incomplète' }], collections: [], effacements: [], photos: [] })
    expect(paquet.recettes).toHaveLength(0)
    expect(ignorees).toBe(1)
    expect(() => lirePaquet({ nimporte: 'quoi' })).toThrow()
  })
})
