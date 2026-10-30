import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {createHash} from 'node:crypto'
import {readFileSync,readdirSync} from 'node:fs'
const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version as string
function sourceRevision(){const hash=createHash('sha256');const walk=(dir:string)=>{for(const entry of readdirSync(new URL(dir,import.meta.url),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir+'/'+entry.name;if(entry.isDirectory())walk(path);else if(entry.isFile())hash.update(path).update(readFileSync(new URL(path,import.meta.url)))}};walk('./src');walk('./public');for(const path of ['./index.html','./package.json','./vite.config.ts'])hash.update(readFileSync(new URL(path,import.meta.url)));return hash.digest('hex')}
export default defineConfig(()=>{const revision=sourceRevision();return {plugins:[react(),{name:'onlyideas-release',generateBundle(){this.emitFile({type:'asset',fileName:'web-release.json',source:JSON.stringify({schema:1,version,revision})})}}],define:{global:'globalThis',__APP_VERSION__:JSON.stringify(version),__APP_REVISION__:JSON.stringify(revision)},server:{watch:{ignored:['**/.runtime/**']},proxy:{'/api':'http://127.0.0.1:18628','/content':'http://127.0.0.1:18628'}},build:{chunkSizeWarningLimit:1600}}})
