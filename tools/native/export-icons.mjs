import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = new URL('../../', import.meta.url)
const source = await readFile(new URL('assets/brand/onlyideas-icon.svg', root), 'utf8')
async function png(path, size, svg = source) {
  const url = new URL(path, root)
  await mkdir(new URL('.', url), { recursive: true })
  // Rasterize the vector at the requested output resolution. Never enlarge a PNG.
  let pipeline = sharp(Buffer.from(svg), { density: size / Number(svg.match(/width="(\d+)"/)[1]) * 72 }).resize(size, size)
  if (!path.endsWith('ic_launcher_round.png')) pipeline = pipeline.flatten({ background: '#347fe4' })
  await pipeline.png().toFile(fileURLToPath(url))
}
await png('assets/brand/onlyideas-icon-1024.png', 1024)
await png('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', 1024)
await png('store/google/icon.png', 512)
await writeFile(new URL('public/mark.svg', root), source)
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  await png(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`, size)
  const round = source.replace('<defs>', '<defs><clipPath id="circle"><circle cx="512" cy="512" r="512"/></clipPath>').replace('<rect width=', '<g clip-path="url(#circle)"><rect width=').replace('</svg>', '</g></svg>')
  await png(`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`, size, round)
}
const paths = source.match(/<g id="mark">([\s\S]*?)<\/g>/)[1]
const vectorPaths = paths.trim().replaceAll('<path ', '<path android:').replaceAll(' d=', ' android:pathData=').replaceAll(' fill=', ' android:fillColor=').replaceAll(' stroke=', ' android:strokeColor=').replaceAll(' stroke-width=', ' android:strokeWidth=').replaceAll(' stroke-linecap=', ' android:strokeLineCap=').replaceAll('android:d=', 'android:pathData=').replaceAll('android:fillColor="none"', 'android:fillColor="#00000000"')
const vector = `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="1024" android:viewportHeight="1024">${vectorPaths}</vector>\n`
await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_foreground.xml', root), vector)
await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_mark.xml', root), vector.replace('><path', '><path android:fillColor="#347fe4" android:pathData="M180 0H844Q1024 0 1024 180V844Q1024 1024 844 1024H180Q0 1024 0 844V180Q0 0 180 0Z"/><path'))
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#f6f4ed"/><svg x="1110" y="1110" width="512" height="512" viewBox="0 0 1024 1024">${source.replace(/<svg[^>]*>|<\/svg>/g,'')}</svg></svg>`
await png('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',2732,splash)
console.log('Exported crisp OnlyIdeas icons from the vector master.')

await writeFile(new URL('android/app/src/main/res/drawable/onlyideas_background.xml', root), '<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt" android:width="108dp" android:height="108dp" android:viewportWidth="1024" android:viewportHeight="1024"><path android:pathData="M0 0H1024V1024H0Z"><aapt:attr name="android:fillColor"><gradient android:type="linear" android:startX="0" android:startY="0" android:endX="1024" android:endY="1024"><item android:offset="0" android:color="#0dc9b8"/><item android:offset="0.48" android:color="#347fe4"/><item android:offset="1" android:color="#7949d8"/></gradient></aapt:attr></path></vector>\n')
