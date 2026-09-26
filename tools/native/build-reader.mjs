import { build } from 'esbuild';
import { copyFile,readFile,writeFile } from 'node:fs/promises';
await build({entryPoints:['src/native-reader.ts'],bundle:true,format:'iife',target:['safari15','chrome95'],outfile:'dist/native-reader.js',minify:true});
await copyFile('node_modules/mathpix-markdown-it/es5/bundle.js','dist/native-math.js');
const template=await readFile('native-reader.html','utf8');
await writeFile('dist/native-reader.html',template.replace('<script type="module" src="/src/native-reader.ts"></script>','<link rel="stylesheet" href="./native-reader.css"><script defer src="./native-reader.js"></script>'));
