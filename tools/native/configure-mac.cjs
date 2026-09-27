// Derive a native SwiftUI Mac Catalyst target without the iOS-only Capacitor binary.
// The mobile target retains its existing plugins and callback handling.
const fs = require('fs');
const xcode = require('xcode');
const project = xcode.project('ios/App/App.xcodeproj/project.pbxproj').parseSync();
const o = project.hash.project.objects;
const app = o.PBXNativeTarget['504EC3031FED79650016851F'];
app.name = 'OnlyIdeas'; app.productName = 'OnlyIdeas';
app.packageProductDependencies = []; app.dependencies = [];
app.buildPhases = app.buildPhases.filter(x => !x.value.startsWith('BC'));
o.PBXProject['504EC2FC1FED79650016851F'].targets = [{value:'504EC3031FED79650016851F',comment:'OnlyIdeas'}];
o.PBXProject['504EC2FC1FED79650016851F'].packageReferences = [];
o.PBXFrameworksBuildPhase['504EC3011FED79650016851F'].files = [];
o.PBXSourcesBuildPhase['504EC3001FED79650016851F'].files = o.PBXSourcesBuildPhase['504EC3001FED79650016851F'].files.filter(x => !x.value.startsWith('BC'));
o.PBXResourcesBuildPhase['504EC3021FED79650016851F'].files = o.PBXResourcesBuildPhase['504EC3021FED79650016851F'].files.filter(x => x.value !== '504EC30D1FED79650016851F');
o.PBXFileReference['504EC3041FED79650016851F'].path = 'OnlyIdeas.app';
for (const key of ['504EC3171FED79650016851F','504EC3181FED79650016851F']) {
  const b = o.XCBuildConfiguration[key].buildSettings;
  Object.assign(b, {
    PRODUCT_NAME:'OnlyIdeas', INFOPLIST_FILE:'App/MacInfo.plist',
    SUPPORTS_MACCATALYST:'YES', DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER:'NO',
    SUPPORTED_PLATFORMS:'"macosx"', MACOSX_DEPLOYMENT_TARGET:'13.0',
    IPHONEOS_DEPLOYMENT_TARGET:'16.0', ASSETCATALOG_COMPILER_APPICON_NAME:'MacIcon',
    CODE_SIGN_ENTITLEMENTS:'App/Mac.entitlements', ENABLE_HARDENED_RUNTIME:'YES',
    PROVISIONING_PROFILE_SPECIFIER:'"OnlyIdeas Mac Catalyst App Store"', TARGETED_DEVICE_FAMILY:6
  });
}
// Remove unreachable Watch / UI-test objects and references from this project.
for (const section of Object.values(o)) {
  for (const key of Object.keys(section)) {
    if (key.startsWith('BC') || key.startsWith('D000')) delete section[key];
  }
}
for (const group of Object.values(o.PBXGroup)) {
  if (group?.children) group.children = group.children.filter(x => {
    const ref = typeof x === 'string' ? x : x.value;
    return !ref.startsWith('BC') && !ref.startsWith('D000');
  });
}
const dir='ios/App/OnlyIdeasMac.xcodeproj';fs.mkdirSync(dir+'/xcshareddata/xcschemes',{recursive:true});
fs.writeFileSync(dir+'/project.pbxproj',project.writeSync());
fs.writeFileSync(dir+'/xcshareddata/xcschemes/OnlyIdeas.xcscheme',`<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2630" version="1.3">
 <BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="504EC3031FED79650016851F" BuildableName="OnlyIdeas.app" BlueprintName="OnlyIdeas" ReferencedContainer="container:OnlyIdeasMac.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction>
 <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="504EC3031FED79650016851F" BuildableName="OnlyIdeas.app" BlueprintName="OnlyIdeas" ReferencedContainer="container:OnlyIdeasMac.xcodeproj"/></BuildableProductRunnable></LaunchAction>
 <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`);
