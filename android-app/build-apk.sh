#!/bin/zsh
# Rebuilds the Solar Dry House Android app (a Capacitor wrapper around prototype/mobile, bundled so it works offline).
# Output: android/app/build/outputs/apk/debug/app-debug.apk  → uploaded to the GitHub release the portfolio links to
# Run `node ../tools/build-prototype.mjs` first so prototype/mobile is current.
set -e
cd "$(dirname "$0")"
# Refresh the web app from the latest mobile build (it carries the Kolam M3 kit in kolam/m3 for the Android look).
rsync -a ../prototype/mobile/ www/ && rsync -a ../prototype/images/ www/images/
cp geo-bridge.js www/geo-bridge.js
# index.html: photos sit next to the page here, and the native location bridge loads first.
python3 - <<'PY'
s = open('../prototype/mobile/index.html').read()
s = s.replace('window.SDH_ASSETS = "../"', 'window.SDH_ASSETS = ""')
s = s.replace('<head>', '<head>\n<script src="geo-bridge.js"></script>', 1)
open('www/index.html', 'w').write(s)
PY
npx cap sync android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk"
cd android && ./gradlew --no-daemon --init-script ~/Documents/android-wrappers/maven-mirror.gradle assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../solar-dry-house.apk
[ -n "$NO_UPLOAD" ] || ~/.local/bin/gh release upload v1.0.0 "../solar-dry-house.apk" -R tgopinath/solar-dry-house --clobber
echo "Uploaded to https://github.com/tgopinath/solar-dry-house/releases/latest/download/$(basename "../solar-dry-house.apk")"
