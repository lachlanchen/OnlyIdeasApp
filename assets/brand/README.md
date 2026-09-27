# OnlyIdeas icon

Updated 2026-09-27 for build 7 after the owner reported the blurred build 6 icon.
The editable SVG master depicts an open paper/book and a gold idea spark on
emerald. `node tools/native/export-icons.mjs` rasterizes it directly at each
required size, including the opaque 1024×1024 iOS App Store asset, Google listing,
Android density variants and native splash. No low-resolution raster is enlarged.
The Android adaptive foreground is generated as vector paths from the same mark.
