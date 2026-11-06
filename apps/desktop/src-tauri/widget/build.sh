#!/bin/sh
# Builds the macOS desktop widget, a WidgetKit extension that `tauri build` copies into
# Logbook Widget.app/Contents/PlugIns (bundle.macOS.files). Runs as the beforeBundleCommand.
# Needs only the Command Line Tools; the binary is universal, so it serves local and release builds alike.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
conf="$here/../tauri.conf.json"
out="$here/../target/widget/LogbookWidget.appex"
work="$here/../target/widget/build"

app_id=$(plutil -extract identifier raw "$conf")
version=$(plutil -extract version raw "$conf")
min=$(plutil -extract bundle.macOS.minimumSystemVersion raw "$conf")
sdk=$(xcrun --sdk macosx --show-sdk-path)

rm -rf "$out" "$work"
mkdir -p "$out/Contents/MacOS" "$work"

for arch in arm64 x86_64; do
  xcrun swiftc -O -parse-as-library -application-extension -swift-version 5 -module-name LogbookWidget \
    -target "$arch-apple-macos$min" -sdk "$sdk" \
    "$here/Log.swift" "$here/Views.swift" "$here/Widget.swift" -o "$work/$arch"
done
lipo -create "$work/arm64" "$work/x86_64" -output "$out/Contents/MacOS/LogbookWidget"

plist="$out/Contents/Info.plist"
cp "$here/Info.plist" "$plist"
plutil -insert CFBundleIdentifier -string "$app_id.today" "$plist"
plutil -insert CFBundleShortVersionString -string "$version" "$plist"
plutil -insert CFBundleVersion -string "$version" "$plist"
plutil -insert LSMinimumSystemVersion -string "$min" "$plist"

# Same identity Tauri signs the app with: APPLE_SIGNING_IDENTITY when set, else ad hoc ("-" in tauri.conf.json).
codesign --force --options runtime --sign "${APPLE_SIGNING_IDENTITY:--}" \
  --entitlements "$here/LogbookWidget.entitlements" "$out"
echo "Built $out"
