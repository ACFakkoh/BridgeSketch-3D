# BridgeSketch 3D

## 0.5.0 — 2026-09-25 — Anthony Chéruel

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
