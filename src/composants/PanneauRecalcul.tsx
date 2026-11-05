import { useId, useState } from 'react'
import {
  type Contenant,
  decrireContenant,
  estSurface,
  HAUTEUR_PAR_DEFAUT,
  LIBELLES_TYPES,
  MOULES_COURANTS,
  type TypeContenant,
} from '../domaine/contenants'
import { formaterRatio, nombre } from '../domaine/format'
import type { Cible, Reference } from '../domaine/recalcul'

interface Props {
  reference: Reference
  cible: Cible
  ratio: number | null
  onCible: (cible: Cible) => void
}

const TYPES: TypeContenant[] = ['rond', 'carre', 'rectangulaire', 'cake', 'volume']

const PAR_DEFAUT: Record<TypeContenant, Contenant> = {
  rond: { type: 'rond', diametre: 24 },
  carre: { type: 'carre', cote: 20 },
  rectangulaire: { type: 'rectangulaire', longueur: 30, largeur: 20 },
  cake: { type: 'cake', longueur: 26, largeur: 10, hauteur: 8 },
  volume: { type: 'volume', volume: 1.5 },
}

function libelleCourt(c: Contenant): string {
  switch (c.type) {
    case 'rond':
      return `Rond ${c.diametre}`
    case 'carre':
      return `Carré ${c.cote}`
    case 'rectangulaire':
      return `Plat ${c.longueur}×${c.largeur}`
    case 'cake':
      return `Cake ${c.longueur}`
    case 'volume':
      return `${nombre(c.volume ?? 0, 2)} L`
  }
}

const memeContenant = (a: Contenant, b: Contenant) => JSON.stringify(a) === JSON.stringify(b)

export default function PanneauRecalcul({ reference, cible, ratio, onCible }: Props) {
  const idPersonnes = useId()
  const avecContenant = reference.contenant !== undefined
  const personnesRef = reference.personnes

  const auDepart = (): Cible =>
    personnesRef
      ? { mode: 'personnes', personnes: personnesRef }
      : { mode: 'contenant', contenant: { ...reference.contenant! } }

  const modifie = ratio !== null && Math.abs(ratio - 1) > 1e-9

  return (
    <section
      aria-labelledby="titre-recalcul"
      className="rounded-3xl border border-bord bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titre-recalcul" className="font-serif text-2xl font-semibold">
          Recalculer
        </h2>
        <p
          aria-live="polite"
          className={`rounded-full px-4 py-1.5 font-semibold tabular-nums transition-colors ${
            modifie ? 'bg-dore-fond text-texte' : 'bg-fond text-texte-doux'
          }`}
        >
          {ratio === null ? 'À compléter' : formaterRatio(ratio)}
        </p>
      </div>

      {/* Choix du mode */}
      {personnesRef && avecContenant && (
        <div role="radiogroup" aria-label="Recalculer selon" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-fond p-1">
          {(['personnes', 'contenant'] as const).map((mode) => (
            <button
              key={mode}
              role="radio"
              aria-checked={cible.mode === mode}
              onClick={() =>
                onCible(
                  mode === 'personnes'
                    ? { mode, personnes: personnesRef }
                    : { mode, contenant: { ...reference.contenant! } },
                )
              }
              className={`rounded-full px-4 py-2 font-medium transition ${
                cible.mode === mode ? 'bg-primaire text-sur-primaire shadow-sm' : 'text-texte-doux hover:text-texte'
              }`}
            >
              {mode === 'personnes' ? 'Personnes' : 'Moule'}
            </button>
          ))}
        </div>
      )}

      {cible.mode === 'personnes' && personnesRef && (
        <div className="mt-5">
          <p className="text-texte-doux">
            Recette prévue pour <strong className="text-texte">{personnesRef} personnes</strong>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <BoutonRond
              libelle="Une personne de moins"
              onClick={() => onCible({ mode: 'personnes', personnes: Math.max(1, cible.personnes - 1) })}
            >
              −
            </BoutonRond>
            <label htmlFor={idPersonnes} className="sr-only">
              Nombre de personnes
            </label>
            <input
              id={idPersonnes}
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={cible.personnes || ''}
              onChange={(e) => onCible({ mode: 'personnes', personnes: Math.min(200, Number(e.target.value) || 0) })}
              className="w-20 rounded-xl border border-bord bg-fond px-2 py-2 text-center text-2xl font-semibold tabular-nums"
            />
            <BoutonRond
              libelle="Une personne de plus"
              onClick={() => onCible({ mode: 'personnes', personnes: Math.min(200, cible.personnes + 1) })}
            >
              +
            </BoutonRond>
            <span className="text-texte-doux">personnes</span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(24, personnesRef * 4)}
            value={cible.personnes || 1}
            aria-label="Nombre de personnes (curseur)"
            onChange={(e) => onCible({ mode: 'personnes', personnes: Number(e.target.value) })}
            className="mt-4 w-full accent-[var(--primaire)]"
          />
        </div>
      )}

      {cible.mode === 'contenant' && reference.contenant && (
        <ChoixContenant
          reference={reference.contenant}
          contenant={cible.contenant}
          onChange={(contenant) => onCible({ mode: 'contenant', contenant })}
        />
      )}

      {modifie && (
        <button
          onClick={() => onCible(auDepart())}
          className="mt-4 text-primaire underline underline-offset-4 hover:no-underline"
        >
          Revenir à la recette d'origine
        </button>
      )}
    </section>
  )
}

