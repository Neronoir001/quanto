import { AnimatePresence, motion } from 'motion/react'
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Message {
  id: number
  texte: string
  action?: { libelle: string; faire: () => void }
  /** En millisecondes ; `null` = reste affiché jusqu'à fermeture. */
  duree: number | null
}

type Afficher = (texte: string, options?: { action?: Message['action']; duree?: number | null }) => void

const Contexte = createContext<Afficher>(() => {})

/** Petits messages en bas de l'écran : « Recette enregistrée », « Mise à la corbeille — Annuler »… */
export function useMessage(): Afficher {
  return useContext(Contexte)
}

export function FournisseurMessages({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const compteur = useRef(0)

  const fermer = useCallback((id: number) => setMessages((m) => m.filter((x) => x.id !== id)), [])

  const afficher = useCallback<Afficher>(
    (texte, options = {}) => {
      const id = ++compteur.current
      const duree = options.duree === undefined ? (options.action ? 6000 : 3500) : options.duree
      setMessages((m) => [...m.slice(-2), { id, texte, action: options.action, duree }])
      if (duree !== null) window.setTimeout(() => fermer(id), duree)
    },
    [fermer],
  )

  return (
    <Contexte.Provider value={afficher}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-24"
      >
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-texte px-4 py-3 text-fond shadow-lg"
              role="status"
            >
              <span className="flex-1">{m.texte}</span>
              {m.action && (
                <button
                  onClick={() => {
                    m.action!.faire()
                    fermer(m.id)
                  }}
                  className="rounded-full px-3 py-1 font-semibold text-dore underline-offset-4 hover:underline"
                >
                  {m.action.libelle}
                </button>
              )}
              <button onClick={() => fermer(m.id)} aria-label="Fermer le message" className="rounded-full p-1 opacity-70 hover:opacity-100">
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Contexte.Provider>
  )
}
