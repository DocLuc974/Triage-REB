# Triage REB — installation en mode application (icône sur l'écran d'accueil)

Ce dossier contient l'application **Triage REB** prête à être **hébergée** sur une
URL en `https://` (intranet du CHU, SharePoint, Netlify, GitHub Pages, etc.).
L'hébergement est **obligatoire** pour que l'installation avec icône fonctionne :
un fichier ouvert localement (file://) ne permet jamais l'installation sur Android.

## Contenu
- `index.html` — l'application
- `support.js` — moteur d'affichage (à garder à côté de index.html)
- `manifest.webmanifest` — déclare le nom, l'icône et le mode plein écran
- `sw.js` — service worker (fonctionnement hors-ligne une fois installé)
- `assets/` — logos et icônes
- `zones-multi-pathogenes.json` — liste des zones à risque (Ebola, Lassa, Marburg,
  FHCC, MERS-CoV, Mpox) lue automatiquement par l'application (voir « Zones à risque »).

## Mise en ligne
1. Copier **tout le dossier** tel quel sur l'hébergement, en gardant la structure.
2. Servir en `https://` (requis pour le service worker et l'installation).
3. Ouvrir l'URL de `index.html`.

## Installation sur le téléphone
- **Android (Chrome)** : à l'ouverture, un bandeau « Installer l'application »
  apparaît, ou menu ⋮ → « Installer l'application » / « Ajouter à l'écran d'accueil ».
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

Dans les deux cas, l'app se lance en plein écran avec l'icône REB, sans barre de
navigateur, et fonctionne ensuite hors connexion.

## Zones à risque — mise à jour automatique
Les zones sont chargées depuis `zones-multi-pathogenes.json`. L'application est
livrée avec une **URL par défaut** intégrée :

    https://docluc974.github.io/Triage-REB/zones-multi-pathogenes.json

- **Synchronisation automatique** : à chaque ouverture (si réseau disponible),
  l'app récupère la dernière version du fichier — aucune action de l'utilisateur.
  Hors-ligne, elle conserve les dernières zones connues.
- **Vérification manuelle** : l'écran « Zones à risque & paramètres » propose un
  lien **« Vérifier la source Ebola ↗ »** (fiche COREB Ebola) sous les zones Ebola,
  comme garde-fou.
- **Surveillance automatisée (GitHub Action)** : la fiche COREB Ebola est surveillée
  chaque semaine ; toute modification ouvre une *Pull Request* à valider, qui met à
  jour `zones-multi-pathogenes.json` (voir le dépôt GitHub). Rien n'est publié sans
  validation humaine.

Deux formats de JSON sont acceptés :
1. simple — clés `fhv` (par agent), `mers`, `mpox` ;
2. riche multi-pathogènes — `zones` (= Ebola) + `autres_pathogenes_reb`.
Toute clé absente conserve la valeur intégrée par défaut.

## Mise à jour de l'application
Remplacer les fichiers sur l'hébergement (en gardant la structure).
Le service worker sert les données de zones en **« réseau d'abord »** (les `.json`
sont donc toujours rafraîchis) et la coquille de l'app en cache pour le hors-ligne.
Pour forcer le rafraîchissement complet du cache après une mise à jour de `index.html`,
`support.js` ou `assets/`, incrémenter la version en haut de `sw.js` :
`const CACHE = 'triage-reb-v2';` → `v3`, `v4`, …

Sur l'appareil, recharger avec **Ctrl + Maj + R** (ordinateur) ou fermer/rouvrir
l'app **deux fois** (mobile) pour que le nouveau service worker prenne le relais.
