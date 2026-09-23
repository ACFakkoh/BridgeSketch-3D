# BridgeSketch 3D

**A quick visual tool for bridge concepts** · Version 0.4.0 · 22 September 2026 · Anthony Chéruel

BridgeSketch 3D is a browser-based, interactive 3D bridge configurator. Set a span arrangement, road section, superstructure, supports and site, then explore the result from above, below or along the obstacle being crossed. It runs entirely from local files served by the included offline launcher, or as a static site on GitHub Pages. There is no account, backend, build step or runtime internet dependency.

![The BridgeSketch 3D workspace showing the green river bridge](screenshots/workspace.webp)

## Try the included concepts

Select a concept at the top of the parameter panel. Every concept is editable; changing a parameter creates a custom concept. **Green river haunch** opens by default, with Orbit, Golden hour and moving traffic on.

| Concept | What it shows |
| --- | --- |
| Green river haunch | Three continuous green plate-girder spans, variable depth, river, sidewalk and steel railings |
| NEBT river crossing | Two precast concrete spans with generous shoulders |
| Curved twin boxes | Curved, variable-depth steel boxes over city roads and a railway |
| Low park bridge | Short, variable-depth solid concrete slab beside a river |
| Urban boulevard | Four lanes, concrete median, sidewalks and square-column bents |
| Weathered railway overpass | Skewed steel span with a weathered finish and return walls |

All curated concepts open with return walls. Wingwalls remain an editable option under **Supports**, with a selectable flare angle.

| Green river haunch | Curved twin boxes |
| --- | --- |
| ![Green plate-girder bridge over a river](screenshots/river.webp) | ![Curved steel box bridge over roads and railway](screenshots/box.webp) |
| **Urban boulevard** | **Low park bridge** |
| ![Urban bridge with four lanes and a median](screenshots/urban.webp) | ![Low concrete slab bridge over water](screenshots/slab.webp) |

![Wider bridge site with winter snow cover](screenshots/snow.webp)

## Shape the bridge

- **Model:** 1–8 spans, straight or curved alignment, skew, elevation, crest or constant grade. Each span can cross a road, railway or river.
- **Deck:** total width, 1–8 lanes, editable lane width (3.5 m by default), automatic outer shoulders, solid white lane boundaries, an optional concrete median or raised island, and sidewalks on either or both sides. Sidewalks are 200 mm thick and 3 m wide by default; their width is editable.
- **Structure:** metric NEBT concrete girders, steel plate girders, 2–14 hollow steel boxes, including odd counts, with editable top and bottom flange widths and 1H:4V inclined side webs, or a solid concrete slab. Steel and slab options can deepen smoothly at interior piers. Painted blue-gray, green and gray, plus a weathered-steel finish, are available.
- **Supports:** column bents with round or square columns, editable bent cap width and thickness, pier walls, hammerheads, return walls and adjustable wingwalls.
- **Site:** rural meadow or urban surroundings, meadow-grass or winter-snow terrain, editable terrain width (140 m default), obstacle dimensions and clearance, 2H:1V approach embankments with abutment-aligned toes, blue studio or pure-white background. Four locally bundled Kenney building types populate urban scenes. Buildings and trees stay outside the bridge corridor and between crossing roads or railways; urban mode has no trees.

The scene has textured concrete, asphalt and meadow surfaces, river motion, rectangular HSS railings, roadside W-beam guardrails, detailed steel bracing and seven locally bundled [Kenney Car Kit](https://kenney.nl/assets/car-kit) vehicle styles. Three [Kenney Train Kit](https://kenney.nl/assets/train-kit) consists—diesel freight, bullet and city passenger—can be selected for railway crossings or mixed between crossings. Each railway crossing has one seeded 4–12-car train, with time between passes. The river uses locally bundled CC0 water colour and ripple-normal textures. Vehicle paint, glazing, tyres and metal use separate materials. Traffic follows the right-hand lanes; its motion can be turned off under **Deck**, and cars, trucks and trains can be hidden entirely.

## Explore and export

Drag to orbit, right-drag to pan and scroll to zoom. The **Time of day** slider moves the sun from 06:00 to 20:00 and updates light and shadows live; **Golden hour** jumps to 17:30, the default. The selected hour is saved with the bridge and included in share links. Use **3D**, **Plan** or **Elevation** for a fixed view; **Fit** reframes the bridge. **Drive** travels along the road, railway or river beneath a span near the middle of the bridge while looking toward the structure. Press **Escape** to return. **Reveal structure** hides the deck and concrete haunches, **Focus** expands the canvas, and **Dock below** moves the controls to the bottom.

**Save/Open** preserves the editable configuration as JSON. **Copy link** includes both parameters and the camera position. **Snapshot** exports a PNG with the selected background, and **Export GLB** creates a static 3D model. Shared localhost links require the recipient to run the offline server; a link from a published Pages site opens directly.

## Run offline

Download and extract the **offline** archive. On Windows, double-click `OPEN_OFFLINE.cmd` and keep its PowerShell window open, then visit [http://127.0.0.1:5174/](http://127.0.0.1:5174/). It uses Windows' built-in PowerShell web server; Node.js and an internet connection are not required. Do not open `index.html` as a `file://` URL, because browser module loading prevents that mode.

For local development from the source folder, run `node serve.mjs` and open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## Publish on GitHub Pages

The [BridgeSketch 3D repository](https://github.com/ACFakkoh/BridgeSketch-3D) keeps the publishable static app at the root of **main**: `index.html`, `app.mjs`, `models/`, `textures/`, `vendor/`, screenshots and this README. No build command is needed. If **Settings → Pages** is set to **Deploy from a branch**, **main**, **/ (root)**, each push to main publishes the updated app at [ACFakkoh.github.io/BridgeSketch-3D](https://acfakkoh.github.io/BridgeSketch-3D/). A Pages deployment can take a few minutes; refresh after it completes. Relative asset paths also work under a repository URL. See [GITHUB_PAGES.md](GITHUB_PAGES.md) for first-time setup and updating.

The separate local source project keeps runtime files in `dist/`. To make matching offline and GitHub Pages archives after changing them, run `powershell -NoProfile -File .\package-release.ps1`. The packaging script preserves earlier release folders and refuses to overwrite an archive with the same version; move a prior archive aside first if you are refreshing version 0.4.0.

## Check a source change

With Node.js 24 or newer, run `node check.mjs`. It checks configuration validation and round trips, actual structure geometry, embankment and scenery boundaries, traffic lane placement, curated presets and finite mesh data. For the offline launcher, run `OPEN_OFFLINE.ps1 -NoBrowser` and then `check-offline.ps1` in a second PowerShell window. Use a modern desktop browser with WebGL 2 and hardware acceleration for the 3D view.

## Scope and credits

BridgeSketch 3D is for concept visualization. It does not perform structural sizing, standards checks, hydraulic analysis or construction detailing. Clearances use a conservative whole-span estimate; site-specific road tie-ins and certified barrier details require engineering review.

The optional wingwall rendering remains an area for refinement; use return walls for presentation-ready concepts.

Vehicle geometry comes from **Kenney Car Kit 3.1**, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), and is adapted and bundled for offline use. [Vehicle credits](models/VEHICLE_CREDITS.md) and [train/building credits](models/SCENE_CREDITS.md) include source links and retained licences. [Texture credits](dist/textures/CREDITS.md) and [generated texture notes](dist/textures/GENERATED.md) document the local surfaces; Three.js vendor notices are under `vendor/`.
