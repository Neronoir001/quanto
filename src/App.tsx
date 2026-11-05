import { useEffect, useState } from 'react'
import Accueil from './ecrans/Accueil'
import Calculateur from './ecrans/Calculateur'
import TestSynchro from './ecrans/TestSynchro'

type Ecran = 'accueil' | 'synchro' | 'calculateur'

function ecranDepuisAdresse(): Ecran {
  const h = window.location.hash
  return h === '#/synchro' ? 'synchro' : h === '#/calculateur' ? 'calculateur' : 'accueil'
}

export default function App() {
  const [ecran, setEcran] = useState<Ecran>(ecranDepuisAdresse)

  useEffect(() => {
    const surChangement = () => {
      setEcran(ecranDepuisAdresse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', surChangement)
    return () => window.removeEventListener('hashchange', surChangement)
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="mb-8 flex items-center gap-3">
        <a href="#/" className="flex items-center gap-3" aria-label="Quanto, retour à l'accueil">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-11 rounded-xl shadow-sm" />
          <span className="font-serif text-3xl font-semibold tracking-tight">Quanto</span>
        </a>
      </header>

      <main className="flex-1">
        {ecran === 'calculateur' ? (
          <Calculateur />
        ) : (
          <div className="mx-auto max-w-2xl">{ecran === 'synchro' ? <TestSynchro /> : <Accueil />}</div>
        )}
      </main>

      <footer className="mt-10 text-center text-sm text-texte-doux">
        Quanto · version 0.2 · phase 1 (moteur de recalcul)
      </footer>
    </div>
  )
}
