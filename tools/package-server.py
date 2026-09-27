#!/usr/bin/env python3
"""Package the built web client and Linux x64 API with only its runtime modules."""
import argparse,hashlib,json,pathlib,shutil,tarfile,tempfile
parser=argparse.ArgumentParser();parser.add_argument('output',type=pathlib.Path);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
modules=['fflate','ipaddr.js','sharp','detect-libc','semver','@img/colour','@img/sharp-linux-x64','@img/sharp-libvips-linux-x64']
assert (root/'dist/index.html').exists(), 'Run npm run build first.'
args.output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='onlyideas-release-') as temp:
 stage=pathlib.Path(temp)
 for name in ['dist','server','worker','tools']:
  shutil.copytree(root/name,stage/name,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 versions={}
 for name in modules:
  shutil.copytree(root/'node_modules'/name,stage/'node_modules'/name)
  versions[name]=json.loads((root/'node_modules'/name/'package.json').read_text())['version']
 shutil.copy2(root/'package.json',stage/'package.json')
 (stage/'runtime-modules.json').write_text(json.dumps(versions,indent=2)+'\n')
 with tarfile.open(args.output,'w:gz') as tar:
  for entry in stage.iterdir():tar.add(entry,arcname=entry.name)
print(hashlib.sha256(args.output.read_bytes()).hexdigest(),args.output)
