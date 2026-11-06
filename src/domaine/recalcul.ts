import { type Contenant, ratioContenants } from './contenants'
import { arrondirAu, enQuarts, INSECABLE, nombre } from './format'
import { libelle, unite, type Unite } from './unites'

/**
 * Moteur de recalcul de Quanto : le cœur de l'application.
 * Voir le cahier des charges, § 6.4 et annexe A.
 */

/** Une quantité à recalculer : ligne d'ingrédient ou quantité balisée dans une étape. */
export interface QuantiteSource {
  valeur?: number
  /** Borne haute d'une fourchette saisie (« 2 à 3 »). */
  valeurMax?: number
  unite: string
  /** « fixe » : jamais recalculée (zeste, pincée de piment…). */
  recalcul?: 'normal' | 'fixe'
  /** Nom de l'ingrédient : sert aux œufs (équivalent en grammes) et aux assaisonnements. */
  nom?: string
}

export interface QuantiteCalculee {
  /** Texte à afficher : « 200 g », « 2 à 3 », « 1 sachet ½ », « 1 pincée ». */
  texte: string
  /** Vrai si le texte diffère de la recette d'origine (pour la mise en évidence). */
  modifiee: boolean
  /** Vrai si la valeur a dû être approchée (fourchette, minimum). */
  approximative: boolean
  /** Équivalent utile : « ≈ 117 g battus ». */
  equivalent?: string
  /** Remarque : « à ajuster », « quantité fixe », « à doser selon le goût ». */
  note?: string
  /** Pour les pièces : nombre affiché (borne haute d'une fourchette), pour accorder le nom. */
  nombrePieces?: number
}

// ————————————————————————————————————————————————————————————————
// Rendu d'une valeur dans sa famille d'unités
// ————————————————————————————————————————————————————————————————

interface Rendu {
  /** Partie numérique : « 200 », « 1,2 », « 1 ½ ». */
  nombre: string
  /** Unité affichée, déjà accordée : « g », « L », « sachets », « » pour une pièce. */
  unite: string
  /** Conditionnement avec demi : s'affiche « 1 sachet ½ ». */
  demiApres?: boolean
  approximative: boolean
}

/** Grammes ou millilitres : 0,5 sous 10 ; à l'unité jusqu'à 100 ; par 5 au-delà. */
function arrondiFin(v: number): { valeur: number; approchee: boolean } {
  const pas = v < 10 ? 0.5 : v <= 100 ? 1 : 5
  const r = arrondirAu(v, pas)
  return r > 0 ? { valeur: r, approchee: false } : { valeur: pas, approchee: true }
}

function rendreMasse(grammes: number): Rendu {
  if (grammes >= 999.5) return { nombre: nombre(arrondirAu(grammes / 1000, 0.01), 2), unite: 'kg', approximative: false }
  const { valeur, approchee } = arrondiFin(grammes)
  if (valeur >= 1000) return { nombre: '1', unite: 'kg', approximative: false }
  return { nombre: nombre(valeur, 1), unite: 'g', approximative: approchee }
}

function rendreVolume(ml: number, uniteOrigine: Unite): Rendu {
  const litres = { nombre: nombre(arrondirAu(ml / 1000, 0.01), 2), unite: 'L', approximative: false }
  if (ml >= 999.5) return litres
  // Sous le litre, on garde l'unité d'origine (les litres deviennent des centilitres : « 40 cl »).
  const affichage = uniteOrigine.id === 'l' ? unite('cl') : uniteOrigine
  if (affichage.id === 'ml') {
    const { valeur, approchee } = arrondiFin(ml)
    return valeur >= 1000 ? litres : { nombre: nombre(valeur, 1), unite: 'ml', approximative: approchee }
  }
  // Centilitres et décilitres : au demi sous 10, à l'unité au-delà (« 17 cl » plutôt que « 17,4 cl »).
  const brut = ml / affichage.facteur
  const v = arrondirAu(brut, brut < 10 ? 0.5 : 1)
  if (v * affichage.facteur >= 1000) return litres
  if (v === 0) return { nombre: '0,5', unite: affichage.singulier, approximative: true }
  return { nombre: nombre(v, 1), unite: affichage.singulier, approximative: false }
}