function BoutonRond({ libelle, onClick, children }: { libelle: string; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={libelle}
      className="flex size-12 items-center justify-center rounded-full border border-primaire text-2xl text-primaire transition hover:bg-primaire hover:text-sur-primaire active:scale-95"
    >
      {children}
    </button>
  )
}

function ChoixContenant({
  reference,
  contenant,
  onChange,
}: {
  reference: Contenant
  contenant: Contenant
  onChange: (c: Contenant) => void
}) {
  const changerType = (type: TypeContenant) =>
    onChange(type === reference.type ? { ...reference } : { ...PAR_DEFAUT[type] })
  const maj = (champ: keyof Contenant, valeur: number | undefined) => onChange({ ...contenant, [champ]: valeur })

  return (
    <div className="mt-5 space-y-4">
      <p className="text-texte-doux">
        Recette prévue pour un <strong className="text-texte">{decrireContenant(reference)}</strong>
      </p>

      <div>
        <p className="mb-2 font-medium">Mon moule</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de contenant">
          {TYPES.map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={contenant.type === t}
              onClick={() => changerType(t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                contenant.type === t
                  ? 'border-primaire bg-primaire text-sur-primaire'
                  : 'border-bord bg-fond text-texte hover:border-primaire'
              }`}
            >
              {LIBELLES_TYPES[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {contenant.type === 'rond' && (
          <Champ libelle="Diamètre" unite="cm" valeur={contenant.diametre} onChange={(v) => maj('diametre', v)} />
        )}
        {contenant.type === 'carre' && (
          <Champ libelle="Côté" unite="cm" valeur={contenant.cote} onChange={(v) => maj('cote', v)} />
        )}
        {(contenant.type === 'rectangulaire' || contenant.type === 'cake') && (
          <>
            <Champ libelle="Longueur" unite="cm" valeur={contenant.longueur} onChange={(v) => maj('longueur', v)} />
            <Champ libelle="Largeur" unite="cm" valeur={contenant.largeur} onChange={(v) => maj('largeur', v)} />
          </>
        )}
        {contenant.type === 'cake' && (
          <Champ libelle="Hauteur" unite="cm" valeur={contenant.hauteur} onChange={(v) => maj('hauteur', v)} />
        )}
        {contenant.type === 'volume' && (
          <Champ libelle="Volume" unite="L" valeur={contenant.volume} onChange={(v) => maj('volume', v)} />
        )}
        {estSurface(contenant.type) && !estSurface(reference.type) && (
          <Champ
            libelle="Hauteur"
            unite="cm"
            valeur={contenant.hauteur}
            placeholder={String(HAUTEUR_PAR_DEFAUT)}
            onChange={(v) => maj('hauteur', v)}
          />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm text-texte-doux">Moules courants</p>
        <div className="flex flex-wrap gap-2">
          {MOULES_COURANTS.map((m) => (
            <button
              key={libelleCourt(m)}
              onClick={() => onChange({ ...m })}
              aria-pressed={memeContenant(m, contenant)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                memeContenant(m, contenant)
                  ? 'border-dore bg-dore-fond font-semibold'
                  : 'border-bord text-texte-doux hover:border-dore hover:text-texte'
              }`}
            >
              {libelleCourt(m)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Champ({
  libelle,
  unite,
  valeur,
  placeholder,
  onChange,
}: {
  libelle: string
  unite: string
  valeur: number | undefined
  placeholder?: string
  onChange: (v: number | undefined) => void
}) {
  const id = useId()
  // Texte saisi, conservé tel quel pour pouvoir taper « 2, » avant « 2,5 ».
  const [texte, setTexte] = useState(versTexte(valeur))
  const [valeurVue, setValeurVue] = useState(valeur)
  if (valeur !== valeurVue) {
    setValeurVue(valeur)
    if (lireNombre(texte) !== valeur) setTexte(versTexte(valeur))
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {libelle}
      </label>
      <div className="flex items-center rounded-xl border border-bord bg-fond focus-within:border-primaire">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={texte}
          placeholder={placeholder}
          onChange={(e) => {
            const saisi = e.target.value.replace(/[^\d.,]/g, '')
            setTexte(saisi)
            onChange(lireNombre(saisi))
          }}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-lg tabular-nums outline-none"
        />
        <span className="pr-3 text-texte-doux">{unite}</span>
      </div>
    </div>
  )
}

function versTexte(v: number | undefined): string {
  return v === undefined ? '' : String(v).replace('.', ',')
}

function lireNombre(texte: string): number | undefined {
  const n = Number(texte.replace(',', '.'))
  return texte.trim() === '' || !Number.isFinite(n) ? undefined : n
}
