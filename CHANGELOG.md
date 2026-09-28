# BridgeSketch 3D

## 0.5.6 — 2026-09-27 — Anthony Chéruel

- Orbit is off by default, at start-up and when a concept is selected.
- Time runs by default: 15 minutes every 5 seconds by day, three times faster at night (wall-clock, lighting re-applied twice a second); a ❚❚ / ▶ button next to the slider stops or restarts it. The setting is saved (`timeFlow`). Concepts open at 18:00.
- Daylight follows the sun elevation (sunrise 06:30, sunset 19:30): golden hour when the sun is low (peak about 19:05, **Golden hour** = 19:00), then blue hour and night lights from 20:00. The scene no longer brightens again after golden hour.
- Profile-following terrain: the river meanders (about ±6 m) with irregular shorelines, varying berms and valley sides; valley walls undulate away from the bridge.
- Prestressed concrete box girders: 1 to 4 single-cell boxes under one deck slab (at least 4.2 m of deck per box), two bearings and a diaphragm per box on each support line, dimensioned in the section. The Box girder viaduct concept now has twin boxes under a 16.5 m, four-lane deck.
- Stats overlay moved to the bottom centre (the navigation hint hides while it is shown).

## 0.5.5 — 2026-09-27 — Anthony Chéruel

Directives « Bridge Sketch 3D directives 2026-09-27 V2 suite »:

- Fixes: smaller trees (5–10.5 m), no open strip in the approach pavement next to a sidewalk protected by a Type 301 barrier on the bridge (the protection continues only with continued railings), street lights hidden with **Reveal structure**, author name on the launch sequence.
- Street lights: 12 m tapered poles with a transformer base and a single upswept davit arm reaching 3.0 m, curved lower brace and struts, flat LED head; instanced (three draw calls for all poles).
- Barriers: MTQ Type 311 (880 mm, 460 mm base, 275 mm top) and Type 311 A+B with a 200 × 150 mm steel rail 400 mm above the concrete on posts at 2.4 m, in 3D and in the section.
- Structural systems: prestressed concrete box girder; rigid frame (portique) with monolithic supports; strutted frame with inclined legs (béquilles); concrete or steel deck arch with spandrel columns; tied arch with leaning ribs, hangers and wind bracing. Five new concepts: Box girder viaduct, Strutted frame, Concrete deck arch, Steel tied arch, Rigid frame.
- Site: autumn season (tree colours, straw meadow, fallen leaves) and falling-leaves weather; terrain that follows the road profile with 2H:1V valley slopes parallel to the abutments and crossings; moving cloud shadows; water marks on piers in the river.
- Performance: Balanced by default; new Auto quality (GPU guess, then steps down under 24 fps); tree levels of detail (far kit ≈ 450 triangles per tree), distance-thinned meadow in culled 32 m tiles, sun shadows redrawn only when needed, ambient animation capped at 30 fps, reflection refreshed every other frame when the camera is still, lower pixel-ratio caps; shaders compiled before the first frame and a compositor-only launch drawing; Stats overlay with fps, CPU and GPU time (timer query), draw calls and triangles. WebGPU lab page (`lab/webgpu-meadow.html`) with meadow and rain in TSL compute shaders.

## Non publié — correctifs du 2026-09-27 — Anthony Chéruel

- Defaults for every preset: dynamic clouds, calm mirror river, High quality, atmospheric haze (optional, tinted by the hour).
- Deck: MTQ Type 201 / 301 concrete barriers, 301 barrier in front of a sidewalk, 450 × 280 wheel curbs and 280 mm sidewalks with a 35/280 road face and 1 % crossfall; 200/225/250 mm slab; dashed lane lines (yellow between directions); approach barriers: none, continued railings or W-beam (pedestrian bridges: none or curb + 20C).
- Structure: support diaphragm or K-bracing from girder depth and spacing (MTQ Table 10.5-1); rectangular columns and adjustable outer column spacing; adjustable front-slope start; paint colour calibrated to the swatch.
- Site: EZ-Tree procedural trees (MIT), denser meadow (Balanced = former High) continuing under the deck, uniform soil cut faces on all edges, 0.5 m crushed-stone railway ballast (clearance above ballast), random train mix; scene width up to 600 m and approaches up to 200 m.
- Street lights on the left, right or both sides; separate finish for fascia (edge) girders; a launch sequence under 5 s (self-drawing blueprint elevation, wordmark, real progress, curtain lift and camera fly-in; click or key to skip).
- Night lighting (LED street lights or 20C handrail LEDs, 20:00–06:30), light rain and snow, zoomable section view (SVG button removed).

