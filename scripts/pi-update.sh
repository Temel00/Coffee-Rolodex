#!/bin/bash
# Run this script on the Pi to download the latest build from GitHub.
# Usage: bash ~/pi-update.sh

REPO="Temel00/Coffee-Rolodex"
INSTALL_PATH="$HOME/coffee-rolodex.AppImage"

# Auto-detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
  APPIMAGE="coffee-rolodex-arm64.AppImage"
else
  APPIMAGE="coffee-rolodex-armv7l.AppImage"
fi
DOWNLOAD_URL="https://github.com/$REPO/releases/download/latest/$APPIMAGE"
echo "Detected architecture: $ARCH — downloading $APPIMAGE"

echo "Downloading latest Coffee Rolodex..."
wget -q --show-progress "$DOWNLOAD_URL" -O "$INSTALL_PATH.tmp"

if [ $? -ne 0 ]; then
  echo "Download failed. Check your internet connection or that a release exists."
  rm -f "$INSTALL_PATH.tmp"
  exit 1
fi

chmod +x "$INSTALL_PATH.tmp"
mv "$INSTALL_PATH.tmp" "$INSTALL_PATH"
echo "Done! $INSTALL_PATH is up to date."
echo "Run it with: $INSTALL_PATH --no-sandbox"
