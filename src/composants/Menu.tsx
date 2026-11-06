import { Ellipsis, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'

export interface ElementMenu {
  libelle: string
  Icone: LucideIcon
  action: () => void
  dangereux?: boolean
}

/** Menu « Plus d'actions » : se ferme au clic extérieur ou avec Échap. */
export default function Menu({ elements, libelle = "Plus d'actions" }: { elements: ElementMenu[]; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const id = useId()
  const racine = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const clic = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOuvert(false)
        bouton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', clic)
    document.addEventListener('keydown', touche)
    // Place le focus sur le premier élément, pour la navigation au clavier.
    racine.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', clic)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  const deplacer = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(racine.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <div ref={racine} className="relative">
      <button
        ref={bouton}
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label={libelle}
        title={libelle}
        className="flex size-11 items-center justify-center rounded-full border border-bord bg-surface transition hover:border-primaire active:scale-95"
      >
        <Ellipsis className="size-5 text-texte-doux" />
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.ul
            id={id}
            role="menu"
            onKeyDown={deplacer}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-bord bg-surface py-1.5 shadow-xl"
          >
            {elements.map(({ libelle: l, Icone, action, dangereux }) => (
              <li key={l} role="none">
                <button
                  role="menuitem"
                  onClick={() => {
                    setOuvert(false)
                    action()
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-fond focus:bg-fond focus:outline-none ${
                    dangereux ? 'text-alerte' : ''
                  }`}
                >
                  <Icone className="size-4.5 shrink-0 opacity-80" aria-hidden="true" />
                  {l}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