## Non publié — R&D rendu — 2026-09-26 — Anthony Chéruel

- River: half-resolution planar reflection, PBR Fresnel, tileable generated wave normals flowing downstream, depth-based tint, shoreline foam and sun glints; the water plane runs under raised banks so the terrain draws a natural shoreline.
- Meadow: budgeted instanced tufts (7 curved blades) with GPU wind, root-to-tip gradient, up-facing normals and golden-hour back-lighting, denser near the bridge; small wildflowers in rural scenes. Adapted from three-stylized (MIT) ideas.
- Sky: sunset scattering gradient, sun halo and sun-lit clouds; the sky is captured as image-based lighting on each time change and is now the viewport backdrop (except on the white background).
- New Render quality setting (Performance / Balanced / High) for reflection resolution, meadow density, shadow map size and pixel ratio.

## 0.5.0 — 2026-09-26 — Anthony Chéruel

Follow-up of 2026-09-26 (evaluation items 2–6):

- Transverse section with dimension chains (deck zones, total width, girder spacing, structure depth) and a title block (variant, version, date, author).
- Light atmospheric haze sized to the model and tinted by the hour; river with Fresnel depth and roughness (no noon blow-out), shallow banks and foam line; meadow tinted wetter near water, drier on slopes, lawn-like in urban scenes; grey bank boulders.
- Internal 25 mm plate diaphragms inside every steel box on each bearing line.
- Code: sources formatted (Prettier, 120 columns); `scene.mjs` split into `materials`, `sections`, `steel-details`, `railings`, `traffic` and `terrain` modules; developer checks now in the repository as `tests/check.mjs`; `.gitattributes` normalises line endings.
- README screenshots regenerated with 0.5.0, adding the cycle footbridge and the dimensioned section.

Review round of 2026-09-26 (version number kept at 0.5.0):

