// Génère les captures d'écran du guide (public/aide/) et le guide PDF
// (../Guide-utilisateur-Quanto.pdf), à partir de src/aide/contenu.ts.
// Prérequis : le serveur de développement tourne (npm run dev) ; Microsoft Edge est installé.
// Utilisation : node scripts/guide.mjs
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { SECTIONS } from '../src/aide/contenu.ts'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const ADRESSE = process.env.QUANTO_URL ?? 'http://localhost:5173/quanto/'
const EDGE = process.env.EDGE ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const IMAGES = join(racine, 'public', 'aide')
const PDF = join(racine, '..', 'Guide-utilisateur-Quanto.pdf')
const version = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8')).version.replace(/\.0$/, '')
mkdirSync(IMAGES, { recursive: true })

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms))
const navigateur = await chromium.launch({ executablePath: EDGE, headless: true })

// ————————————————————————————————————————————————————————————————
// 1. Captures d'écran, au format téléphone, sur un jeu de démonstration
// ————————————————————————————————————————————————————————————————
const telephone = await navigateur.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
  colorScheme: 'light',
})
const page = await telephone.newPage()
await page.goto(ADRESSE)
await page.waitForSelector('text=Bienvenue dans')

const ids = await page.evaluate(async () => {
  const { base } = await import('/quanto/src/donnees/base.ts')
  const { ajouterExemples } = await import('/quanto/src/donnees/exemples.ts')
  const { listerRecettes, modifierRecette } = await import('/quanto/src/donnees/recettes.ts')
  const { enregistrerPhoto } = await import('/quanto/src/donnees/photos.ts')
  const { creerCollection, rangerRecette } = await import('/quanto/src/donnees/collections.ts')
  const { memoriserMoule } = await import('/quanto/src/donnees/moules.ts')
  const { renommerAppareil, obtenirAppareil } = await import('/quanto/src/donnees/appareil.ts')

  await obtenirAppareil(base)
  await renommerAppareil(base, 'iPhone')
  await ajouterExemples(base)
  await base.reglages.put({ cle: 'derniereSauvegarde', valeur: Date.now() })

  // Photos d'illustration dessinées (dégradés aux couleurs de Quanto).
  const dessiner = async (titre, couleurs) => {
    const c = document.createElement('canvas')
    c.width = 1200
    c.height = 900
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 1200, 900)
    couleurs.forEach((coul, i) => g.addColorStop(i / (couleurs.length - 1), coul))
    x.fillStyle = g
    x.fillRect(0, 0, 1200, 900)
    for (let i = 0; i < 26; i++) {
      x.beginPath()
      x.fillStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.015})`
      x.arc((i * 211) % 1200, (i * 137) % 900, 40 + ((i * 53) % 160), 0, Math.PI * 2)
      x.fill()
    }
    x.fillStyle = 'rgba(255,253,249,0.92)'
    x.font = 'italic 600 92px "Playfair Display Variable", Georgia, serif'
    x.textAlign = 'center'
    x.fillText(titre, 600, 470)
    return enregistrerPhoto(base, await new Promise((ok) => c.toBlob(ok, 'image/png')))
  }
  const recettes = await listerRecettes(base)
  const par = (t) => recettes.find((r) => r.titre === t)
  const fondant = par('Fondant au chocolat')
  const crepes = par('Crêpes de la Chandeleur')
  const veloute = par('Velouté de potiron')
  await modifierRecette(base, fondant.id, { photoId: await dessiner('Fondant', ['#3b2219', '#7a3b22', '#c4643b']), favori: true }, { historiser: false })
  await modifierRecette(base, crepes.id, { photoId: await dessiner('Crêpes', ['#c9a45c', '#e8c98a', '#f6ecd6']) }, { historiser: false })
  await modifierRecette(base, veloute.id, { photoId: await dessiner('Velouté', ['#a84f2d', '#d9774d', '#e9a45c']) }, { historiser: false })

  const dimanche = await creerCollection(base, 'Desserts du dimanche')
  const mamie = await creerCollection(base, 'Recettes de mamie')
  await creerCollection(base, 'Noël')
  await rangerRecette(base, fondant.id, [dimanche.id, mamie.id])
  await rangerRecette(base, crepes.id, [dimanche.id])
  await memoriserMoule(base, { type: 'rond', diametre: 22 }, 'Moule de mamie')
  return { fondant: fondant.id }
})

async function capture(nom, preparer) {
  await preparer()
  await pause(900)
  await page.screenshot({ path: join(IMAGES, nom), type: 'jpeg', quality: 80 })
  console.log(`  capture : ${nom}`)
}
const aller = async (chemin) => {
  await page.goto(`${ADRESSE}#${chemin}`)
  await pause(1200)
}
const defilerVers = (selecteur, decalage = 80) =>
  page.evaluate(
    ([s, d]) => {
      const el = document.querySelector(s)
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - d)
    },
    [selecteur, decalage],
  )
