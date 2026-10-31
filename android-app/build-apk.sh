#!/bin/zsh
# Rebuilds the Solar Dry House Android app (a Capacitor wrapper around prototype/mobile).
# Output: android/app/build/outputs/apk/debug/app-debug.apk  → uploaded to the GitHub release the portfolio links to
set -e
cd "$(dirname "$0")"
# Refresh the web app from the latest mobile build, keeping this wrapper's location bridge in index.html.
rsync -a --exclude index.html ../prototype/mobile/ www/ && rsync -a ../prototype/images/ www/images/
npx cap copy android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk"
cd android && ./gradlew --no-daemon assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../solar-dry-house.apk
~/.local/bin/gh release upload v1.0.0 "../solar-dry-house.apk" -R tgopinath/solar-dry-house --clobber
echo "Uploaded to https://github.com/tgopinath/solar-dry-house/releases/latest/download/$(basename "../solar-dry-house.apk")"
