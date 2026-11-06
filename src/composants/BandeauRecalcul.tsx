import { Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { formaterRatio } from '../domaine/format'
import type { Cible, Reference } from '../domaine/recalcul'
import { libelleCourt } from './PanneauRecalcul'

interface Props {
  reference: Reference
  cible: Cible
  ratio: number | null
  onCible: (c: Cible) => void
  /** Ramène au panneau complet. */
  onModifier: () => void
}

/**
 * Rappel compact du recalcul, fixé en haut de l'écran sur téléphone et tablette
 * quand le panneau complet n'est plus visible.
 */
export default function BandeauRecalcul({ reference, cible, ratio, onCible, onModifier }: Props) {
  const modifie = ratio !== null && Math.abs(ratio - 1) > 1e-9
  const bouton =
    'flex size-9 items-center justify-center rounded-full border border-primaire text-primaire transition active:scale-90 disabled:opacity-40'

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-20 px-3 pt-2 lg:hidden"
      role="region"
      aria-label="Recalcul en cours"
    >
      <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full border border-bord bg-surface/95 py-1.5 pr-1.5 pl-2 shadow-lg backdrop-blur-md">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${modifie ? 'bg-dore-fond' : 'bg-fond text-texte-doux'}`}
        >
          {ratio === null ? '—' : formaterRatio(ratio)}
        </span>

        {cible.mode === 'personnes' ? (
          <div className="flex flex-1 items-center justify-center gap-2">
            <button
              type="button"
              className={bouton}
              aria-label="Une personne de moins"
              disabled={cible.personnes <= 1}
              onClick={() => onCible({ mode: 'personnes', personnes: Math.max(1, cible.personnes - 1) })}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[5.5rem] text-center font-semibold tabular-nums" aria-live="polite">
              {cible.personnes} pers.
            </span>
            <button
              type="button"
              className={bouton}
              aria-label="Une personne de plus"
              onClick={() => onCible({ mode: 'personnes', personnes: Math.min(200, cible.personnes + 1) })}
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : (
          <span className="flex-1 truncate text-center font-semibold">{libelleCourt(cible.contenant)}</span>
        )}

        <button
          type="button"
          onClick={onModifier}
          aria-label={`Modifier le recalcul${reference.contenant ? ' (personnes ou moule)' : ''}`}
          className="flex size-9 items-center justify-center rounded-full bg-primaire text-sur-primaire"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}
