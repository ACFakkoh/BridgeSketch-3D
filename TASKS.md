# BridgeSketch 3D — suivi des travaux

Mise à jour : 2026-09-28. Source de vérité pour les changements locaux et leur état de publication.

## 0.6.0 — demandes Notion « Bridge Sketch 3D fix and features for 0.6 » (local, non publié)

- [x] Mobile : vue 3D en haut (ratio fixe), paramètres dessous, barres compactes défilantes, cadrage adapté.
- [x] Ciel étoilé procédural selon la seed (≈ 4 200 étoiles, couleurs de corps noir, scintillement, masquées par les nuages) + Voie lactée discrète.
- [x] Sky-Shader (Preetham) testé : option « Physical »; le ciel stylisé reste par défaut (golden hour mieux maîtrisée, même coût).
- [x] Herbe : trois espèces (prairie, joncs/quenouilles au bord de l'eau, graminées sèches sur les talus), brins effilés.
- [x] Terrain vague sous une travée (« Open ground »), raccordé au terrain voisin.
- [x] Routes franchies : couronne 2 %, chaussée 0,5 m au-dessus du sol, accotements, fossés de drainage.
- [x] Pont : couronne 2 % de part et d'autre d'une ligne réglable, ou dévers uniforme 2/3/4 %.
- [x] Poutres continues par défaut (acier, béton).
- [x] Snapshot : icône appareil photo, rendu haute qualité (jusqu'à 3840 px, ombres 4096), PNG sans perte.
- [x] Double ligne jaune continue (option).
- [x] Garde-corps architectural Samuel-De Champlain (2,4 m, incliné vers l'extérieur, barrotins, blanc-gris).
- [x] Camion train routier : 18 m entre l'essieu avant et le dernier essieu, 4,8 m de haut.
- [x] Améliorations visuelles peu coûteuses : vignette CSS, oiseaux (1 draw call), phares la nuit, chaussée mouillée sous la pluie.
- [x] Deux nouvelles textures de béton : coffrage lisse (joints, trous de tiges) et béton vieilli (coulures).
- [x] NEBT : goussets pleine largeur de semelle (1200 mm).
- [x] Chasse-roues aux approches : plus d'enrobé sous le chasse-roue.
- [x] Poteaux des glissières prolongées à 3000 mm (grille unique pont + approches).
- [x] Chevêtre effilé : effilement linéaire.
- [x] Glissières du pont prolongées jusqu'au bout des murs en retour.
- [x] NEBT : diaphragmes intermédiaires en béton (tableau 8.2-4, un par 15 m).
- [x] Cache-poutres aux culées.
- [x] Deux routes franchies = autoroute à chaussées séparées, une direction chacune.
- [x] Vérifications : `node check.mjs` (nouveaux contrôles 0.6.0), captures Chromium/SwiftShader, test du snapshot (2973 × 2232 px), mobile 390 × 844 et 844 × 390.
- [ ] À valider par Anthony sur son portable et son téléphone : fps (herbe et étoiles), rendu du ciel physique, puis archives et push GitHub.

## 0.5.6 — demandes du 2026-09-27 (local, non publié)

- [x] Orbit désactivé par défaut partout (démarrage et choix d'un préréglage).
- [x] Temps qui défile par défaut : 15 min toutes les 5 s le jour, ×3 la nuit; bouton ❚❚ / ▶ pour arrêter; option enregistrée (`timeFlow`); préréglages à 18 h.
- [x] Golden hour logique : lumière pilotée par la hauteur du soleil (lever 6 h 30, coucher 19 h 30), golden hour vers 19 h (bouton = 19 h 00), puis heure bleue et nuit dès 20 h, sans remontée de luminosité.
- [x] Terrain « cut valley » : rivière qui méandre (±6 m), rives irrégulières, bermes et flancs de vallée variables.
- [x] Caissons en béton précontraint : 1 à 4 caissons sous une même dalle (4,2 m de tablier minimum par caisson), appuis et diaphragmes par caisson, coupe cotée; préréglage viaduc à deux caissons.
- [x] Stats en bas au centre.
- [x] Vérifications : `node check.mjs` (contrôles 0.5.6), captures SwiftShader (vue en plan de la rivière, 18 h / 19 h / 19 h 45, caissons jumeaux).

## 0.5.5 — directives Notion « Bridge Sketch 3D directives 2026-09-27 V2 suite » (local, non publié)

- [x] Arbres réduits (5–10,5 m) par rapport au tablier.
- [x] Trou dans la chaussée d'approche avec une glissière 301 devant le trottoir : la chaussée va jusqu'à la face du trottoir; la glissière 301 continue seulement avec « Continue the bridge railings ».
- [x] Lampadaires 12 m, une seule potence cintrée de 3,0 m (projection horizontale), contre-fiche et entretoises, luminaire DEL plat; instanciés.
- [x] Lampadaires masqués avec « Reveal structure ».
- [x] Nom « Anthony Chéruel » et version sur l'animation de lancement.
- [x] Glissière Type 311 (880 / 460 / 275 mm) et 311 A+B : lisse acier 200 × 150 mm, 400 mm au-dessus du béton, poteaux aux 2 400 mm (3D et coupe).
- [x] Performance : Balanced par défaut; réglage Auto (nom du GPU, puis baisse d'un niveau sous 24 fps); LOD arbres (géométrie « far ») et herbe (amincissement en distance, tuiles de 32 m); ombres recalculées seulement si nécessaire; animation ambiante à 30 fps; réflexion une image sur deux caméra immobile; compteur Stats (fps, CPU, GPU par timer query, appels, triangles).
- [x] Animation de départ : shaders compilés avant la première image (compileAsync), dessin révélé par transformations (compositeur), sans filtres ni flou animés.
- [x] Essai WebGPU : page `lab/webgpu-meadow.html` (Three.js r180 WebGPURenderer, TSL) — herbe (150 000 à 600 000 brins) et pluie (60 000 gouttes) en compute shaders; repli WebGL 2 (`?webgl`). Le visualiseur reste en WebGL 2 (tous les shaders personnalisés sont en GLSL).
- [x] Ombres de nuages mobiles (patch global du terme d'ombre du soleil) et traces d'eau sur les piles dans la rivière (bande humide, coulures, algues).
- [x] Terrain « Follows the road profile » : sol au niveau de la route de part et d'autre des approches, vallée sous le pont en talus 2H:1V parallèles aux culées et aux obstacles.
- [x] Automne : couleurs jaune/orange/rouge des arbres, prairie paille et feuilles au sol; météo « Falling leaves ».
- [x] Nouveaux types : caisson en béton précontraint, portique (sans appareils d'appui), pont à béquilles, arc sous tablier (béton ou acier) et arc à tablier inférieur (bowstring) avec suspentes et contreventement; cinq nouveaux préréglages.
- [x] Vérifications : `node check.mjs` (nouveaux contrôles 0.5.5), captures Chromium/SwiftShader des cinq nouveaux préréglages, coupe du caisson, Reveal, nuit, automne.
- [ ] À valider par Anthony sur son portable : fps en Balanced et Auto (case Stats), page WebGPU, puis archives et push GitHub.

## Correctifs et fonctionnalités — commentaires Notion du 2026-09-27 (local, non publié)

- [x] Options par défaut pour tous les préréglages : nuages dynamiques, rivière miroir calme, qualité High, brume atmosphérique.
- [x] Brume atmosphérique stylisée selon l'heure (option) : bleutée le jour, pêche à l'heure dorée, bleu nuit; fondue dans l'horizon du ciel.
- [x] Limites de scène : largeur de terrain 90–600 m, longueur d'approche 5–200 m.
- [x] Marquage : lignes pointillées 3 m / 6 m entre voies adjacentes (pont et approches), jaune entre sens opposés; ligne centrale jaune pointillée sur les routes franchies.
- [x] Herbe : Balanced = 45 000 touffes (ancien High), High = 85 000; brins nuancés; herbe continue sous le pont (hors appuis, remblais et obstacles).
- [x] Couleur des poutres : peinture satinée non métallique, albédo calibré ×0,88; âme ensoleillée à midi proche du code hex.
- [x] Arbres EZ-Tree (MIT, Daniel Greenheck) : chêne, frêne, tremble instanciés; détail selon la qualité; vent, rétro-éclairage, alpha préservé au loin.
- [x] Piles : colonnes rondes, carrées ou rectangulaires; espacement des colonnes extrêmes réglable (0 = 64 % du tablier), colonnes intermédiaires équidistantes.
- [x] Bords de scène : même coupe de sol sur les 4 côtés et aux coupes d'approche.
- [x] Vue Section : zoom à la molette, déplacement, double-clic pour recadrer; bouton « Save section SVG » retiré.
- [x] Glissières béton Type 201 (880 mm) et Type 301 (1140 mm) à gauche ou à droite; anciens fichiers « concrete » → 201.
- [x] Trottoir séparé par une glissière 301 (dessin 2250) : barrière sur la dalle, trottoir à face verticale derrière.
- [x] Chasse-roue 450 × 280 et bordure de trottoir : face route 35 mm dans 280 mm; trottoir 280 mm, pente 1 % vers la chaussée.
- [x] Appuis des poutres à âme pleine : diaphragme ou contreventement en K selon le tableau 10.5-1 (h, S), 100 mm sous le haut, 150 mm au-dessus du bas.
- [x] Pente devant la culée : départ abaissable (« Slope start below seat »).
- [x] Épaisseur de dalle 200 / 225 / 250 mm (225 par défaut).
- [x] Trains : mélange aléatoire des trois modèles; choix retiré de l'interface.
- [x] « Pedestrian bridge » : aux approches, rien ou chasse-roue + 20C. Pont routier : rien / prolonger les garde-corps / glissière semi-rigide.
- [x] Voie ferrée : ballast de pierre concassée 0,5 m (talus 1,5H:1V); dégagement mesuré au-dessus du ballast.
- [x] Éclairage : lampadaires LED (mâts 10 m, 30 m) ou DEL dans la main courante 20C (3 m, blanc ou jaune), allumage 20 h – 6 h 30, reflets dans l'eau.
- [x] Météo : pluie légère ou neige légère.
- [x] Vérifications : `node check.mjs` (nouveaux tests), console du navigateur, export GLB.
- [x] Ajout du 27/09 (suite) : lampadaires d'un côté, de l'autre ou des deux côtés (quinconce si deux côtés); finition distincte des poutres de rive (catalogue AMS ou couleur libre), aussi dans la coupe; animation de lancement < 5 s (élévation « blueprint » qui se dessine, logo, barre de progression réelle, puis levée du rideau et arrivée de la caméra), passable par clic ou touche, version courte si « réduire les animations ».
- [ ] À valider par Anthony : FPS sur GPU réel en High (≈ 2,4 M triangles avec herbe et arbres), puis version, archives et push GitHub.

## R&D rendu — eau, herbe, ciel (2026-09-26, local, non publié)

Reprise de la R&D 0.5.0 (Notion « BridgeSketch 3D — R&D 0.5.0 et vérification ») avec intégration des techniques de `three-stylized` et `threejs-water`, sans leurs dépendances ni leurs passes multiples.

- [x] Rivière (`dist/water.mjs`) : une réflexion planaire à demi-résolution (plan de coupe oblique, herbe et eau exclues de la passe), Fresnel PBR, carte de vagues tuilable générée (`textures/water-waves.webp`, 3 échelles défilant dans le sens du courant), teinte selon la profondeur réelle, écume de rive, reflets de soleil. « Calm mirror river » = variante plus calme.
- [x] Rive naturelle : la surface d'eau passe 2,5 m sous les berges, relevées d'au moins 0,20 m près de l'eau; la ligne de rive est dessinée par le terrain. Blocs déplacés sur la nouvelle rive.
- [x] Herbe (`dist/grass.mjs`) : touffes de 7 brins courbes (2 triangles/brin), vent GPU cohérent, dégradé pied→pointe, normales redressées, rétro-éclairage au coucher du soleil; densité budgétée (20 000 touffes en Balanced), plus dense près du pont et en taches; fleurs des champs discrètes (hors urbain).
- [x] Ciel (`dist/sky.mjs`) : dégradé jour/coucher, halo solaire, nuages éclairés par le soleil; le même shader est capturé en éclairage d'environnement (PMREM) à chaque changement d'heure. Le dôme sert de fond (sauf fond blanc) et de ciel réfléchi.
- [x] Nouveau réglage « Render quality » : Performance (sans réflexion, ombres 2048), Balanced (défaut), High (réflexion 0,75, herbe dense).
- [x] Vérifications : `node check.mjs` réussi (max 424 897 triangles contre 462 328 avant), console propre, export GLB réussi (mêmes 2 avertissements GLTFExporter qu'en 0.5.0), captures avant/après `screenshots/avant-apres-rendu-2026-09-26.png`.
- [x] Mesures (Chromium SwiftShader, image complète ombres + réflexion + principale) : rivière 3 travées 194 appels / 0,89 M triangles en Balanced, 130 appels / 0,55 M en Performance, contre 128 appels / 0,70 M pour 0.5.0 (GitHub). Ce ne sont pas des mesures GPU.
- [ ] À valider par Anthony sur GPU réel (FPS), puis décider du numéro de version, des archives et du push GitHub.

## Suite 0.5.0 — points 2 à 6 de ClaudeEval (2026-09-26)

- [x] Captures du README régénérées (0.5.0) avec passerelle cyclable et coupe cotée.
- [x] Coupe transversale : chaînes de cotes (zones du tablier, largeur totale, entraxes, hauteur de structure) et cartouche (variante, version, date, auteur).
- [x] Rendu : brume atmosphérique selon l'heure, rivière à effet Fresnel (plus de blanc saturé à midi), berges peu profondes et écume, herbe plus humide près de l'eau et plus sèche sur les talus, pelouse urbaine, blocs de berge gris.
- [x] Refactor : sources formatées (Prettier), `scene.mjs` découpé en six modules, contrôles dans le dépôt (`tests/check.mjs`; `check.mjs` local délègue), `.gitattributes`.
- [x] Diaphragmes intérieurs de 25 mm dans chaque caisson sur chaque ligne d'appui.
- [ ] Historique Git unique : à décider (voir ClaudeEval.md, section 3) — le dossier local garde son ancien `.git`; `tmp/github-push-0.5.0` est le clone de publication.

## Correctifs 0.5.0 — commentaires Notion du 2026-09-26 (version conservée : 0.5.0)

Source : « BridgeSketch 3D Commentaires 2026-09-26 » (Travail ATRL / Python projects / Bridge Sketch 3D). Évaluation complète : `ClaudeEval.md`.

- [x] Pas de chasse-roue sous un garde-corps posé sur un trottoir (bord et protection côté circulation); poteaux ancrés dans le trottoir.
- [x] Cycliste refait (cadre diamant, roues à rayons, cintre, cycliste penché) et animé : roues, pédalier et jambes suivent la distance parcourue.
- [x] Troisième bleu (AMS 15090) retiré; anciens fichiers convertis en 15065.
- [x] AMS 16515 gris clair #C7C9C7 ajouté (aspect pont Saint-Jacques), valeur lue sur ams-std-595-color.com.
- [x] Extrémités des chasse-roues, glissières et de tous les solides balayés fermées en béton (faces d'about orientées vers l'extérieur).
- [x] Travées jusqu'à 150 m (hauteurs de poutres 5 m / 8 m aux appuis); ombres adaptées à la taille du modèle.
- [x] Rayon de courbure jusqu'à 30 m (minimum demi-largeur du tablier + 12 m).
- [x] Blocs d'assise de hauteur constante 150 mm; chevêtres, murs de pile et sièges de culée suivent le dessous des blocs.
- [x] Nom de variante; nom, date et version dans les noms de fichiers JSON / PNG / SVG / GLB.
- [x] Gousset fixé à 50 mm et retiré des paramètres.
- [x] Caisson acier : la semelle inférieure pilote la largeur des caissons, l'espacement et les porte-à-faux (plus de blocage; message avec la largeur maximale si le tablier est trop étroit).
- [x] Contreventements à 8 m maximum par travée; diaphragmes transversaux profonds (âme + semelles) sur chaque ligne d'appui, culées et piles.
- [x] Raidisseurs verticaux 14 mm, hauteur locale et biais suivis : faces intérieures aux contreventements, trois par face à 150 mm aux appuis; aucun sur les caissons.
- [x] Asphalte 65 mm limité à la chaussée; trottoirs, chasse-roues, glissières et terre-pleins posés sur la dalle.
- [x] Caisson à hauteur variable : semelles supérieures droites et parallèles; âmes 1H:4V en section courante, plus raides dans les goussets d'appui. Vérifié visuellement.
- [x] Nouvelle texture d'enrochement 200–300 mm (procédurale, 2 m par tuile, diffuse + normale + rugosité).
- [x] Chanfreins 15 × 15 mm dans la coupe transversale (dalle, trottoirs, chasse-roues, glissières, terre-plein).
- [x] Chevêtre à épaisseur variable : face d'about fermée et texturée.
- [x] Talus devant la culée : 2H:1V depuis la face de la culée jusqu'au terrain, même ligne de pied que les cônes d'approche, pour toute largeur d'obstacle et toute hauteur de poutre; si la place manque, le talus démarre plus bas sur le mur.

### Vérification 2026-09-26

- [x] `node check.mjs` : nouveaux contrôles (150 m, R = 30 m, gousset 50 mm, nom, disposition des caissons par la semelle inférieure, blocs 150 mm, nombres de raidisseurs et diaphragmes, absence de raidisseurs sur caissons, talus avant).
- [x] Test des faces d'about : 0 face inversée (toutes l'étaient dans la version précédente).
- [x] Captures navigateur (Chromium/SwiftShader) : dessous des poutres, contreventements, diaphragmes, caissons variables, cycliste animé, talus avant en enrochement, coupe transversale, travée de 150 m, rayon de 30 m; console sans erreur.
- [x] Interface : semelle inférieure 3,55 → 4,20 m acceptée, 8 m refusée avec largeur maximale; enregistrement `BridgeSketch-Option-A-caissons-elargis_2026-09-26_v0.5.0.json`.

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

- 0.5.0 (révision du 2026-09-26) : correctifs Notion du 2026-09-26, numéro de version conservé.

- 0.4.1 a été publiée dans une session précédente.
- 0.4.2 a été poussée en plusieurs commits jusqu'à `23bb6a4`.
- 0.4.3 rassemble les ajustements de caisson, goussets, chasse-roue, coupe transversale et revêtements de talus. Tests, scénarios visuels, archives et démarrage hors ligne approuvés avant le push GitHub `d00a1bc`.
- 0.5.0 ajoute la passerelle cyclable, les cyclistes, la rivière réfléchissante et les nuages dynamiques. Tests Node, interface, console, export, archives et page publique vérifiés avant et après le push GitHub `192b05d`.
