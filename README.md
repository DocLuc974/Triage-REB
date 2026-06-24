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

## Mise à jour
Remplacer les fichiers sur l'hébergement. Pour forcer le rafraîchissement du cache,
incrémenter la version `CACHE = 'triage-reb-v1'` en haut de `sw.js` (v2, v3, …).
