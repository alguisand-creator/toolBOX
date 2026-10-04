# Bot de rangement ToolBOX

## Utilisation quotidienne
1. Dépose tes fichiers dans `..\ToolBOX-inbox` (dossier créé au premier lancement, à côté de `ToolBOX`).
2. Simulation : `powershell -ExecutionPolicy Bypass -File tools\place-files.ps1`
3. Réel : ajoute `-Apply` (déplace) et `-Push` (commit + push GitHub).

Les fichiers sans règle restent dans l'inbox : ajoute une ligne dans `rules.json`.
Les fichiers remplacés sont sauvegardés dans `..\ToolBOX-backup\<date>`.

## Mise en place de GitHub (une seule fois)
1. Installer Git : https://git-scm.com/download/win (puis rouvrir le terminal).
2. Créer le repo vide sur https://github.com/new (nom `ToolBOX`, sans README), puis dans le dossier ToolBOX :
   ```
   git init
   git add -A
   git commit -m "Premier commit"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/ToolBOX.git
   git push -u origin main
   ```
   Git demandera de te connecter à GitHub dans le navigateur au premier push.