function rendreCuillere(cac: number): Rendu {
  // 3 càc = 1 càs : au-delà, on passe en cuillères à soupe.
  if (arrondirAu(cac, 0.25) >= 3) {
    const cas = Math.max(arrondirAu(cac / 3, 0.25), 1)
    return { nombre: enQuarts(cas), unite: 'càs', approximative: false }
  }
  const v = arrondirAu(cac, 0.25)
  return v > 0
    ? { nombre: enQuarts(v), unite: 'càc', approximative: false }
    : { nombre: '¼', unite: 'càc', approximative: true }
}

function rendreConditionnement(v: number, u: Unite): Rendu {
  const r = Math.max(arrondirAu(v, 0.5), 0.5)
  const entier = Math.floor(r)
  const demi = r - entier === 0.5
  if (demi && entier >= 1) return { nombre: String(entier), unite: libelle(u, entier), demiApres: true, approximative: r !== v }
  return { nombre: enQuarts(r), unite: libelle(u, r), approximative: r !== v }
}

/** Pièce isolée (borne d'une fourchette saisie) : entier le plus proche, minimum 1. */
function rendrePieceEntiere(v: number, u: Unite): Rendu {
  const r = Math.max(Math.round(v), 1)
  return { nombre: String(r), unite: libelle(u, r), approximative: r !== v }
}

function assembler(r: Rendu): string {
  if (r.demiApres) return `${r.nombre}${INSECABLE}${r.unite}${INSECABLE}½`
  return r.unite ? `${r.nombre}${INSECABLE}${r.unite}` : r.nombre
}

function assemblerFourchette(a: Rendu, b: Rendu): string {
  if (a.unite === b.unite && !a.demiApres && !b.demiApres) {
    return b.unite ? `${a.nombre} à ${b.nombre}${INSECABLE}${b.unite}` : `${a.nombre} à ${b.nombre}`
  }
  return `${assembler(a)} à ${assembler(b)}`
}

function rendre(v: number, u: Unite): Rendu {
  switch (u.famille) {
    case 'masse':
      return rendreMasse(v * u.facteur)
    case 'volume':
      return rendreVolume(v * u.facteur, u)
    case 'cuillere':
      return rendreCuillere(v * u.facteur)
    case 'conditionnement':
      return rendreConditionnement(v, u)
    case 'piece':
      return rendrePieceEntiere(v, u)
    case 'non-mesurable':
      return { nombre: enQuarts(v), unite: libelle(u, v), approximative: false }
  }
}

// ————————————————————————————————————————————————————————————————
// Œufs et assaisonnements
// ————————————————————————————————————————————————————————————————

/** Masse moyenne sans coquille. */
function grammesParOeuf(nom: string): { grammes: number; suffixe: string } | null {
  const n = nom.toLowerCase()
  if (!/(œuf|oeuf)/.test(n)) return null
  if (/jaune/.test(n)) return { grammes: 20, suffixe: '' }
  if (/blanc/.test(n)) return { grammes: 30, suffixe: '' }
  return { grammes: 50, suffixe: ' battus' }
}

const ASSAISONNEMENTS =
  /\b(sel|fleur de sel|poivre|piment|épices?|levure|bicarbonate|cannelle|muscade|curry|paprika|cumin|gingembre|safran|cayenne|tabasco)\b/i

export const SEUILS_ASSAISONNEMENT = { bas: 0.7, haut: 1.5 }

// ————————————————————————————————————————————————————————————————
// Recalcul d'une quantité
// ————————————————————————————————————————————————————————————————

function texteSimple(
  q: QuantiteSource,
  ratio: number,
  u: Unite,
): { texte: string; approximative: boolean; equivalent?: string; nombrePieces?: number } {
  const valeur = (q.valeur ?? 0) * ratio

  // Pièces sans fourchette saisie : fourchette « 2 à 3 » si on tombe entre deux.
  if (u.famille === 'piece' && q.valeurMax === undefined) {
    const entier = Math.floor(valeur + 1e-9)
    const reste = valeur - entier
    const oeuf = q.nom ? grammesParOeuf(q.nom) : null
    let texte: string
    let approximative: boolean
    let nombrePieces: number
    if (valeur < 1) {
      texte = `1${u.singulier ? INSECABLE + u.singulier : ''}`
      approximative = valeur < 0.95
      nombrePieces = 1
    } else if (reste >= 0.25 && reste <= 0.75) {
      texte = assemblerFourchette(
        { nombre: String(entier), unite: libelle(u, entier + 1), approximative: true },
        { nombre: String(entier + 1), unite: libelle(u, entier + 1), approximative: true },
      )
      approximative = true
      nombrePieces = entier + 1
    } else {
      const r = Math.round(valeur)
      texte = assembler({ nombre: String(r), unite: libelle(u, r), approximative: false })
      approximative = Math.abs(r - valeur) > 0.05
      nombrePieces = r
    }
    const equivalent =
      oeuf && approximative ? `≈${INSECABLE}${nombre(Math.round(valeur * oeuf.grammes), 0)}${INSECABLE}g${oeuf.suffixe}` : undefined
    return { texte, approximative, equivalent, nombrePieces }
  }

  const bas = rendre(valeur, u)
  const pieces = (r: Rendu) => (u.famille === 'piece' ? Number(r.nombre) : undefined)
  if (q.valeurMax === undefined) return { texte: assembler(bas), approximative: bas.approximative, nombrePieces: pieces(bas) }
  const haut = rendre(q.valeurMax * ratio, u)
  return {
    texte: assemblerFourchette(bas, haut),
    approximative: bas.approximative || haut.approximative,
    nombrePieces: pieces(haut),
  }
}

