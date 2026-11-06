import type { ReactNode } from 'react'
import type { Ingredient, NoeudRiche } from '../domaine/modele'
import { accorderPremierMot } from '../domaine/accord'
import { type QuantiteCalculee, recalculerQuantite } from '../domaine/recalcul'
import { attributsQuantite, sourceDeQuantite } from '../domaine/texteRiche'

/** Quantité affichée : surlignée quand elle a été recalculée. */
export function Quantite({ q, surbrillance = false }: { q: QuantiteCalculee; surbrillance?: boolean }) {
  if (!q.texte) return null
  const anneau = surbrillance ? 'ring-2 ring-primaire ring-offset-1 ring-offset-surface' : ''
  return q.modifiee ? (
    <mark className={`rounded bg-dore-fond px-1 font-semibold whitespace-nowrap text-texte tabular-nums transition ${anneau}`}>
      {q.texte}
      <span className="sr-only"> (recalculé)</span>
    </mark>
  ) : (
    <strong className={`rounded px-0.5 font-semibold whitespace-nowrap tabular-nums transition ${anneau}`}>{q.texte}</strong>
  )
}

interface Props {
  doc: NoeudRiche
  ratio: number
  ingredients: Ingredient[]
  /** Ingrédient survolé : ses mentions sont mises en évidence. */
  surbrillance?: string | null
}

/** Affiche le texte d'une étape avec les quantités recalculées. */
export default function TexteRiche({ doc, ratio, ingredients, surbrillance }: Props) {
  const rendre = (n: NoeudRiche, cle: string): ReactNode => {
    switch (n.type) {
      case 'doc':
        return <div key={cle}>{(n.content ?? []).map((c, i) => rendre(c, `${cle}-${i}`))}</div>
      case 'paragraph':
        return (
          <p key={cle} className="leading-relaxed [&:not(:first-child)]:mt-2">
            {accorderApresPieces(n.content ?? []).map((c, i) => rendre(c, `${cle}-${i}`))}
          </p>
        )
      case 'hardBreak':
        return <br key={cle} />
      case 'quantite': {
        const a = attributsQuantite(n)
        if (!a) return null
        const q = recalculerQuantite(sourceDeQuantite(a, ingredients), ratio)
        return <Quantite key={cle} q={q} surbrillance={!!surbrillance && a.ingredientId === surbrillance} />
      }
      case 'text': {
        let contenu: ReactNode = n.text
        for (const m of n.marks ?? []) {
          if (m.type === 'bold') contenu = <strong>{contenu}</strong>
          if (m.type === 'italic') contenu = <em>{contenu}</em>
        }
        return <span key={cle}>{contenu}</span>
      }
      default:
        return (n.content ?? []).map((c, i) => rendre(c, `${cle}-${i}`))
    }
  }
  /** « 3 œufs » recalculé en « 1 » : le mot qui suit devient « œuf ». */
  const accorderApresPieces = (contenu: NoeudRiche[]): NoeudRiche[] =>
    contenu.map((n, i) => {
      const precedent = i > 0 ? contenu[i - 1] : undefined
      if (n.type !== 'text' || !n.text || precedent?.type !== 'quantite') return n
      const a = attributsQuantite(precedent)
      const ingredient = a?.ingredientId ? ingredients.find((x) => x.id === a.ingredientId) : undefined
      if (!a || a.unite !== 'piece' || !ingredient) return n
      const pieces = recalculerQuantite(sourceDeQuantite(a, ingredients), ratio).nombrePieces
      return pieces === undefined ? n : { ...n, text: accorderPremierMot(n.text, ingredient.nom, pieces) }
    })

  return <>{rendre(doc, 'r')}</>
}
