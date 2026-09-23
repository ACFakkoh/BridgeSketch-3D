# Surface textures

CC0 public-domain assets from Poly Haven, bundled locally. Older assets were converted to 1024 × 1024 WebP; the rough-concrete maps are the original 1K JPEGs. No runtime CDN requests.

- Asphalt 01: https://polyhaven.com/a/asphalt_01 — Charlotte Baglioni / Dario Barresi; diffuse + normal, 2.1 m repeat.
- Concrete Wall 009: https://polyhaven.com/a/concrete_wall_009 — Charlotte Baglioni; diffuse + normal, 1.8 m repeat.
- Rough Concrete: https://polyhaven.com/a/rough_concrete — Dimitrios Savva; diffuse + OpenGL normal + roughness, used for bridge concrete.
- Leafy Grass: https://polyhaven.com/a/leafy_grass — Charlotte Baglioni; diffuse, 2 m repeat.
- License: https://polyhaven.com/license

Texture filenames retain their source asset identifiers. Concrete uses normal and roughness mapping; asphalt uses normal mapping. Steel uses a coloured roughness/metalness material. No specular maps are needed for this material workflow.

## River water

The local river colour and normal maps are adapted from CC0 textures shared by Hazmat Harry and qubodup on OpenGameArt:

- [Seamless Water Tiles](https://opengameart.org/content/seamless-water-tiles) by Hazmat Harry: the light and dark water JPEGs were blended and recoloured for the river surface.
- [Three Live Procedurally Generated Tiling Water Textures](https://opengameart.org/content/3-live-proceduraly-generated-tiling-water-textures-512px-running-brushes) by qubodup: the brushwalker 137 tile was converted into the ripple normal map.

Both source pages mark the textures as [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The resulting WebP files are bundled under `textures/`; no runtime download is needed.
