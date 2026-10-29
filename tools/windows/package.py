#!/usr/bin/env python3
"""Package the already-built Windows application without modifying user profiles."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[2]
source=root/'release/windows-1.0.10-x64'
assert (source/'OnlyIdeas.exe').is_file()
archive=root/'release/OnlyIdeas-1.0.10-windows-x64-preview.zip'
files={p.relative_to(source).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
readme='''OnlyIdeas for Windows · 1.0.10 preview

Extract the entire folder, then open OnlyIdeas.exe. Keep its files together.
Windows 10 (version 2004 or later) / Windows 11, x64.
Microsoft Edge WebView2 Runtime is required. The app offers Microsoft's download
page if it is missing. The .NET runtime is included; no administrator access is needed.

Sign in through your system browser. Return to OnlyIdeas when it finishes.
Use the reader toolbar for Contents, Search, Highlights and private Notes.
Click a figure to enlarge it. Refresh: F5. Back: Alt+Left.
Your account, papers and saved notes use the existing OnlyIdeas service.
First launch and synchronization need an internet connection.

This preview is unsigned. The reader was checked on Windows 11 with WebView2:
opening a public paper, contents, search and figure enlargement passed.
Real provider sign-in, accessibility and an installer remain unqualified.
It is not a Microsoft Store release.

OnlyIdeas: https://agent.onlyideas.art
Support: https://github.com/lachlanchen/OnlyIdeasApp/issues
'''
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name in sorted(files):z.write(source/name,'OnlyIdeas/'+name)
 z.writestr('OnlyIdeas/README.txt',readme)
 z.writestr('OnlyIdeas/SHA256SUMS.txt','\n'.join(h+'  '+name for name,h in sorted(files.items()))+'\n')
qa=root/'.runtime/reader-windows-20261029'
qualified=False
if (qa/'windows-execution.json').is_file() and (qa/'windows-binaries.json').is_file():
 result=json.loads((qa/'windows-execution.json').read_text(encoding='utf-8-sig'))
 qualified=result.get('result',{}).get('passed') is True and result.get('all409BinaryHashesMatched') is True and json.loads((qa/'windows-binaries.json').read_text())==files
receipt={'artifact':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'files':len(files),'runtime':'win-x64','selfContained':True,'signed':False,'windowsRuntimeTested':qualified,'providerSignInTested':False}
(root/'.runtime/reader-windows-20261029/windows-package.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
