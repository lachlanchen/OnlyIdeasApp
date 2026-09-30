# OnlyIdeas icon

The owner approved the flowing O/idea icon on 30 September 2026. The exact
1254 × 1254 opaque image is `onlyideas-flow-master.png`; do not redraw it from
the former vector. Its [generation prompt and preview](concepts/relaxed-20260930/README.md)
record the original imagegen design.

Run `node tools/native/export-icons.mjs` to export all assets: web marks and
Apple touch icon, iPhone/iPad, Watch, Mac, Android launchers and splash screens,
and the Google Play listing icon. `export-mac-icon.mjs` can also run separately.
Both exporters use paths relative to the script, not the current directory.

`onlyideas-icon.svg` and `public/mark.svg` are compatibility wrappers containing
the new raster image. The PNG master is authoritative. Exports downsample it;
the larger splash canvas contains a 512-pixel image without enlarging the mark.

Android adaptive foregrounds reserve space for launcher masks according to the
[Android adaptive icon guidance](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).
Every platform uses the approved image, including its warm ivory background.
Updating source assets does not alter binaries already uploaded to stores.
