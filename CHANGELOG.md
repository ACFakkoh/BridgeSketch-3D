# BridgeSketch 3D

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
