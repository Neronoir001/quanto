import type { ReactNode } from 'react'

/** Bouton en forme de pastille, sélectionnable (filtres, catégories, tags). */
export default function Puce({
  actif,
  onClick,
  children,
  taille = 'normale',
}: {
  actif: boolean
  onClick: () => void
  children: ReactNode
  taille?: 'petite' | 'normale'
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition active:scale-[0.97] ${
        taille === 'petite' ? 'px-3 py-1 text-sm' : 'px-4 py-2'
      } ${
        actif
          ? 'border-primaire bg-primaire text-sur-primaire'
          : 'border-bord bg-surface text-texte hover:border-primaire'
      }`}
    >
      {children}
    </button>
  )
}
