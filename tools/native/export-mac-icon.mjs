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
 await sharp(source).resize(px,px).flatten({background:'#fdfaf0'}).png().toFile(`${root}/${filename}`);
 images.push({idiom:'mac',size:`${size}x${size}`,scale:`${scale}x`,filename});
}
await writeFile(`${root}/Contents.json`,JSON.stringify({images,info:{author:'xcode',version:1}},null,2)+'\n');