/** Choisit le recalcul affiché par la fiche, puis la quitte pour qu'elle le relise à la prochaine ouverture. */
const memoriserRecalcul = async (cible) => {
  await page.evaluate(([id, c]) => sessionStorage.setItem(`quanto.recalcul.${id}`, JSON.stringify(c)), [ids.fondant, cible])
  await aller('/reglages')
}

console.log('Captures d’écran…')
await capture('liste.jpg', () => aller('/'))
await capture('fiche.jpg', async () => {
  await memoriserRecalcul({ mode: 'personnes', personnes: 9 })
  await aller(`/recette/${ids.fondant}`)
  await defilerVers('#titre-recalcul', 90)
})
await capture('recalcul-moule.jpg', async () => {
  await memoriserRecalcul({ mode: 'contenant', contenant: { type: 'cake', longueur: 26, largeur: 10, hauteur: 8 } })
  await aller(`/recette/${ids.fondant}`)
  await defilerVers('#titre-recalcul', 90)
})
await capture('menu-fiche.jpg', async () => {
  await memoriserRecalcul({ mode: 'personnes', personnes: 6 })
  await aller(`/recette/${ids.fondant}`)
  await page.click('button[aria-label="Plus d\'actions"]')
})
await capture('formulaire-etapes.jpg', async () => {
  await aller(`/recette/${ids.fondant}/modifier`)
  await pause(800)
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent === 'Préparation')
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 80)
  })
})
await capture('importer.jpg', () => aller('/importer'))
await capture('apercu-import.jpg', async () => {
  await aller('/importer')
  await page.click('text=Coller un texte')
  await page.fill('textarea', 'Gâteau au yaourt\nPréparation : 10 min\nCuisson : 35 min\nIngrédients (pour 6 personnes)\n1 pot de yaourt nature\n3 pots de farine\n2 pots de sucre\n3 œufs\nPréparation\n1. Préchauffez le four à 180 °C.\n2. Mélangez le yaourt avec 2 pots de sucre et 3 œufs.')
  await page.click('text=Analyser le texte')
  await pause(500)
  await page.evaluate(() => window.scrollTo(0, 0))
})
await capture('mode-cuisine.jpg', async () => {
  await aller(`/recette/${ids.fondant}/cuisine`)
  for (let i = 0; i < 4; i++) {
    await page.click('text=Suivante')
    await pause(350)
  }
  await page.click('text=Minuteur 25 min')
  await pause(1500)
})
await capture('synchro.jpg', async () => {
  await aller('/synchro')
  await page.click('text=Afficher un code')
  await pause(600)
  await defilerVers('h2', 90)
})
await capture('carnets.jpg', () => aller('/carnets'))
await capture('reglages.jpg', async () => {
  await aller('/reglages')
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent === 'Apparence')
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 90)
  })
})
await telephone.close()

