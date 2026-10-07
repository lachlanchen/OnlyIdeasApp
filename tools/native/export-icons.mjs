// Package the owner-approved artwork; never redraw or enlarge the master.
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
const source = await readFile(new URL('assets/brand/onlyideas-flow-master.png', root))
const paper = '#fdfaf0'
const metadata = await sharp(source).metadata()
if (metadata.width < 1024 || metadata.height !== metadata.width) throw new Error('Icon master must be square and at least 1024 pixels.')

async function save(path, pipeline) {
  const url = new URL(path, root)
  await mkdir(new URL('.', url), { recursive: true })
  await pipeline.png().toFile(fileURLToPath(url))
}
async function png(path, size) {
  if (size > metadata.width) throw new Error(`Refusing to enlarge icon for ${path}`)
  await save(path, sharp(source).resize(size, size).flatten({ background: paper }))
}
async function rounded(size) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * .225}" fill="white"/></svg>`)
  return sharp(source).resize(size, size).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }])
}
for (const [path, size] of [
  ['assets/brand/onlyideas-icon-1024.png', 1024],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', 1024],
  ['watch/OnlyIdeasWatch/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', 1024],
  ['store/google/icon.png', 512],
  ['public/apple-touch-icon.png', 180],
  ['android/app/src/main/res/drawable-nodpi/onlyideas_artwork.png', 512],
]) await png(path, size)
await save('public/mark-512.png', await rounded(512))

// Preserve existing URLs and web UI references using a self-contained SVG image.
// External image references inside an <img>-loaded SVG are blocked by browsers.
const web = await readFile(new URL('public/mark-512.png', root))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="OnlyIdeas"><image width="512" height="512" href="data:image/png;base64,${web.toString('base64')}"/></svg>\n`
await writeFile(new URL('public/mark.svg', root), svg)
await writeFile(new URL('assets/brand/onlyideas-icon.svg', root), svg)

for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const dir = `android/app/src/main/res/mipmap-${density}`
  const size = 48 * scale
  await save(`${dir}/ic_launcher.png`, await rounded(size))
  const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`)
  await save(`${dir}/ic_launcher_round.png`, sharp(source).resize(size, size).ensureAlpha().composite([{ input: circle, blend: 'dest-in' }]))
  // Android masks a 108dp layer to its central viewport. The approved image has
  // its own whitespace; this inset keeps its complete mark inside the safe area.
  const foreground = await (await rounded(72 * scale)).png().toBuffer()
  await save(`${dir}/ic_launcher_foreground.png`, sharp({ create: { width: 108 * scale, height: 108 * scale, channels: 3, background: paper } }).composite([{ input: foreground, gravity: 'center' }]))
}
await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_foreground.xml', root), '<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@mipmap/ic_launcher_foreground" android:gravity="fill" android:filter="true"/>\n')
await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_mark.xml', root), '<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/onlyideas_artwork" android:gravity="fill" android:filter="true"/>\n')
await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_background.xml', root), `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="${paper}"/></shape>\n`)

const splashMark = await sharp(source).resize(512, 512).toBuffer()
await save('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png', sharp({ create: { width: 2732, height: 2732, channels: 3, background: paper } }).composite([{ input: splashMark, gravity: 'center' }]))
await import('./export-mac-icon.mjs')
console.log('Exported approved OnlyIdeas artwork for web, iOS, Watch, Mac, Android and Google Play.')