- Deck: 65 mm asphalt now covers the roadway only; sidewalks, wheel curbs, concrete barriers and medians stand on the slab. Steel railings on a raised sidewalk are anchored in the sidewalk without a wheel curb. The ends of curbs, barriers and every swept solid are closed with outward-facing concrete faces.
- Steel plate girders: cross-frames at 8 m or less in every span, deep transverse diaphragms (web + flanges) on every bearing line at abutments and piers, 14 mm vertical stiffeners following the local depth and the skew — on interior faces at cross-frames, and three at 150 mm on every face at bearings. Box girders get diaphragms but no stiffeners.
- Steel boxes: the bottom flange now drives box width, gaps and cantilevers instead of being rejected; top flanges stay straight and parallel where the box deepens at supports (webs 1H:4V at typical depth, steeper in the haunches).
- Supports: 75 mm bearings sit on constant 150 mm plinths; pier caps, pier walls and abutment seats follow the plinth undersides across the deck. Tapered bent-cap ends are closed and textured.
- Front-of-abutment slopes are 2H:1V from the abutment face to the ground and share the toe line of the quarter cones for any span, obstacle or variable girder depth; when the crossing leaves too little room the slope starts lower on the wall. New procedural 200–300 mm riprap texture for stone slopes and cones.
- Spans up to 150 m, curve radii down to 30 m (at least deck half-width + 12 m), deeper girders (up to 5 m typical, 8 m at supports). Shadows adapt to the model size.
- Deck haunch fixed at 50 mm and removed from the parameters.
- Finishes: AMS 15090 blue removed (old files map to 15065); AMS 16515 light gray (#C7C9C7) added for a Pont Saint-Jacques look.
- Named variants: the name appears in the viewer title and in JSON, snapshot, SVG and GLB file names with the save date and software version (e.g. `BridgeSketch-Option-A_2026-09-26_v0.5.0.json`).
- Cyclists rebuilt with a diamond frame, spoked wheels, drop bars and a leaning rider; wheels, cranks and legs animate with the distance travelled.
- Transverse section: 15 × 15 mm chamfers on concrete outlines, asphalt limited to the roadway, medians drawn, curb-less sidewalk railings and dashed stiffeners. Time and view overlays hide in section view; scene titles gain a stronger shadow for legibility.

Initial 0.5.0 release (2026-09-25):


- Added a cycle-traffic mode with moving low-poly cyclists and a one-span cycle-footbridge preset.
- 3–6 m cycle decks accept one narrow lane, two to four steel plate girders, or one steel box; the 3 m and 6 m extremes are covered by geometry checks.
- Added optional procedural cloud sky and reflective river finish. Clouds follow the time-of-day lighting and drift during animation; both options work offline with no additional runtime packages.
- Tuned sunset gradients and river glints after browser visual checks. Kept the existing instanced meadow and foliage textures after comparing proposed grass, water and cloud packages against the scene budget.
- Recorded library, performance and licensing decisions in `TASKS.md`; GitHub publication follows local checks and the Notion R&D report.

## 0.4.3 — 2026-09-24 — Anthony Chéruel

- Concrete haunches now match their 500 mm steel top flanges, including both moving flanges of variable-depth box girders.
- Each inclined box web starts at the corresponding edge of the bottom flange. Automatic box layout sizes the bottom plate to preserve the 1H:4V web slope at maximum depth.
- Steel-railing wheel curbs keep a vertical outer face and an inclined road-side face, as in the supplied drawings. Their concrete edges retain 15 mm chamfers; the transverse SVG section shows the same shape.
- Concrete facing in front of an abutment no longer changes the separately selected grass or stone approach-cone finish.
- Skewed, curved approach asphalt reaches the full model cut width; the grass-covered rear closure spans both embankment slopes.
- Added `TASKS.md` to track verified fixes, publication and subsequent R&D work.

## 0.4.2 — 2026-09-24 — Anthony Chéruel

- Backwall and return-wall tops follow the actual road profile under skew and curves; concrete edges receive 15 mm chamfers.
- Bent caps can vary in depth at their ends; wall and hammerhead caps match their support thickness.
- Variable-depth steel and concrete girders and concrete slabs retain a 400 mm constant section over bearings, including single spans with deeper abutment ends.
- Steel boxes use two 500 × 50 mm top flanges; a single box and a pedestrian-only deck with zero lanes are supported.
- Independent left and right railings: concrete, HSS 210A / 210C, or 20C pickets. Steel railings sit on trapezoidal 450 × 280 mm concrete curbs, with posts at 3 m. Optional traffic-side sidewalk protection is available.
- Optional 2H:1V front-of-abutment slopes and quarter-cone stone facing, using a bundled CC0 Poly Haven rock texture. Approach fills reach the terrain cut and have closed grass-covered ends.
- Bracing follows support skew; trains use the right-hand track for their direction of travel.
- New station-adjustable transverse deck section view with SVG export. Traffic controls moved beside Reveal structure.
- Girder colours use the selected AMS-STD-595 screen swatches: 10045, 14109, 16314, 15056, 15065, 15090 and 11086, with a custom hex option.
- Removed Midnight mode. The time slider blends daylight continuously through dusk; Golden hour restores the warm 0.3 lighting values.

## 0.4.1 — 2026-09-23 — Anthony Chéruel

- Return walls follow the approach road's vertical profile and horizontal alignment, including skewed supports and curved crests.
- Midnight scene and dark controls, available from the time slider or Midnight button; night views persist in saved concepts, links and snapshots.
- CC0 Poly Haven rough-concrete colour, normal and roughness maps replace the generated concrete surface; steel paint colours are more restrained.
- Steel girders accept a colour picker and validated six-digit hex code, preserved in JSON, links and exports.

## 0.4.0 — 2026-09-22 — Anthony Chéruel

- Railway consists now vary reproducibly from 4 to 12 cars; full-length trains enter and leave the visible railway corridor.
- Live 06:00–20:00 daylight slider moves the sun and shadows; Golden hour remains the 17:30 default and can be restored with one click.
- Editable steel-box bottom flange width preserves 1H:4V web inclination; Reveal structure now hides concrete deck haunches.
- Kenney trains face their direction of travel, with one train per crossing and a gap between appearances.
- Snow terrain mode, wider configurable site width (140 m default), and more detailed meadow-grass texture.
- Three selectable local Kenney Train Kit consists (diesel freight, bullet and city passenger), plus four Kenney suburban/commercial buildings in urban scenes.
- CC0 water colour and ripple-normal textures improve rivers without network requests.
- Steel boxes now allow 2–14 girders, including odd counts. Box width and overhang are laid out together, keeping twin boxes under the deck with a realistic gap.
- Replaced the abstract app icon with a legible bridge-over-water logo.
- Golden hour, orbit and moving right-hand traffic now start enabled. Moving traffic remains optional.
- Six curated bridge concepts; all curated concepts use return walls; wingwalls remain optional.
- Locally bundled CC0 Kenney cars and trucks with dedicated automotive materials replace the old generated shapes and concrete-textured trucks.
- Editable lane width (3.5 m default) and continuous white boundaries at every lane edge, on the bridge and approaches.
- Editable bent-cap width along the road and vertical thickness.
- Richer grass colour, texture and instanced blades, more distinctive green/weathered steel, improved golden-hour/day lighting and detailed steel angle bracing with gussets and bolts.
- Trees and buildings stay out of the zones between adjacent road and rail crossings.
- English GitHub README with screenshots and matching GitHub Pages/offline packages.

## 0.3.1 — 2026-09-21 — Anthony Chéruel

- Drive now follows the road, river or railway in the span nearest the bridge midpoint, approaching and passing beneath the bridge while keeping it in view.
- River tours follow the rendered joined river and its meanders. Road and railway tours follow the actual crossing alignment and level.
- Crossing-road traffic is hidden temporarily; bridge traffic stays visible. Stop/Escape restores the previous camera.

## 0.3.0 — 2026-09-21 — Anthony Chéruel

- Embankment crests move back until the foremost 2H:1V quarter-cone toes meet the actual skewed abutment plane. Curved approaches extend tangentially, preventing tall fills from looping into the span. Retaining-wall lengths follow the fill setback.
- Blue studio or pure-white backgrounds, retained in JSON, share links and snapshots.
- Centre concrete barrier or raised sidewalk/island. Median centres account for side sidewalks; lane placement, markings, width validation and vehicle exclusion share the same layout.
- Seven vehicle silhouettes and seven paint colours, with shaped cabins, mirrors, lights, rims, pickup beds and articulated trailers.
- Driver’s-eye tour at 30 km/h: follows the actual forward lane and grade, hides bridge traffic temporarily and restores the prior view on Stop/Escape.
- Updated offline and GitHub Pages packages, using local assets and relative URLs.

## 0.2.0 — 2026-09-17 — Anthony Chéruel

- New name, bridge logo and navy/teal workspace consistent with QuickerBridge.
- Model, Deck, Structure, Supports and Site tabs; optional bottom dock and full-view Focus mode. Statistics moved into Model info.
- Revised daylight, concrete and asphalt contrast. Steel finish colours use #2B3A5B, #77A662, #435468 and #9A6436 without a dark diffuse texture masking them.
- Steel boxes accept exactly 2 or 4 per span. Four continuous plates form each hollow box; sampled parabolic haunches replace capped staircase segments. Side webs retain 1H:4V inclination.
- Variable-depth slabs use the actual transverse position at skewed supports, keeping the haunch centred on the pier line.
- Square or round bent columns, with editable side length/diameter.
- Approach fills meet the terrain at 2H:1V, with 90° conical end slopes at bridge corners.
- Three rectangular HSS rails with hollow posts, base plates and bolts. Roadside guards use a folded W-beam section with posts and stand-offs.
- Lane centres and vehicle orientation follow right-hand traffic. Sidewalks remain 200 mm thick and vehicles are excluded from them.
- Urban mode omits trees. Full tree/building extents clear the bridge, approaches and crossings.
- Version, date and author in the header and About dialog; saved JSON includes release metadata.
- Matching offline and GitHub Pages archives; no runtime network dependencies or build step.
