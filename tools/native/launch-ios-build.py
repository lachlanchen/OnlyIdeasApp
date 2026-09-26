#!/usr/bin/env python3
"""Launch one headless archive in the Mac user's audit session (required by Keychain)."""
import json, os, pathlib, plistlib, subprocess
root = pathlib.Path(__file__).resolve().parents[2]
label = 'art.onlyideas.archive'
domain = f'gui/{os.getuid()}'
previous = subprocess.run(['launchctl', 'print', f'{domain}/{label}'], capture_output=True, text=True)
if previous.returncode == 0:
    if 'state = running' in previous.stdout:
        raise SystemExit('The OnlyIdeas archive is already running.')
    subprocess.run(['launchctl','bootout',f'{domain}/{label}'],check=True)
(root/'release').mkdir(exist_ok=True)
job = root/'release/archive-agent.plist'
log = root/'release/archive.log'
if log.exists(): log.replace(root/'release/archive.previous.log')
env = {'HOME':str(pathlib.Path.home()),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin'}
config = pathlib.Path.home()/'.config/onlyideas/apple/signing.json'
if config.exists():
    if config.stat().st_mode & 0o077:
        raise SystemExit('Signing config must be mode 600.')
    settings = json.loads(config.read_text())
    env.update(ONLYIDEAS_SIGNING_KEYCHAIN=settings['keychain'],
               ONLYIDEAS_SIGNING_PASSWORD_FILE=settings['passwordFile'],
               ONLYIDEAS_MANAGED_KEYCHAIN='1' if settings.get('managed', True) else '0')
job.write_bytes(plistlib.dumps({'Label': label, 'ProgramArguments':['/bin/bash',str(root/'tools/native/build-ios.sh')], 'WorkingDirectory':str(root), 'RunAtLoad':True, 'ProcessType':'Background', 'StandardOutPath':str(log),'StandardErrorPath':str(log),'EnvironmentVariables':env}))
subprocess.run(['launchctl','bootstrap',domain,str(job)],check=True)
print(f'OnlyIdeas archive started. Inspect {log}; cleanup: launchctl bootout {domain}/{label}')
