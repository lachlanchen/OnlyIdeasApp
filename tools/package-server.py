#!/usr/bin/env python3
"""Package the built web client and Linux x64 API with only its runtime modules."""
import argparse,hashlib,json,pathlib,shutil,subprocess,tarfile,tempfile
parser=argparse.ArgumentParser();parser.add_argument('output',type=pathlib.Path);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
modules=['fflate','ipaddr.js','sharp','@apple/app-store-server-library','google-auth-library']
assert (root/'dist/index.html').exists(), 'Run npm run build first.'
args.output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='onlyideas-release-') as temp:
 stage=pathlib.Path(temp)
 for name in ['dist','server','worker','tools']:
  shutil.copytree(root/name,stage/name,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 versions={}
 def include(name,parent,optional=False):
  package=next((p/'node_modules'/name for p in [parent,*parent.parents]
                if (p/'node_modules'/name/'package.json').is_file()),None)
  if package is None:
   if optional:return
   raise RuntimeError(f'Missing runtime dependency: {name}')
  relative=package.relative_to(root)
  if str(relative) in versions:return
  metadata=json.loads((package/'package.json').read_text())
  versions[str(relative)]=metadata['version']
  shutil.copytree(package,stage/relative,ignore=shutil.ignore_patterns('node_modules'))
  optional_deps=metadata.get('optionalDependencies',{})
  for dependency in metadata.get('dependencies',{}):
   include(dependency,package,dependency in optional_deps)
  for dependency in optional_deps:include(dependency,package,True)
  for dependency in metadata.get('peerDependencies',{}):
   include(dependency,package,metadata.get('peerDependenciesMeta',{}).get(dependency,{}).get('optional',False))
 for name in modules:include(name,root)
 shutil.copy2(root/'package.json',stage/'package.json')
 (stage/'runtime-modules.json').write_text(json.dumps(versions,indent=2)+'\n')
 # Resolve from this isolated tree, so a missing SDK dependency cannot be
 # accidentally supplied by the development checkout's node_modules.
 subprocess.run(['node','--input-type=module','-e',
   "await import('./server/app.mjs'); const {default:sharp}=await import('sharp'); await sharp({create:{width:1,height:1,channels:4,background:'#fff'}}).png().toBuffer();"],cwd=stage,check=True)
 with tarfile.open(args.output,'w:gz') as tar:
  for entry in stage.iterdir():tar.add(entry,arcname=entry.name)
print(hashlib.sha256(args.output.read_bytes()).hexdigest(),args.output)
