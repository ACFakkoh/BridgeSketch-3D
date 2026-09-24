# BridgeSketch 3D — suivi des travaux

Mise à jour : 2026-09-24. Source de vérité pour les changements locaux et leur état de publication.

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
- [x] Correctifs 0.4.3 prêts pour publication sur GitHub après vérification locale complète; commit public précédent : `23bb6a4`.

## Nouvelles fonctionnalités et R&D — après publication des correctifs

- [ ] Comparer les bibliothèques d'herbe Three.js proposées, mesurer coût en triangles, appels de rendu et temps image avant intégration.
- [ ] Comparer `threejs-water` au rendu d'eau actuel et décider si une option est justifiée par la qualité et les performances.
- [ ] Ajouter des cyclistes en remplacement facultatif des voitures et camions, avec un style compatible avec les modèles existants et une source/licence vérifiée.
- [ ] Vérifier les passerelles de 3 à 6 m : une voie cyclable, 2 à 4 poutres ou un seul caisson.
- [ ] Étudier un ciel et des nuages dynamiques; évaluer `three-clouds.js` et l'utilité réelle de `3DTilesRendererJS` pour ce visualiseur.
- [ ] Améliorer la couleur du coucher de soleil, la qualité de l'eau, les arbres et les textures en prenant les exemples Three.js fournis comme références visuelles.
- [ ] Tester les nouvelles options en navigateur et dans `check.mjs`, puis mettre à jour ce journal.
- [ ] Publier un deuxième compte rendu Notion, puis pousser les nouvelles fonctionnalités sur GitHub.

## Journal de publication

- 0.4.1 a été publiée dans une session précédente.
- 0.4.2 a été poussée en plusieurs commits jusqu'à `23bb6a4`.
- 0.4.3 rassemble les ajustements de caisson, goussets, chasse-roue, coupe transversale et revêtements de talus. Les tests, les scénarios visuels, les archives et le démarrage hors ligne sont approuvés avant le push GitHub.
