# BridgeSketch 3D — suivi des travaux

Mise à jour : 2026-09-25. Source de vérité pour les changements locaux et leur état de publication.

## Correctifs 0.4.3

- [x] Mur en retour et garde-grève : sommets suivant le profil vertical, le biais et la courbe de la chaussée.
- [x] Chanfreins visuels de 15 × 15 mm sur les arêtes des éléments de béton concernés, y compris les chasse-roues.
- [x] Chevêtre de bent : épaisseur réglable aux extrémités; épaisseur du chevêtre assortie au mur de pile ou au hammerhead.
- [x] Option Midnight retirée; curseur de l'heure conservé, transition lumineuse graduelle et effet Golden hour rétabli.
- [x] Trains placés sur la voie de droite selon leur sens de marche; circulation routière inchangée.
- [x] Zone de hauteur constante de 400 mm au-dessus des appareils d'appui; poutres à hauteur variable pour une travée, plus hautes aux culées.
- [x] Chaussée et talus d'approche prolongés jusqu'à la coupe du terrain, y compris avec courbe et biais; fermeture arrière en herbe jusqu'aux pieds des talus.
- [x] Terrain et talus empêchés de dépasser au-dessus des murs en retour.
- [x] Textures de béton et de pierre CC0 de Poly Haven intégrées localement.
- [x] Finitions de poutres AMS 10045, 14109, 16314, 15056, 15065, 15090 et 11086; sélection personnalisée et code hexadécimal.
- [x] Caissons en acier : deux semelles supérieures distinctes de 500 × 50 mm, sans paramètre public « Box top flange »; possibilité d'un seul caisson et de zéro voie routière.
- [x] Goussets de béton de 500 mm alignés sur chaque semelle supérieure, y compris lorsque la hauteur du caisson varie.
- [x] Âmes inclinées des caissons raccordées aux deux extrémités de la semelle inférieure à chaque section; inclinaison 1H:4V entre semelles. Largeur du caisson et de la semelle inférieure ajustées par la disposition automatique.
- [x] Contreventements suivant le biais du pont.
- [x] Commandes « Show traffic » et « Moving traffic » déplacées près de « Reveal structure ».
- [x] Garde-corps HSS 210A, 210C et 20C : hauteurs de 870/1400/1400 mm, poteaux aux 3 m et barrotins 20C aux 100 mm.
- [x] Chasse-roue en béton de 450 × 280 mm : face extérieure verticale, face côté circulation inclinée, chanfreins sur les arêtes.
- [x] Garde-corps différent à gauche et à droite; protection facultative côté circulation devant chaque trottoir.
- [x] Talus devant les culées en herbe, pierre ou béton; cônes d'approche 90° en herbe ou en pierre indépendamment du revêtement devant la culée.
- [x] Vue « Section » transversale avec station réglable et export SVG; dessin synchronisé avec les caissons, goussets et chasse-roues.

## Vérification des correctifs

