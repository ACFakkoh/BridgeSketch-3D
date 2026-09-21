# Recommended next steps for BridgeSketch 3D

Based on the completed 0.3.0 viewer. My recommended order is usefulness first, then presentation polish.

1. **A live, dimensioned cross-section.** Let the user slide a station marker along the bridge and see deck width, each 3.5 m lane, shoulders, median, sidewalks, girders and slab depth. Add direction arrows and an SVG export. This would make the new road layout immediately understandable and expose geometry mistakes before a presentation.
2. **Save and compare concepts A/B.** Name two alternatives and switch between them with the same camera, or view them side by side. Show the differences in spans, width, structural depth and nominal deck area. Keep this local through JSON first; accounts and a database are unnecessary.
3. **Better approach-road and terrain control.** Add ground elevations at abutments and approach endpoints, then a proper road tie-in profile. Show cut/fill and retaining-wall extents in plan. This addresses the main remaining simplification: current approaches are short tangent extensions, not site-specific road designs.
4. **One-click concept sheets.** Export a clean title block with Anthony Chéruel, version/date, plan, elevation, cross-section, perspective and a concise parameter schedule. Keep white-background images and editable SVG dimensions so sheets remain useful outside the viewer.
5. **Presentation and performance polish.** Add saved camera bookmarks, a small scene-quality selector and a curated set of realistic bridge presets. Measure render/update cost on a typical laptop before adding moving traffic or larger environments.

**Start with the cross-section.** It improves model comprehension, validation and exports at once. The crossing tour now supplies the immersive presentation feature; the next release should make technical review just as clear.
