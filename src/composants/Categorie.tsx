import { CakeSlice, CookingPot, CupSoda, IceCreamCone, type LucideIcon, Salad, Utensils } from 'lucide-react'
import type { Categorie } from '../domaine/modele'

/** Icône et teinte de chaque catégorie (utilisées quand une recette n'a pas de photo). */
export const APPARENCE: Record<Categorie, { Icone: LucideIcon; fond: string; encre: string }> = {
  entree: { Icone: Salad, fond: 'bg-sauge-fond', encre: 'text-sauge' },
  plat: { Icone: CookingPot, fond: 'bg-[#f3e1d6] dark:bg-[#3a2a22]', encre: 'text-primaire' },
  dessert: { Icone: IceCreamCone, fond: 'bg-dore-fond', encre: 'text-[#8a6a2a] dark:text-dore' },
  patisserie: { Icone: CakeSlice, fond: 'bg-[#f5e4e1] dark:bg-[#3b2626]', encre: 'text-[#9a4a45] dark:text-[#e3a49d]' },
  boisson: { Icone: CupSoda, fond: 'bg-[#e1ebee] dark:bg-[#22313a]', encre: 'text-[#3f6878] dark:text-[#9cc3d1]' },
  autre: { Icone: Utensils, fond: 'bg-fond', encre: 'text-texte-doux' },
}

/** Emplacement de photo : la photo si elle existe, sinon l'icône de la catégorie. */
export function VisuelRecette({
  url,
  categorie,
  className = '',
  taille = 'moyenne',
}: {
  url?: string
  categorie: Categorie
  className?: string
  taille?: 'petite' | 'moyenne' | 'grande'
}) {
  if (url) return <img src={url} alt="" className={`object-cover ${className}`} loading="lazy" decoding="async" />
  const { Icone, fond, encre } = APPARENCE[categorie]
  const icone = taille === 'petite' ? 'size-6' : taille === 'grande' ? 'size-20' : 'size-12'
  return (
    <div className={`flex items-center justify-center ${fond} ${className}`} aria-hidden="true">
      <Icone className={`${icone} ${encre} opacity-80`} strokeWidth={1.4} />
    </div>
  )
}
