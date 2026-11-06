import { X } from 'lucide-react'
import { useId, useState } from 'react'

const SUGGESTIONS = ['végétarien', 'vegan', 'sans gluten', 'sans lactose', 'rapide', 'économique', 'de saison', 'fêtes', 'goûter', 'apéritif']

/** Saisie de tags : Entrée ou virgule pour ajouter, avec suggestions. */
export default function ChampTags({ valeur, onChange, existants }: { valeur: string[]; onChange: (t: string[]) => void; existants: string[] }) {
  const id = useId()
  const [saisie, setSaisie] = useState('')
  const proposes = [...new Set([...existants, ...SUGGESTIONS])].filter((t) => !valeur.includes(t)).slice(0, 10)

  const ajouter = (t: string) => {
    const tag = t.trim().replace(/^#/, '').toLowerCase()
    if (tag && !valeur.includes(tag)) onChange([...valeur, tag])
    setSaisie('')
  }

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Ajouter un tag
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-bord bg-fond p-2 focus-within:border-primaire">
        {valeur.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sauge-fond py-1 pr-1 pl-3 text-sm font-medium text-sauge">
            #{t}
            <button type="button" onClick={() => onChange(valeur.filter((x) => x !== t))} aria-label={`Retirer le tag ${t}`} className="rounded-full p-1 hover:bg-surface">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={saisie}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) ajouter(v.slice(0, -1))
            else setSaisie(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ajouter(saisie)
            } else if (e.key === 'Backspace' && !saisie && valeur.length) {
              onChange(valeur.slice(0, -1))
            }
          }}
          onBlur={() => saisie.trim() && ajouter(saisie)}
          placeholder={valeur.length ? '' : 'végétarien, rapide…'}
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 outline-none"
        />
      </div>
      {proposes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggestions de tags">
          {proposes.map((t) => (
            <button key={t} type="button" onClick={() => ajouter(t)} className="rounded-full border border-dashed border-bord px-2.5 py-0.5 text-sm text-texte-doux hover:border-sauge hover:text-sauge">
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
