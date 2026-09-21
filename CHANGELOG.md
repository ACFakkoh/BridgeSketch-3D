# BridgeSketch 3D

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
