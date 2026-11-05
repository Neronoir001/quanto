import { useState } from 'react'
import PanneauRecalcul from '../composants/PanneauRecalcul'
import { decrireContenant } from '../domaine/contenants'
import {
  avertissements,
  calculerRatio,
  type Cible,
  type QuantiteCalculee,
  type QuantiteSource,
  recalculerQuantite,
  type Reference,
} from '../domaine/recalcul'

/**
 * Page de démonstration du moteur de recalcul (phase 1).
 * La vraie fiche recette arrivera en phase 2 ; cette page sert à vérifier les calculs.
 */

const REFERENCE: Reference = { personnes: 6, contenant: { type: 'rond', diametre: 24 } }

type Ligne = QuantiteSource & { nom: string }

const INGREDIENTS: Record<string, Ligne> = {
  chocolat: { valeur: 200, unite: 'g', nom: 'chocolat noir' },
  beurre: { valeur: 150, unite: 'g', nom: 'beurre' },
  sucre: { valeur: 120, unite: 'g', nom: 'sucre' },
  oeufs: { valeur: 4, unite: 'piece', nom: 'œufs' },
  farine: { valeur: 60, unite: 'g', nom: 'farine' },
  vanille: { valeur: 1, unite: 'sachet', nom: 'sucre vanillé' },
  sel: { valeur: 1, unite: 'pincee', nom: 'fleur de sel' },
  creme: { valeur: 25, unite: 'cl', nom: 'crème liquide entière' },
  zeste: { valeur: 1, unite: 'piece', nom: "zeste d'orange", recalcul: 'fixe' },
}

/** Étapes : du texte et des quantités balisées (qui seront saisies avec l'éditeur en phase 2). */
type Morceau = string | { q: keyof typeof INGREDIENTS; apres?: string }
const ETAPES: Morceau[][] = [
  ['Préchauffez le four à 180 °C. Beurrez un moule rond de 24 cm.'],
  ['Faites fondre ', { q: 'chocolat' }, ' de chocolat avec ', { q: 'beurre' }, ' de beurre au bain-marie.'],
  [
    'Fouettez ',
    { q: 'oeufs', apres: ' œufs' },
    ' avec ',
    { q: 'sucre' },
    ' de sucre et ',
    { q: 'vanille' },
    ' de sucre vanillé, jusqu’à ce que le mélange blanchisse.',
  ],
  ['Ajoutez le chocolat fondu, puis ', { q: 'farine' }, ' de farine et ', { q: 'sel' }, ' de fleur de sel.'],
  ['Versez dans le moule et enfournez 25 minutes à 180 °C.'],
  ['Servez tiède avec ', { q: 'creme' }, ' de crème fouettée et ', { q: 'zeste', apres: ' zeste' }, ' d’orange râpé.'],
]

export default function Calculateur() {
  const [cible, setCible] = useState<Cible>({ mode: 'personnes', personnes: REFERENCE.personnes! })
  const ratio = calculerRatio(REFERENCE, cible)
  const r = ratio ?? 1
  const calcul = (cle: keyof typeof INGREDIENTS) => recalculerQuantite(INGREDIENTS[cle], r)
  const alertes = ratio === null ? [] : avertissements(ratio, cible)

  return (
    <div className="space-y-6">
      <div>
        <a href="#/" className="text-primaire underline-offset-4 hover:underline">
          ← Accueil
        </a>
        <p className="mt-4 text-sm font-semibold tracking-widest text-sauge uppercase">Démonstration du calculateur</p>
        <h1 className="mt-1 font-serif text-4xl leading-tight font-semibold">Fondant au chocolat</h1>
        <p className="mt-2 text-texte-doux">
          Pour {REFERENCE.personnes} personnes · {decrireContenant(REFERENCE.contenant!)}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
        <div className="space-y-6 lg:sticky lg:top-4">
          <PanneauRecalcul reference={REFERENCE} cible={cible} ratio={ratio} onCible={setCible} />
          {alertes.map((a) => (
            <p key={a} role="status" className="rounded-2xl border border-dore bg-dore-fond px-4 py-3">
              ⚠️ {a}
            </p>
          ))}
        </div>

        <div className="mt-6 space-y-6 lg:mt-0">
          <section aria-labelledby="titre-ingredients" className="rounded-3xl border border-bord bg-surface p-5 sm:p-6">
            <h2 id="titre-ingredients" className="font-serif text-2xl font-semibold">
              Ingrédients
            </h2>
            <ul className="mt-4 divide-y divide-bord">
              {(Object.keys(INGREDIENTS) as (keyof typeof INGREDIENTS)[]).map((cle) => {
                const q = calcul(cle)
                return (
                  <li key={cle} className="flex items-baseline gap-4 py-2.5">
                    <span className="w-28 shrink-0 text-right">
                      <Quantite q={q} />
                    </span>
                    <span className="min-w-0">
                      {INGREDIENTS[cle].nom}
                      <Precisions q={q} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="titre-etapes" className="rounded-3xl border border-bord bg-surface p-5 sm:p-6">
            <h2 id="titre-etapes" className="font-serif text-2xl font-semibold">
              Préparation
            </h2>
            <ol className="mt-4 space-y-4">
              {ETAPES.map((morceaux, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primaire font-serif font-semibold text-sur-primaire"
                  >
                    {i + 1}
                  </span>
                  <p className="pt-0.5 leading-relaxed">
                    {morceaux.map((m, j) =>
                      typeof m === 'string' ? (
                        <span key={j}>{m}</span>
                      ) : (
                        <span key={j}>
                          <Quantite q={calcul(m.q)} />
                          {m.apres}
                        </span>
                      ),
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <p className="text-sm text-texte-doux">
            Les quantités <mark className="rounded bg-dore-fond px-1 font-semibold text-texte">surlignées</mark> ont été
            recalculées. La température, la durée et la taille du moule citées dans les étapes ne changent jamais.
          </p>
        </div>
      </div>
    </div>
  )
}

function Quantite({ q }: { q: QuantiteCalculee }) {
  if (!q.texte) return null
  return q.modifiee ? (
    <mark className="rounded bg-dore-fond px-1 font-semibold text-texte tabular-nums transition-colors">{q.texte}</mark>
  ) : (
    <span className="font-semibold tabular-nums">{q.texte}</span>
  )
}

function Precisions({ q }: { q: QuantiteCalculee }) {
  const details = [q.equivalent, q.note].filter(Boolean)
  if (details.length === 0) return null
  return <span className="ml-2 text-sm text-texte-doux italic">({details.join(' · ')})</span>
}