/**
 * Recalcule une quantité avec le coefficient donné (1 = recette d'origine).
 */
export function recalculerQuantite(q: QuantiteSource, ratio: number): QuantiteCalculee {
  const u = unite(q.unite)
  const change = Math.abs(ratio - 1) > 1e-9

  // Pas de valeur saisie (« sel », « poivre ») : seule l'unité s'affiche.
  if (q.valeur === undefined) {
    const texte = u.famille === 'non-mesurable' ? u.singulier : ''
    return { texte, modifiee: false, approximative: false, note: change && texte ? 'à ajuster' : undefined }
  }

  const origine = texteSimple(q, 1, u)

  if (u.famille === 'non-mesurable') {
    return { texte: origine.texte, modifiee: false, approximative: false, note: change ? 'à ajuster' : undefined }
  }
  if (q.recalcul === 'fixe') {
    return {
      texte: origine.texte,
      modifiee: false,
      approximative: false,
      note: change ? 'quantité fixe' : undefined,
      nombrePieces: origine.nombrePieces,
    }
  }

  const calcul = texteSimple(q, ratio, u)
  const assaisonnement =
    q.nom !== undefined &&
    ASSAISONNEMENTS.test(q.nom) &&
    (ratio > SEUILS_ASSAISONNEMENT.haut || ratio < SEUILS_ASSAISONNEMENT.bas)

  return {
    texte: calcul.texte,
    modifiee: calcul.texte !== origine.texte,
    approximative: calcul.approximative,
    equivalent: calcul.equivalent,
    note: assaisonnement ? 'à doser selon le goût' : undefined,
    nombrePieces: calcul.nombrePieces,
  }
}

// ————————————————————————————————————————————————————————————————
// Coefficient de recalcul
// ————————————————————————————————————————————————————————————————

export interface Reference {
  personnes?: number
  contenant?: Contenant
}

export type Cible =
  | { mode: 'personnes'; personnes: number }
  | {
      mode: 'contenant'
      contenant: Contenant
      /** Hauteur du moule de la recette, si l'utilisateur la précise (sinon 5 cm par défaut). */
      hauteurReference?: number
    }

/** Coefficient entre la référence de la recette et la cible choisie. `null` si incalculable. */
export function calculerRatio(reference: Reference, cible: Cible): number | null {
  if (cible.mode === 'personnes') {
    if (!reference.personnes || reference.personnes <= 0 || !(cible.personnes > 0)) return null
    return cible.personnes / reference.personnes
  }
  if (!reference.contenant) return null
  const ref = cible.hauteurReference ? { ...reference.contenant, hauteur: cible.hauteurReference } : reference.contenant
  return ratioContenants(ref, cible.contenant)
}

export const SEUILS_CUISSON = { bas: 0.8, haut: 1.25 }

/** Avertissements à afficher pour un coefficient donné. */
export function avertissements(ratio: number, cible: Cible): string[] {
  const liste: string[] = []
  if (cible.mode === 'contenant' && (ratio < SEUILS_CUISSON.bas || ratio > SEUILS_CUISSON.haut)) {
    liste.push('Le temps de cuisson peut varier avec la taille du moule : surveillez la cuisson.')
  }
  if (cible.mode === 'personnes' && ratio > 2.5) {
    liste.push('Pour de grandes quantités, la cuisson peut demander plus de temps : surveillez-la.')
  }
  return liste
}
