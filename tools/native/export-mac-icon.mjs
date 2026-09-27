import sharp from 'sharp';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const source=await readFile('assets/brand/onlyideas-icon.svg');
const root='ios/App/App/Assets.xcassets/MacIcon.appiconset';await mkdir(root,{recursive:true});
const images=[];
for(const size of [16,32,128,256,512])for(const scale of [1,2]) {
 const px=size*scale,filename=`icon_${size}@${scale}x.png`;
 await sharp(source,{density:px/1024*72}).resize(px,px).flatten({background:'#347fe4'}).png().toFile(`${root}/${filename}`);
 images.push({idiom:'mac',size:`${size}x${size}`,scale:`${scale}x`,filename});
}
await writeFile(`${root}/Contents.json`,JSON.stringify({images,info:{author:'xcode',version:1}},null,2)+'\n');
