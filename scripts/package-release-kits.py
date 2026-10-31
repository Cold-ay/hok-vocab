"""Create separate source release kits without credentials or build caches."""
import json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
version=json.loads((ROOT/'package.json').read_text())['version']
build=json.loads((ROOT/'release.config.json').read_text())['buildNumber']
common=['src','public','scripts','tests','store/privacy-review.md','store/workflow-templates','README.md','CAPACITOR.md','package.json','package-lock.json','release.config.json','capacitor.config.ts','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','eslint.config.js','index.html','.gitignore']
skip_dirs={'node_modules','.git','.gradle','build','Pods','DerivedData','public','capacitor-cordova-android-plugins','capacitor-cordova-ios-plugins','xcuserdata'}
for platform,folder,native in [('app-store','app-store','ios'),('play-store','play-store','android')]:
    destination=ROOT/'releases'/f'Hok-{version}-{build}-{platform}-source.zip'
    destination.parent.mkdir(exist_ok=True)
    files=set()
    for name in common+[native,f'store/{folder}']:
        source=ROOT/name
        candidates=source.rglob('*') if source.is_dir() else [source]
        for path in candidates:
            if not path.is_file(): continue
            relative=path.relative_to(ROOT)
            # Public web sources are included; copied native WebView build assets are not.
            if any(part in skip_dirs-{'public'} for part in relative.parts): continue
            if relative.parts[:2] == ('ios','App') and 'public' in relative.parts: continue
            if relative.parts[:2] == ('android','app') and 'assets' in relative.parts: continue
            if path.name in {'local.properties','keystore.properties','.DS_Store'}: continue
            if path.suffix in {'.jks','.keystore','.p12','.p8','.mobileprovision','.ipa','.aab','.apk'}: continue
            files.add(path)
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(files): archive.write(path,path.relative_to(ROOT))
        archive.writestr('RELEASE-KIT.txt',f'Hok {version} ({build}) — {platform}\nSOURCE RELEASE KIT. No signed binary or signing credentials included.\nStart with store/{folder}/RELEASE.md\n')
    print(destination)
