// Copie les fichiers de la reconnaissance de texte (OCR) dans public/ocr/,
// pour qu'ils soient servis par Quanto elle-même : aucun appel à un service extérieur.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const cible = join(racine, 'public', 'ocr')
mkdirSync(cible, { recursive: true })

const fichiers = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  // Données du français, version compacte et précise (« best_int »).
  ['node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz', 'fra.traineddata.gz'],
]

for (const [source, nom] of fichiers) {
  const chemin = join(racine, source)
  if (!existsSync(chemin)) throw new Error(`Fichier OCR introuvable : ${source}`)
  copyFileSync(chemin, join(cible, nom))
}
console.log(`OCR : ${fichiers.length} fichiers copiés dans public/ocr/`)
