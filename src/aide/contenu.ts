/**
 * Contenu du guide utilisateur de Quanto.
 * Il alimente à la fois la rubrique « Aide » de l'application et le guide PDF
 * (scripts/guide.mjs). Mise en forme : **gras** dans les textes.
 * Ce fichier ne doit rien importer : il est aussi lu directement par Node.
 */

export type Bloc =
  | { p: string }
  | { sousTitre: string }
  | { liste: string[]; numerotee?: boolean }
  | { astuce: string }
  | { attention: string }
  | { image: string; legende: string }
  | { tableau: { entetes: string[]; lignes: string[][] } }

export interface Section {
  id: string
  titre: string
  resume: string
  blocs: Bloc[]
}

export const SECTIONS: Section[] = [
  {
    id: 'bienvenue',
    titre: 'Bienvenue dans Quanto',
    resume: 'Ce que fait Quanto et ses principes.',
    blocs: [
      {
        p: 'Quanto (« combien ? » en italien) est votre carnet de recettes de cuisine et de pâtisserie. Sa spécialité : **recalculer automatiquement les quantités** pour le nombre de personnes ou la taille du moule que vous avez réellement, jusque dans le texte des étapes.',
      },
      { image: 'liste.jpg', legende: 'L’écran principal : toutes vos recettes, avec recherche et filtres.' },
      { sousTitre: 'Les principes' },
      {
        liste: [
          '**Vos recettes restent chez vous** : elles sont enregistrées uniquement sur vos appareils, jamais sur un serveur.',
          '**Gratuit** : aucun abonnement, aucune publicité, aucun compte à créer.',
          '**Hors ligne** : une fois installée, Quanto fonctionne sans Internet, même en mode avion.',
          '**Sur tous vos appareils** : PC, iPhone, téléphone et tablette Android, synchronisés entre eux par Wi-Fi ou par fichier.',
        ],
      },
    ],
  },
  {
    id: 'installer',
    titre: 'Installer Quanto',
    resume: 'Sur PC, iPhone, téléphone et tablette Android.',
    blocs: [
      { p: 'Quanto s’installe depuis son adresse web, puis s’ouvre comme une application, avec sa propre icône :' },
      { p: '**https://neronoir001.github.io/quanto/**' },
      { sousTitre: 'Sur PC (Windows)' },
      {
        liste: ['Ouvrez l’adresse dans **Chrome** ou **Edge**.', 'Cliquez sur l’icône **Installer** à droite de la barre d’adresse, puis sur **Installer**.', 'Quanto apparaît dans le menu Démarrer.'],
        numerotee: true,
      },
      { sousTitre: 'Sur iPhone' },
      {
        liste: [
          'Ouvrez l’adresse dans **Safari** (obligatoirement Safari).',
          'Touchez le bouton **Partager** (carré avec une flèche vers le haut).',
          'Choisissez **« Sur l’écran d’accueil »**, puis **Ajouter**.',
        ],
        numerotee: true,
      },
      {
        attention:
          'Sur iPhone, ouvrez **toujours Quanto depuis son icône**, jamais depuis Safari : l’icône et Safari ont chacun leur propre mémoire, et seule l’application installée protège vos recettes durablement.',
      },
      { sousTitre: 'Sur téléphone et tablette Android' },
      {
        liste: ['Ouvrez l’adresse dans **Chrome**.', 'Touchez **Installer** si la proposition apparaît, sinon le menu **⋮** puis **« Installer l’application »**.'],
        numerotee: true,
      },
      {
        astuce:
          'Dans **Réglages › Vérifications**, Quanto indique si elle est bien installée, si vos données sont protégées et si elle fonctionne hors ligne.',
      },
      { sousTitre: 'Les mises à jour' },
      { p: 'Quand une nouvelle version est prête, un message **« Une nouvelle version de Quanto est disponible »** s’affiche : touchez **Mettre à jour**. Vos recettes ne sont jamais touchées.' },
    ],
  },
  {
    id: 'recettes',
    titre: 'Retrouver ses recettes',
    resume: 'Recherche, filtres, favoris, affichage.',
    blocs: [
      {
        liste: [
          '**Rechercher** : tapez un titre, un ingrédient ou un tag. Les accents et les petites fautes de frappe sont tolérés (« chocolt » trouve « chocolat »).',
          '**Catégories et favoris** : touchez une pastille (Entrée, Plat, Dessert…) pour filtrer ; le cœur ♥ n’affiche que vos favoris.',
          '**Carnets** : la rangée de carnets (si vous en avez créé) filtre la liste sur un carnet.',
          '**Filtres** : le bouton « Filtres » ajoute la difficulté, le temps total, les tags et l’ordre de tri (récentes, consultées, de A à Z, les plus rapides).',
          '**Affichage** : en haut à droite, choisissez la grille (avec photos) ou la liste compacte.',
        ],
      },
      { astuce: 'Pour découvrir Quanto sans rien saisir, touchez **« Ajouter des exemples »** (aussi dans Réglages) : trois recettes s’ajoutent, à supprimer ensuite si vous voulez.' },
    ],
  },
  {
    id: 'creer',
    titre: 'Créer une recette',
    resume: 'Le formulaire, les ingrédients et les étapes recalculables.',
    blocs: [
      { p: 'Touchez **+ Nouvelle**. Le formulaire est enregistré en brouillon au fur et à mesure : si vous le quittez, Quanto vous proposera de **reprendre** là où vous en étiez.' },
      { sousTitre: 'L’essentiel et la photo' },
      {
        liste: [
          'Donnez un **titre**, choisissez la **catégorie** et la **difficulté**.',
          '**Photo** : appareil photo, galerie ou adresse web. Une fenêtre permet ensuite de la **recadrer** (glissez le doigt sur la zone à garder) et de la **tourner**. Le bouton **Recadrer** retouche une photo déjà en place.',
          '**Temps** de préparation, de cuisson et de repos, en minutes.',
        ],
      },
      { sousTitre: 'Pour combien ?' },
      {
        p: 'C’est la **base du recalcul** : indiquez le **nombre de personnes**, et/ou cochez **« Préciser le moule »** pour donner son type (rond, carré, plat, cake, volume) et ses dimensions.',
      },
      { sousTitre: 'Les ingrédients' },
      {
        liste: [
          '**Quantité** : 200, 1,5, 1/2, ½ ou une fourchette « 2 à 3 ». Laissez vide pour « sel, poivre ».',
          '**Unité** : g, kg, ml, cl, L, càc, càs, pièce(s), gousse, sachet, feuille, pincée, QS, au goût…',
          '**Entrée** dans le nom ajoute la ligne suivante ; les flèches ↑ ↓ changent l’ordre.',
          'Le bouton **⋯** d’une ligne donne : une **précision** (« tamisée »), un **groupe** (« Pour la pâte ») et l’option **« Ne pas recalculer »** (zeste, piment…).',
        ],
      },
      { sousTitre: 'Les étapes et les quantités recalculables' },
      {
        p: 'Écrivez chaque étape normalement. Quanto **repère les quantités** du texte (« 100 g », « 2 c. à s. », « 3 œufs ») et propose **« Les rendre recalculables »** : elles deviennent des **pastilles dorées**, recalculées avec le reste de la recette. Les températures, durées et dimensions (« 180 °C », « 25 min », « 24 cm ») ne sont jamais touchées.',
      },
      { image: 'formulaire-etapes.jpg', legende: 'Les quantités en pastille dorée seront recalculées.' },
      {
        liste: [
          'Sélectionnez un texte puis **« Rendre recalculable »** pour baliser une quantité vous-même.',
          'Touchez une pastille puis **« Ne plus recalculer »** pour la remettre en texte simple.',
          'Les boutons **G** et **I** mettent en gras ou en italique.',
        ],
      },
      { sousTitre: 'Notes, tags et carnets' },
      { p: 'Ajoutez vos astuces, des **tags** (végétarien, rapide…) et rangez la recette dans un ou plusieurs **carnets**. Touchez **Enregistrer** : les éventuels oublis sont signalés en rouge.' },
    ],
  },
  {
    id: 'importer',
    titre: 'Importer une recette',
    resume: 'Texte, site web, photo, PDF ou carnet.',
    blocs: [
      { p: 'Touchez **Importer** sur la page de vos recettes. Tout se passe **sur l’appareil**, sans rien envoyer sur Internet.' },
      { image: 'importer.jpg', legende: 'Les quatre façons d’importer une recette.' },
      { sousTitre: 'Coller un texte' },
      {
        p: 'Copiez une recette (site, e-mail, note), collez-la et touchez **Analyser**. Astuce : sur téléphone, le **micro du clavier** permet de dicter une recette dans ce champ.',
      },
      { sousTitre: 'Le bouton magique, pour les sites de recettes' },
      {
        p: 'La plupart des sites (Marmiton, 750g, Cuisine AZ…) contiennent une fiche recette invisible. Le **bouton magique** est un favori qui la copie en un clic ; il suffit ensuite de la coller dans Quanto. Pour l’installer, ouvrez **Importer › Coller un texte › Installer le bouton magique** :',
      },
      {
        liste: [
          '**Sur PC** : affichez la barre de favoris (Ctrl + Maj + B) et faites-y glisser le bouton « ✨ Quanto ».',
          '**Sur iPhone et Android** : copiez le code du bouton, créez un favori sur n’importe quelle page, puis remplacez son adresse par le code copié. Sur Android, on l’utilise en tapant « Quanto » dans la barre d’adresse.',
        ],
      },
      { sousTitre: 'Une photo ou un PDF' },
      {
        liste: [
          '**Photo** : photographiez la page bien à plat et bien éclairée, recadrez sur la recette, puis **Lire le texte**. Une recette sur deux pages ? **+ Ajouter une page**. La lecture est bonne sur un texte imprimé, plus approximative sur une écriture manuscrite.',
          '**PDF** : le texte est extrait directement ; un PDF scanné est lu comme une photo (5 pages au plus).',
        ],
      },
      { sousTitre: 'L’aperçu avant création' },
      {
        p: 'Chaque ligne est classée en **Ingrédient**, **Étape** ou **Ignorer** : un toucher suffit pour corriger, et ⤒ recolle une ligne coupée en deux. **Continuer vers la recette** ouvre ensuite le formulaire déjà rempli, avec les quantités des étapes déjà recalculables.',
      },
      { image: 'apercu-import.jpg', legende: 'L’aperçu : vérifiez le classement des lignes.' },
    ],
  },
  {
    id: 'recalculer',
    titre: 'Recalculer une recette',
    resume: 'Personnes, moules, arrondis : le cœur de Quanto.',
    blocs: [
      { p: 'Ouvrez une recette : le panneau **Recalculer** est en haut (à gauche sur ordinateur). Le **coefficient** appliqué s’affiche en permanence (« × 1,5 ») et **« Revenir à la recette d’origine »** annule tout. Le recalcul ne modifie jamais la recette enregistrée.' },
      { sousTitre: 'Selon le nombre de personnes' },
      { p: 'Boutons **−** / **+**, champ ou curseur : toutes les quantités changent aussitôt, dans la liste et dans les étapes, **surlignées en doré**.' },
      { image: 'fiche.jpg', legende: 'Une recette pour 6 recalculée pour 9 : les quantités changées sont surlignées.' },
      { sousTitre: 'Selon le moule' },
      {
        liste: [
          'Touchez **Moule** (si la recette en indique un), choisissez le type et les dimensions de **votre** moule, ou un moule courant.',
          'Rond, carré et plat sont comparés par la **surface du fond** ; le moule à cake et le volume libre par le **volume**. Entre les deux, une hauteur est utilisée (5 cm si vous n’en indiquez pas).',
          '**Mes moules** : « Mémoriser ce moule » garde vos moules (avec un nom) pour les choisir ensuite en un toucher.',
        ],
      },
      { image: 'recalcul-moule.jpg', legende: 'D’un moule rond de 24 cm à un moule à cake : × 0,92.' },
      { sousTitre: 'Les arrondis' },
      {
        tableau: {
          entetes: ['Quantité', 'Arrondi'],
          lignes: [
            ['Grammes, millilitres', 'au demi sous 10, à l’unité jusqu’à 100, par 5 au-delà'],
            ['Kilos, litres', 'à partir de 1 000 g ou 1 000 ml : « 1,2 L », « 1,5 kg »'],
            ['Cuillères', 'en ¼, ½, ¾ ; 3 càc deviennent 1 càs'],
            ['Sachets, feuilles, pots', 'à la demie : « 1 sachet ½ »'],
            ['Œufs et pièces', 'à l’unité, ou « 2 à 3 œufs (≈ 117 g battus) » entre deux'],
            ['Pincée, QS, au goût', 'jamais recalculés (« à ajuster »)'],
          ],
        },
      },
      {
        astuce:
          'Quanto prévient quand c’est utile : « à doser selon le goût » pour le sel et les épices quand la quantité change beaucoup, et « surveillez la cuisson » quand le moule change nettement.',
      },
      { p: 'Sur téléphone, en descendant vers les étapes, un **bandeau** garde le coefficient et les boutons − / + en haut de l’écran. Le recalcul choisi est conservé pour la recette jusqu’à la fermeture de l’application.' },
    ],
  },
  {
    id: 'cuisine',
    titre: 'Le mode cuisine',
    resume: 'Une étape à la fois, en grand, avec minuteurs.',
    blocs: [
      { p: 'Sur une recette, touchez **Mode cuisine** : l’écran affiche une étape à la fois, en très grand, avec les quantités du recalcul choisi. **L’écran ne se met pas en veille.**' },
      { image: 'mode-cuisine.jpg', legende: 'Le mode cuisine, avec un minuteur en cours.' },
      {
        liste: [
          '**Avancer** : balayez l’écran, touchez les grands boutons **Précédente** / **Suivante**, ou utilisez les flèches du clavier.',
          '**Ingrédients** : le bouton en haut ouvre la liste, à cocher au fur et à mesure (toujours visible à gauche sur tablette à l’horizontale et sur ordinateur).',
          '**Minuteurs** : quand une étape cite une durée, un bouton **« Minuteur 25 min »** lance un compte à rebours, qui sonne et vibre à la fin. Plusieurs minuteurs peuvent tourner à la fois ; ils se mettent en pause ou s’arrêtent d’un toucher.',
          '**Quitter** : la croix en haut à gauche, ou la touche Échap.',
        ],
      },
    ],
  },
  {
    id: 'organiser',
    titre: 'Favoris, tags et carnets',
    resume: 'Organiser son carnet de recettes.',
    blocs: [
      {
        liste: [
          '**Favoris** : le cœur ♥ sur une carte ou une fiche.',
          '**Tags** : des mots-clés libres (végétarien, rapide, Noël…), à ajouter dans le formulaire, et à filtrer dans la liste.',
          '**Carnets** : des collections de recettes (« Desserts du dimanche »). Une recette peut être dans plusieurs carnets. Depuis une fiche : menu **⋯ › Ranger dans un carnet**. Pour les renommer, changer leur couleur, les partager ou les supprimer : **Réglages › Mes carnets**.',
        ],
      },
      { image: 'carnets.jpg', legende: 'Mes carnets.' },
      { p: 'Supprimer un carnet ne supprime **aucune** recette.' },
    ],
  },
  {
    id: 'synchroniser',
    titre: 'Synchroniser ses appareils',
    resume: 'Par Wi-Fi avec un code, ou par fichier.',
    blocs: [
      { p: 'Ouvrez l’onglet **Synchro**. Commencez par donner un **nom** à chaque appareil (« PC bureau », « iPhone », « Tablette cuisine ») : il apparaît pendant les échanges.' },
      { sousTitre: 'Par Wi-Fi (le plus simple)' },
      {
        liste: [
          'Les deux appareils sur le **même Wi-Fi**, Quanto ouverte sur chacun, onglet Synchro.',
          'Sur le premier : **Afficher un code**.',
          'Sur le second : saisissez le code, puis **Se connecter**.',
          'Vérifiez que **les mêmes 3 symboles** s’affichent sur les deux écrans, puis touchez **« Identiques : synchroniser »** sur **chacun** des deux.',
          'Les recettes, photos, carnets et suppressions s’échangent dans les deux sens. Gardez les écrans allumés jusqu’au résumé.',
        ],
        numerotee: true,
      },
      { image: 'synchro.jpg', legende: 'La synchronisation par Wi-Fi.' },
      { p: 'Les recettes passent **directement** d’un appareil à l’autre, chiffrées. Internet sert seulement quelques secondes à mettre les deux appareils en relation.' },
      { sousTitre: 'Par fichier' },
      {
        liste: [
          '**Carnet complet** : toutes les recettes et photos (idéal comme sauvegarde).',
          '**Nouveautés uniquement** : seulement ce qui a changé depuis le dernier envoi (fichier léger pour un e-mail).',
          '**Partager…** ouvre le menu du téléphone (e-mail, Quick Share…) ; **Enregistrer le fichier** le dépose dans vos téléchargements.',
          'Sur l’autre appareil : **Importer un fichier**. Les recettes sont fusionnées **sans doublon**.',
        ],
      },
      { sousTitre: 'Comment Quanto fusionne' },
      {
        liste: [
          'Quand une recette a été modifiée des deux côtés, **la version la plus récente l’emporte** ; l’autre reste dans l’**historique** de la recette pendant 30 jours.',
          'Une recette mise à la corbeille sur un appareil l’est aussi sur les autres, et ne revient jamais une fois effacée.',
          'Quanto se fie à l’heure des appareils : si l’un d’eux est mal réglé, un message vous prévient.',
        ],
      },
    ],
  },
  {
    id: 'sauvegarder',
    titre: 'Sauvegarder et récupérer',
    resume: 'Sauvegarde, corbeille et historique des versions.',
    blocs: [
      {
        liste: [
          '**Sauvegarde** : onglet Synchro › Par fichier › **Carnet complet**, puis enregistrez le fichier en lieu sûr (OneDrive, clé USB, e-mail à vous-même). Un rappel s’affiche si vous ne l’avez pas fait depuis un mois (réglable dans Réglages).',
          '**Restaurer une sauvegarde** : onglet Synchro › **Importer un fichier**.',
          '**Corbeille** : une recette supprimée y reste **30 jours** (Réglages › Corbeille › Restaurer).',
          '**Historique** : sur une fiche, menu **⋯ › Historique des versions** montre les versions des 30 derniers jours ; **Restaurer** remet une ancienne version sans rien perdre.',
        ],
      },
    ],
  },
  {
    id: 'exporter',
    titre: 'Imprimer et partager',
    resume: 'PDF, fichier Quanto et JSON.',
    blocs: [
      { image: 'menu-fiche.jpg', legende: 'Le menu ⋯ d’une recette.' },
      {
        liste: [
          '**Imprimer ou PDF** (menu ⋯ d’une fiche) : avec ou sans photo, aux quantités recalculées si un recalcul est en cours. Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » pour obtenir un fichier.',
          '**Partager la recette** : crée un petit fichier Quanto à ouvrir sur un autre de vos appareils (onglet Synchro › Importer un fichier).',
          '**Exporter en JSON** : un format ouvert, lisible par d’autres logiciels.',
          '**Partager un carnet entier** : Réglages › Mes carnets › bouton de partage.',
        ],
      },
    ],
  },
  {
    id: 'reglages',
    titre: 'Les réglages',
    resume: 'Apparence, données et vérifications.',
    blocs: [
      { image: 'reglages.jpg', legende: 'Les réglages : apparence et données.' },
      {
        liste: [
          '**Nom de cet appareil**, utilisé lors des synchronisations.',
          '**Thème** : automatique (selon l’appareil), clair ou sombre. **Taille du texte** : normal, grand ou très grand.',
          '**Mes données** : synchronisation, carnets, corbeille, recettes d’exemple, rappel de sauvegarde et espace utilisé.',
          '**Vérifications** : installation, protection des données, fonctionnement hors ligne.',
        ],
      },
    ],
  },
  {
    id: 'questions',
    titre: 'Questions fréquentes',
    resume: 'Dépannage et réponses rapides.',
    blocs: [
      { sousTitre: 'La synchronisation Wi-Fi ne se lance pas' },
      {
        liste: [
          'Vérifiez que les deux appareils sont sur le **même Wi-Fi** (pas l’un en 4G/5G) et qu’ils ont accès à Internet.',
          'Gardez les deux écrans allumés pendant l’attente, puis réessayez avec un **nouveau code** (un code ne vaut que 2 minutes).',
          'En dernier recours, utilisez le **transfert par fichier** : il fonctionne toujours.',
        ],
      },
      { sousTitre: 'J’ai supprimé ou modifié une recette par erreur' },
      { p: 'Supprimée : **Réglages › Corbeille › Restaurer** (30 jours). Modifiée : sur la fiche, **⋯ › Historique des versions › Restaurer**.' },
      { sousTitre: 'Mes recettes ont disparu de l’iPhone' },
      { p: 'Vérifiez que vous ouvrez Quanto **depuis son icône** et non depuis Safari (ils ont des mémoires séparées). Gardez toujours une sauvegarde complète récente : elle se restaure en un instant.' },
      { sousTitre: 'Je ne vois pas la dernière version' },
      { p: 'Fermez complètement Quanto puis rouvrez-la avec Internet ; touchez **Mettre à jour** quand le message apparaît.' },
      { sousTitre: 'La photo d’un site n’a pas été récupérée' },
      { p: 'Certains sites l’interdisent. Enregistrez l’image sur votre appareil, puis ajoutez-la dans le formulaire (Ajouter une photo).' },
      { sousTitre: 'La lecture d’une photo est mauvaise' },
      { p: 'Rapprochez-vous, éclairez mieux la page, tenez l’appareil bien parallèle et **recadrez** sur la recette. L’écriture manuscrite reste difficile : corrigez dans l’aperçu.' },
      { sousTitre: 'Une recette apparaît en double' },
      { p: 'Ce sont deux recettes distinctes (par exemple les recettes d’exemple ajoutées sur deux appareils). Mettez l’une d’elles à la corbeille : la suppression se propagera à la prochaine synchronisation.' },
      { sousTitre: 'Quanto fonctionne-t-elle sans Internet ?' },
      { p: 'Oui, entièrement, sauf la synchronisation Wi-Fi (quelques secondes d’Internet pour relier les appareils) et la toute première lecture d’une photo (téléchargement de l’outil de lecture, environ 4 Mo).' },
    ],
  },
  {
    id: 'annexe',
    titre: 'Annexe : le fichier de carnet',
    resume: 'Format ouvert des sauvegardes.',
    blocs: [
      {
        p: 'Un fichier de carnet (.zip) contient **quanto.json** — les recettes, carnets et suppressions, au format JSON lisible — et un dossier **photos/** avec les images (WebP ou JPEG). L’export « JSON » ne contient que quanto.json, sans les photos. Ces formats ouverts garantissent que vos recettes ne sont jamais prisonnières de Quanto.',
      },
    ],
  },
]