// ————————————————————————————————————————————————————————————————
// 2. Guide PDF
// ————————————————————————————————————————————————————————————————
console.log('Guide PDF…')
const enBase64 = (chemin, type) => `data:${type};base64,${readFileSync(chemin).toString('base64')}`
const police = (paquet, fichier) => enBase64(join(racine, 'node_modules', '@fontsource-variable', paquet, 'files', fichier), 'font/woff2')
const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const texte = (t) => echapper(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

function bloc(b) {
  if ('p' in b) return `<p>${texte(b.p)}</p>`
  if ('sousTitre' in b) return `<h3>${echapper(b.sousTitre)}</h3>`
  if ('liste' in b) {
    const t = b.numerotee ? 'ol' : 'ul'
    return `<${t}>${b.liste.map((e) => `<li>${texte(e)}</li>`).join('')}</${t}>`
  }
  if ('astuce' in b) return `<div class="encadre astuce"><b>Astuce</b>${texte(b.astuce)}</div>`
  if ('attention' in b) return `<div class="encadre attention"><b>Important</b>${texte(b.attention)}</div>`
  if ('image' in b)
    return `<figure><img src="${enBase64(join(IMAGES, b.image), 'image/jpeg')}" alt=""><figcaption>${texte(b.legende)}</figcaption></figure>`
  return `<table><thead><tr>${b.tableau.entetes.map((e) => `<th>${echapper(e)}</th>`).join('')}</tr></thead><tbody>${b.tableau.lignes
    .map((l) => `<tr>${l.map((c) => `<td>${echapper(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`
}

const logo = readFileSync(join(racine, 'public', 'logo.svg'), 'utf8')
const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Quanto — Guide d'utilisation</title><style>
@font-face { font-family: Inter; src: url(${police('inter', 'inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Playfair; src: url(${police('playfair-display', 'playfair-display-latin-wght-normal.woff2')}) format('woff2'); font-weight: 400 900; }
@page { size: A4; margin: 18mm 17mm 20mm; }
* { box-sizing: border-box; }
body { font-family: Inter, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #2b2420; margin: 0; }
h1, h2, h3 { font-family: Playfair, Georgia, serif; color: #2b2420; line-height: 1.2; }
strong { font-weight: 650; color: #2b2420; }
.couverture { height: 245mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #fbf7f0; border-radius: 10mm; }
.couverture svg { width: 38mm; height: 38mm; }
.couverture h1 { font-size: 46pt; margin: 10mm 0 2mm; }
.couverture .sous { font-family: Playfair, serif; font-style: italic; font-size: 18pt; color: #a84f2d; }
.couverture .info { margin-top: 18mm; color: #6b5e55; }
.sommaire { break-before: page; }
.sommaire h2 { font-size: 24pt; }
.sommaire ol { padding-left: 0; list-style: none; counter-reset: s; }
.sommaire li { counter-increment: s; display: flex; gap: 4mm; padding: 2.4mm 0; border-bottom: 0.3mm solid #e9dfd0; }
.sommaire li::before { content: counter(s); font-family: Playfair, serif; font-weight: 700; color: #a84f2d; width: 7mm; }
.sommaire li span { color: #6b5e55; margin-left: auto; font-size: 9pt; }
section { break-before: page; }
section h2 { font-size: 22pt; margin: 0 0 5mm; padding-bottom: 3mm; border-bottom: 0.6mm solid #c9a45c; }
section h2 em { font-style: normal; color: #a84f2d; margin-right: 3mm; }
h3 { font-size: 13pt; margin: 6mm 0 2mm; break-after: avoid; }
p { margin: 0 0 3mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1.5mm; }
li::marker { color: #a84f2d; }
.encadre { padding: 3mm 4mm; border-radius: 3mm; margin: 3mm 0 4mm; break-inside: avoid; }
.encadre b { display: block; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1mm; }
.astuce { background: #e7ecdf; } .astuce b { color: #5b6b4e; }
.attention { background: #f6ecd6; } .attention b { color: #a84f2d; }
figure { margin: 4mm auto 5mm; text-align: center; break-inside: avoid; }
figure img { width: 62mm; border-radius: 4mm; border: 0.3mm solid #e9dfd0; box-shadow: 0 1mm 3mm rgba(0,0,0,0.08); }
figcaption { font-size: 8.5pt; color: #6b5e55; margin-top: 2mm; font-style: italic; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; break-inside: avoid; }
th { text-align: left; border-bottom: 0.6mm solid #c9a45c; padding: 1.5mm 2mm; }
td { border-bottom: 0.3mm solid #e9dfd0; padding: 1.5mm 2mm; vertical-align: top; }
td:first-child { font-weight: 600; white-space: nowrap; }
</style></head><body>
<div class="couverture">${logo}<h1>Quanto</h1><div class="sous">Guide d'utilisation</div>
<div class="info">Vos recettes, à la bonne mesure.<br>Version ${version} · ${date}</div></div>
<div class="sommaire"><h2>Sommaire</h2><ol>${SECTIONS.map((s) => `<li>${echapper(s.titre)}<span>${echapper(s.resume)}</span></li>`).join('')}</ol></div>
${SECTIONS.map((s, i) => `<section><h2><em>${i + 1}.</em>${echapper(s.titre)}</h2>${s.blocs.map(bloc).join('\n')}</section>`).join('\n')}
</body></html>`

const documentPdf = await navigateur.newPage()
await documentPdf.setContent(html, { waitUntil: 'load' })
await documentPdf.evaluate(() => document.fonts.ready)
await documentPdf.pdf({
  path: PDF,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-family:sans-serif;font-size:8px;color:#8a7d73;width:100%;text-align:center;">Quanto · Guide d’utilisation — page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>',
  margin: { top: '18mm', bottom: '20mm', left: '17mm', right: '17mm' },
})
await navigateur.close()
console.log(`Guide PDF : ${PDF}`)