- [x] `node check.mjs` : validation des paramètres, coupes de caisson, appuis, murs, talus, emprises aux coupes, trains, textures et génération de scènes représentatives.
- [x] Navigateur local : pont courbe et biais, caisson unique de passerelle, coupe aux stations 0,5 m et 20 m, garde-corps dissymétriques, revêtements de talus et éclairage à 20 h/20 h 30.
- [x] Console du navigateur sans erreur ni avertissement sur les scénarios contrôlés.
- [x] Archives 0.4.3 générées; contenu contrôlé et serveur hors ligne testé sur le paquet livré.
- [x] Navigateur 0.4.3 : preset « Curved twin boxes » et coupe transversale chargés sans erreur de console.
- [x] Compte rendu des correctifs publié sur Notion, sous « Travail ATRL / Python projects / Bridge Sketch 3D » : [TASKS — BridgeSketch 3D](https://app.notion.com/p/3e5e798a151f818b97b1fd28f197b45d).
- [x] Correctifs 0.4.3 publiés sur GitHub après vérification locale complète : commit `d00a1bc9254fe6bd453220ec41a93e8ba203ac25`; métadonnées 0.4.3 servies par GitHub Pages (HTTP 200).

## Nouvelles fonctionnalités et R&D — après publication des correctifs

- [x] Comparer les bibliothèques d'herbe Three.js proposées et estimer le budget géométrique avant intégration; maintenir la prairie instanciée existante.
- [x] Comparer `threejs-water` au rendu actuel; offrir une option de rivière réfléchissante dans le shader existant, avec une seule passe de rendu d'eau.
- [x] Ajouter des cyclistes bas-poly mobiles en remplacement facultatif des voitures et camions sur le tablier; modèles natifs cohérents avec le style Kenney après examen des sources disponibles.
- [x] Vérifier les passerelles de 3 à 6 m : une voie cyclable de 1,8 m, 2 à 4 poutres acier ou un seul caisson; preset « Cycle footbridge » de 4,2 m.
- [x] Étudier `@takram/three-clouds` et `3DTilesRendererJS`; ajouter une option de ciel nuageux procédural animé en un appel de rendu.
- [x] Améliorer le coucher de soleil et la rivière; conserver les cartes de feuillage et de prairie existantes, dont le style est déjà compatible avec les références et le budget de scène.
- [x] Tester les nouvelles options dans `check.mjs` et en navigateur : passage cyclistes↔voitures, 3 m avec quatre poutres et caisson unique, coupe transversale, rendu midi/coucher de soleil, console propre et export GLB réussi.
- [x] Deuxième compte rendu Notion publié sous « Travail ATRL / Python projects / Bridge Sketch 3D » : [BridgeSketch 3D — R&D 0.5.0 et vérification](https://app.notion.com/p/3e6e798a151f819790f2e6e036e46a5a).
- [x] Contrôler les archives GitHub Pages et hors ligne 0.5.0, le lanceur local, le préréglage passerelle dans le paquet, la console et le rendu visuel.
- [x] Pousser les nouvelles fonctionnalités 0.5.0 sur GitHub après vérification : commit `192b05d`; la page publique sert `release.mjs` en version 0.5.0 (HTTP 200).

### Mesures et décisions préalables — 2026-09-24

- Scène rivière rurale 0.4.3, navigateur local : 483 814 triangles, 65 appels de rendu, 65 géométries, 1,4 ms CPU pour une image mesurée par `performance.now()` autour de `renderer.render`, reconstruction 419 ms. Ce temps CPU n'est pas une mesure GPU ni une moyenne FPS.
- `three-stylized` : densité par défaut de 40 brins/m² et 4 segments par brin. Sur l'emprise nominale de 159 × 140 m, cela demanderait environ 890 000 brins avant masquage; même un masquage de 50 % laisserait environ 3,6 millions de triangles si chaque segment forme deux triangles. La scène actuelle plafonne à 60 000 touffes et en exclut les chaussées, cours d'eau et ouvrages. Ce calcul de budget précède toute intégration; il n'est pas un benchmark GPU de la bibliothèque. Conserver la végétation instanciée actuelle.
- `stylized-components` : composants Next.js/React Three Fiber, GLB et shaders multiples; inadaptés au visualiseur Three.js statique autonome. Aucun composant intégré.
- `threejs-water` : simulation d'ondes avec textures GPU ping-pong, caustiques et passes de réflexion/réfraction conçues pour un bassin; coût de plusieurs passes par image sur une scène qui tourne déjà continuellement avec rivière. Choix confirmé : variante d'eau réfléchissante dans le shader existant, sans cette dépendance.
- `@takram/three-clouds` : nuages volumétriques et post-traitement, avec résultats publiés de 36–53 FPS en préréglage bas sur iPhone 13; coût trop élevé pour la scène de pont mobile. `3DTilesRendererJS` diffuse des tuiles géospatiales, sans fonction de génération de nuages. Ciel procédural Three.js intégré : un appel de rendu supplémentaire, sans cible intermédiaire.
- Cyclistes : recherche Kenney/Poly Pizza/OpenGameArt. Le Car Kit Kenney fournit les voitures existantes, pas de cycliste prêt à l'emploi; modèle vélo + pilote bas-poly natif, intégré sans téléchargement et exportable en GLB.
- Scène « Cycle footbridge » 0.5.0 : 400 010 triangles, 27 appels de rendu sans nuages et 28 avec nuages; reconstruction entre 159 et 185 ms sur les échantillons observés. Temps CPU par image mesurés entre 0,4 et 2,3 ms selon l'échantillon; ces valeurs ne sont ni des mesures GPU ni une garantie de FPS. L'option nuages ajoute un seul appel de rendu.

## Journal de publication

- 0.4.1 a été publiée dans une session précédente.
- 0.4.2 a été poussée en plusieurs commits jusqu'à `23bb6a4`.
- 0.4.3 rassemble les ajustements de caisson, goussets, chasse-roue, coupe transversale et revêtements de talus. Tests, scénarios visuels, archives et démarrage hors ligne approuvés avant le push GitHub `d00a1bc`.
- 0.5.0 ajoute la passerelle cyclable, les cyclistes, la rivière réfléchissante et les nuages dynamiques. Tests Node, interface, console, export, archives et page publique vérifiés avant et après le push GitHub `192b05d`.
