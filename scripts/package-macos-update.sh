#!/bin/sh
# Publish this archive alongside the DMG. Desktop auto-update uses ZIP, never a mounted DMG.
set -eu
app=${1:-src-tauri/target/release/bundle/macos/GlobalPay.app}
output=${2:-release-assets}
if [ "$(/usr/bin/basename "$app")" != "GlobalPay.app" ]; then echo "Expected GlobalPay.app" >&2; exit 1; fi
/usr/bin/codesign --verify --deep --strict "$app"
arch=$(/usr/bin/lipo -archs "$app/Contents/MacOS/GlobalPay")
case "$arch" in
  arm64) name=GlobalPay-macos-arm64.zip ;;
  x86_64) name=GlobalPay-macos-x64.zip ;;
  *) echo "Build a separate archive for each architecture" >&2; exit 1 ;;
esac
/bin/mkdir -p "$output"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$app" "$output/$name"
echo "$output/$name"
