#!/bin/bash
set -euo pipefail
# Run from this checkout on the Mac. Signing material belongs to ~/.config/onlyideas/apple.
onlyideas_root=$(cd "$(dirname "$0")/../.." && pwd)
onlyideas_release="${ONLYIDEAS_RELEASE:-1.0.10-42}"
[[ "$onlyideas_release" =~ ^[0-9]+\.[0-9]+\.[0-9]+-[0-9]+$ ]] || { echo "Invalid release identity" >&2; exit 1; }
onlyideas_version="${onlyideas_release%-*}"
onlyideas_build="${onlyideas_release##*-}"
onlyideas_keychain=${ONLYIDEAS_SIGNING_KEYCHAIN:-"$HOME/Library/Keychains/onlyideas-release.keychain-db"}
onlyideas_password_file=${ONLYIDEAS_SIGNING_PASSWORD_FILE:-"$HOME/.config/onlyideas/apple/release-keychain.pass"}
onlyideas_password=$(tr -d '\r\n' < "$onlyideas_password_file")
security unlock-keychain -p "$onlyideas_password" "$onlyideas_keychain"
if [[ ${ONLYIDEAS_MANAGED_KEYCHAIN:-1} == 1 ]]; then
  security set-keychain-settings -ut 14400 "$onlyideas_keychain"
  trap 'security lock-keychain "$onlyideas_keychain"' EXIT
  security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$onlyideas_password" "$onlyideas_keychain" >/dev/null
fi
unset onlyideas_password
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
onlyideas_profile="$HOME/.config/onlyideas/apple/OnlyIdeas_Mac_Catalyst_App_Store.provisionprofile"
onlyideas_profile_id=$(security cms -D -i "$onlyideas_profile" | plutil -extract UUID raw -o - -)
cp "$onlyideas_profile" "$HOME/Library/MobileDevice/Provisioning Profiles/$onlyideas_profile_id.provisionprofile"
cp "$onlyideas_profile" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/$onlyideas_profile_id.provisionprofile"
cd "$onlyideas_root/ios/App"
xcodebuild -project OnlyIdeasMac.xcodeproj -scheme OnlyIdeas -configuration Release -destination "generic/platform=macOS,variant=Mac Catalyst" -archivePath "$onlyideas_root/release/OnlyIdeas-macOS-$onlyideas_release.xcarchive" -derivedDataPath "$onlyideas_root/release/DerivedDataMacRelease" -jobs 1 archive ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO SWIFT_ENABLE_EXPLICIT_MODULES=NO COMPILER_INDEX_STORE_ENABLE=NO "OTHER_CODE_SIGN_FLAGS=--keychain $onlyideas_keychain"
onlyideas_app="$onlyideas_root/release/OnlyIdeas-macOS-$onlyideas_release.xcarchive/Products/Applications/OnlyIdeas.app"
[[ $(plutil -extract CFBundleShortVersionString raw -o - "$onlyideas_app/Contents/Info.plist") == "$onlyideas_version" ]]
[[ $(plutil -extract CFBundleVersion raw -o - "$onlyideas_app/Contents/Info.plist") == "$onlyideas_build" ]]
codesign --verify --deep --strict "$onlyideas_app"
xcodebuild -exportArchive -archivePath "$onlyideas_root/release/OnlyIdeas-macOS-$onlyideas_release.xcarchive" -exportOptionsPlist ExportOptions-Mac.plist -exportPath "$onlyideas_root/release/macos-export-$onlyideas_release"
