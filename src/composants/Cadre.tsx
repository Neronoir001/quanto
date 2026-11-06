import { ArrowLeftRight, BookOpen, Plus, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { VERSION } from '../version'

const ONGLETS = [
  { href: '/', libelle: 'Recettes', Icone: BookOpen, actif: (p: string) => p === '/' || p.startsWith('/recette/') },
  { href: '/nouvelle', libelle: 'Nouvelle', Icone: Plus, actif: (p: string) => p === '/nouvelle' },
  { href: '/synchro', libelle: 'Synchro', Icone: ArrowLeftRight, actif: (p: string) => p === '/synchro' },
  { href: '/reglages', libelle: 'Réglages', Icone: Settings, actif: (p: string) => p.startsWith('/reglages') || p === '/corbeille' || p === '/carnets' },
]

/** Structure commune : en-tête (ordinateur), barre d'onglets en bas (téléphone). */
export default function Cadre({ children }: { children: ReactNode }) {
  const [chemin] = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <button
        type="button"
        onClick={() => document.getElementById('contenu')?.focus()}
        className="sr-only z-50 rounded-full bg-primaire px-4 py-2 text-sur-primaire focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </button>

      <header className="sticky top-0 z-30 print:hidden border-b border-bord/70 bg-fond/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Quanto, accueil">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-9 rounded-xl shadow-sm" />
            <span className="font-serif text-2xl font-semibold tracking-tight">Quanto</span>
          </Link>
          <nav aria-label="Navigation principale" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {ONGLETS.map(({ href, libelle, Icone, actif }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={actif(chemin) ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${
                      href === '/nouvelle'
                        ? 'bg-primaire text-sur-primaire hover:opacity-90'
                        : actif(chemin)
                          ? 'bg-surface text-texte shadow-sm'
                          : 'text-texte-doux hover:text-texte'
                    }`}
                  >
                    <Icone className="size-4" aria-hidden="true" />
                    {href === '/nouvelle' ? 'Nouvelle recette' : libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12 print:p-0">
        {children}
      </main>

      <footer className="hidden pb-6 print:!hidden text-center text-sm text-texte-doux md:block">Quanto · version {VERSION}</footer>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 print:hidden border-t border-bord bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ONGLETS.map(({ href, libelle, Icone, actif }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={actif(chemin) ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                  actif(chemin) ? 'text-primaire' : 'text-texte-doux'
                }`}
              >
                {href === '/nouvelle' ? (
                  <span className="flex size-9 items-center justify-center rounded-full bg-primaire text-sur-primaire shadow-md">
                    <Icone className="size-5" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex size-9 items-center justify-center">
                    <Icone className="size-6" aria-hidden="true" />
                  </span>
                )}
                {libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
