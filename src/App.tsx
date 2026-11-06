import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import Cadre from './composants/Cadre'
import { FournisseurMessages } from './composants/Messages'
import MiseAJour from './composants/MiseAJour'
import { base } from './donnees/base'
import { nettoyer } from './donnees/recettes'
import Corbeille from './ecrans/Corbeille'
import FicheRecette from './ecrans/FicheRecette'
import ListeRecettes from './ecrans/ListeRecettes'
import Reglages from './ecrans/Reglages'

// Écrans chargés à la demande : l'éditeur et les outils ne ralentissent pas le premier affichage.
const FormulaireRecette = lazy(() => import('./ecrans/FormulaireRecette'))
const TestSynchro = lazy(() => import('./ecrans/TestSynchro'))
const Calculateur = lazy(() => import('./ecrans/Calculateur'))

/** Remonte en haut de page à chaque changement d'écran. */
function RetourEnHaut() {
  const [chemin] = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [chemin])
  return null
}

export default function App() {
  // Ménage discret au démarrage : corbeille et historique de plus de 30 jours.
  useEffect(() => {
    void nettoyer(base).catch(() => {})
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <FournisseurMessages>
        <Router hook={useHashLocation}>
          <RetourEnHaut />
          <MiseAJour />
          <Cadre>
            <Suspense fallback={<p className="py-20 text-center text-texte-doux">Chargement…</p>}>
            <Switch>
              <Route path="/" component={ListeRecettes} />
              <Route path="/nouvelle" component={FormulaireRecette} />
              <Route path="/recette/:id/modifier" component={FormulaireRecette} />
              <Route path="/recette/:id" component={FicheRecette} />
              <Route path="/reglages" component={Reglages} />
              <Route path="/corbeille" component={Corbeille} />
              <Route path="/synchro">
                <div className="mx-auto max-w-2xl">
                  <TestSynchro />
                </div>
              </Route>
              <Route path="/calculateur" component={Calculateur} />
              <Route>
                <p className="py-20 text-center text-texte-doux">Cette page n'existe pas.</p>
              </Route>
            </Switch>
            </Suspense>
          </Cadre>
        </Router>
      </FournisseurMessages>
    </MotionConfig>
  )
}
