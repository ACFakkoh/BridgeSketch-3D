# Generated visualization textures

Created using the built-in image generation tool on September 16, 2026. These are AI-generated assets, separate from the CC0 source textures listed in CREDITS.md. Runtime files are resized to 1024 × 1024 WebP; foliage alpha is preserved. No network requests are needed to use them.

## meadow-v2.webp

Prompt: Generate a seamless tileable photorealistic PBR base color texture for a professional architectural bridge visualization: temperate Canadian roadside meadow ground, tightly interwoven short olive and sage green grass, subtle dry straw blades and occasional tiny earthy patches. Orthographic straight down photograph of a 3 metre square area. Flat diffuse overcast light, NO cast shadows, NO directional lighting, NO vignette, NO perspective, NO border, NO text, NO distinct large plants or objects. Natural restrained desaturated greens, fine photographic detail, uniform density and brightness at all edges for tiling. 1024 by 1024 square image. This is a production surface texture, not an illustration.

## foliage-v2.webp

Prompt: Production game/architectural visualization foliage texture. A single irregular airy cluster of small realistic Canadian deciduous leaves and slender branching twigs, viewed front-on. Photographic realism, natural muted olive and forest green summer leaves, subtle variation and visible fine veins. Cluster fills central 85 percent of square image with ragged outer silhouette and MANY small transparent gaps between leaves. Actual transparent background alpha everywhere outside leaves and twigs and in gaps, no white background, no ground, no tree trunk, no pot, no shadow, no text. Flat soft overcast illumination, no baked directional lighting. 1024 square. Intended to be mapped on crossed 3D foliage cards to replace cartoon blob tree canopies.

## fill-v2.webp

Prompt: Seamless tileable photorealistic PBR base color texture of compacted civil engineering embankment fill: sandy taupe brown granular earth, dense fine crushed stone, occasional small angular grey aggregate, subtle compressed horizontal strata with no large distinctive patterns. Square orthographic close photograph representing 2 metres of exposed compacted fill. Flat neutral diffuse lighting, no directional shadows, no perspective, no border, no text, no grass. Realistic restrained brown-grey soil colors not orange. Uniform edges and illumination, production architectural visualization texture, 1024 square.

## Application

- Meadow repeats every 3 metres; fill repeats every 2 metres.
- Foliage uses intersecting leaf cards, alpha-tested shadows and a subtle light contribution to suggest leaf scattering.
- Image-derived bump is a visual approximation, not a measured height or normal map.

## 4K material set

`steel_4k.webp`, `concrete_4k.webp`, and `asphalt_4k.webp` are 4096 × 4096 WebP diffuse maps generated for the 0.4.0 presentation pass. In 0.4.1 the concrete map was replaced by Poly Haven's rough-concrete PBR maps. The steel and concrete generated maps are retained as historical assets; asphalt remains active.
