import sharp from 'sharp';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const project=new URL('../../',import.meta.url);
const source=await readFile(new URL('assets/brand/onlyideas-flow-master.png',project));
const metadata=await sharp(source).metadata();
if(metadata.width<1024||metadata.width!==metadata.height)throw new Error('Icon master must be square and at least 1024 pixels.');
const root=fileURLToPath(new URL('ios/App/App/Assets.xcassets/MacIcon.appiconset',project));await mkdir(root,{recursive:true});
const images=[];
for(const size of [16,32,128,256,512])for(const scale of [1,2]) {
 const px=size*scale,filename=`icon_${size}@${scale}x.png`;
 // Pre-macOS26 Catalyst icons keep their own alpha silhouette. Inset the tile
 // to align with neighbouring Dock icons without changing the approved mark.
 const inset=Math.round(px*.09),tile=px-inset*2;
 const mask=Buffer.from(`<svg width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${tile*.225}" fill="white"/></svg>`);
 const artwork=await sharp(source).resize(tile,tile).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp({create:{width:px,height:px,channels:4,background:'#00000000'}}).composite([{input:artwork,left:inset,top:inset}]).png().toFile(`${root}/${filename}`);
 images.push({idiom:'mac',size:`${size}x${size}`,scale:`${scale}x`,filename});
}
await writeFile(`${root}/Contents.json`,JSON.stringify({images,info:{author:'xcode',version:1}},null,2)+'\n');
