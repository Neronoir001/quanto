/**
 * Lecture de documents sur l'appareil : PDF (pdf.js) et photos (reconnaissance de texte, Tesseract).
 * Les bibliothèques ne sont chargées qu'au moment où on s'en sert.
 */

export type Progression = (etape: string, avancement?: number) => void

/** Lit le texte d'une image (photo, page scannée). */
export async function lireImage(source: Blob | HTMLCanvasElement, progression?: Progression): Promise<string> {
  const { createWorker, OEM } = await import('tesseract.js')
  const dossier = `${import.meta.env.BASE_URL}ocr/`
  const libelles: Record<string, string> = {
    'loading tesseract core': 'Préparation de la lecture…',
    'initializing tesseract': 'Préparation de la lecture…',
    'loading language traineddata': 'Chargement du français…',
    'initializing api': 'Préparation de la lecture…',
    'recognizing text': 'Lecture du texte…',
  }
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: `${dossier}worker.min.js`,
    corePath: dossier,
    langPath: dossier,
    logger: (m: { status: string; progress: number }) => progression?.(libelles[m.status] ?? 'Lecture…', m.progress),
  })
  try {
    const { data } = await worker.recognize(source)
    return data.text
  } finally {
    await worker.terminate()
  }
}

/** Lit le texte d'un PDF. Un PDF scanné (sans texte) est lu page par page comme une photo. */
export async function lirePdf(fichier: Blob, progression?: Progression): Promise<string> {
  progression?.('Ouverture du PDF…')
  const pdfjs = await import('pdfjs-dist')
  const { default: urlTravailleur } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = urlTravailleur
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise

  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const contenu = await page.getTextContent()
    let texte = ''
    for (const item of contenu.items) {
      if (!('str' in item)) continue
      texte += item.str + (item.hasEOL ? '\n' : '')
    }
    pages.push(texte)
  }
  const texte = pages.join('\n')
  if (texte.replace(/\s/g, '').length >= 40) return texte

  // PDF scanné : on lit l'image des pages (5 au plus).
  const lus: string[] = []
  const nb = Math.min(doc.numPages, 5)
  for (let n = 1; n <= nb; n++) {
    progression?.(`Page ${n} sur ${nb} : lecture de l'image…`)
    const page = await doc.getPage(n)
    const vue = page.getViewport({ scale: 2 })
    const toile = document.createElement('canvas')
    toile.width = vue.width
    toile.height = vue.height
    await page.render({ canvas: toile, viewport: vue }).promise
    lus.push(await lireImage(toile, (etape, av) => progression?.(`Page ${n} sur ${nb} : ${etape.toLowerCase()}`, av)))
  }
  return lus.join('\n')
}

/**
 * Prépare une photo pour la lecture : recadrage, rotation, niveaux de gris et contraste renforcé.
 * `cadre` est exprimé en fractions de l'image (0 à 1).
 */
export async function preparerImage(
  source: Blob,
  rotation: 0 | 90 | 180 | 270,
  cadre: { x: number; y: number; l: number; h: number } = { x: 0, y: 0, l: 1, h: 1 },
): Promise<HTMLCanvasElement> {
  const image = await createImageBitmap(source)
  const sx = Math.round(cadre.x * image.width)
  const sy = Math.round(cadre.y * image.height)
  const sl = Math.max(1, Math.round(cadre.l * image.width))
  const sh = Math.max(1, Math.round(cadre.h * image.height))
  // Assez grand pour être lisible, sans dépasser 2 500 px (lecture plus rapide).
  const echelle = Math.min(2500 / Math.max(sl, sh), Math.max(1, 1400 / Math.max(sl, sh)))
  const largeur = Math.round(sl * echelle)
  const hauteur = Math.round(sh * echelle)
  const tourne = rotation === 90 || rotation === 270
  const toile = document.createElement('canvas')
  toile.width = tourne ? hauteur : largeur
  toile.height = tourne ? largeur : hauteur
  const ctx = toile.getContext('2d')!
  ctx.translate(toile.width / 2, toile.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.filter = 'grayscale(1) contrast(1.35)'
  ctx.drawImage(image, sx, sy, sl, sh, -largeur / 2, -hauteur / 2, largeur, hauteur)
  image.close()
  return toile
}

/** Tourne une photo d'un quart de tour (avant recadrage). */
export async function tournerImage(source: Blob, sens: 90 | -90): Promise<Blob> {
  const image = await createImageBitmap(source)
  const toile = document.createElement('canvas')
  toile.width = image.height
  toile.height = image.width
  const ctx = toile.getContext('2d')!
  ctx.translate(toile.width / 2, toile.height / 2)
  ctx.rotate((sens * Math.PI) / 180)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  image.close()
  return new Promise((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error('Rotation impossible'))), 'image/jpeg', 0.92))
}

/** Découpe une photo selon un cadre (en fractions de l'image), en pleine qualité. */
export async function recadrerImage(source: Blob, cadre: { x: number; y: number; l: number; h: number }): Promise<Blob> {
  const image = await createImageBitmap(source)
  const sx = Math.round(cadre.x * image.width)
  const sy = Math.round(cadre.y * image.height)
  const sl = Math.max(1, Math.round(cadre.l * image.width))
  const sh = Math.max(1, Math.round(cadre.h * image.height))
  const toile = document.createElement('canvas')
  toile.width = sl
  toile.height = sh
  toile.getContext('2d')!.drawImage(image, sx, sy, sl, sh, 0, 0, sl, sh)
  image.close()
  return new Promise((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error('Recadrage impossible'))), 'image/jpeg', 0.92))
}
