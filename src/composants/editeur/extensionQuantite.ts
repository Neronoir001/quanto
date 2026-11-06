import { mergeAttributes, Node } from '@tiptap/core'
import { recalculerQuantite } from '../../domaine/recalcul'
import { estUniteConnue } from '../../domaine/unites'

/** Texte d'origine d'une quantité balisée (« 200 g »). */
export function texteQuantite(attrs: Record<string, unknown>): string {
  const unite = typeof attrs.unite === 'string' && estUniteConnue(attrs.unite) ? attrs.unite : 'piece'
  const valeur = typeof attrs.valeur === 'number' ? attrs.valeur : 0
  const valeurMax = typeof attrs.valeurMax === 'number' ? attrs.valeurMax : undefined
  return recalculerQuantite({ valeur, valeurMax, unite }, 1).texte
}

/**
 * Nœud « quantité » de l'éditeur : une quantité recalculable, insécable,
 * affichée comme une pastille dorée dans le texte de l'étape.
 */
export const ExtensionQuantite = Node.create({
  name: 'quantite',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      valeur: { default: 0, rendered: false },
      valeurMax: { default: null, rendered: false },
      unite: { default: 'g', rendered: false },
      ingredientId: { default: null, rendered: false },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-quantite]',
        getAttrs: (element) => {
          try {
            return JSON.parse((element as HTMLElement).getAttribute('data-quantite') ?? '{}')
          } catch {
            return false
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-quantite': JSON.stringify(node.attrs),
        class: 'quantite-balisee',
        title: 'Quantité recalculable',
      }),
      texteQuantite(node.attrs),
    ]
  },

  renderText({ node }) {
    return texteQuantite(node.attrs)
  },
})
