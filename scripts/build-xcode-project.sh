#!/usr/bin/env bash
# Wraps Apple's `safari-web-extension-converter` to turn web-extension/ into
# a full Xcode project (macOS app + Safari App Extension target), ready to
# open, sign, and run.
#
# Requires the full Xcode.app (not just the Command Line Tools) — Safari
# extensions must be built and signed via Xcode; there is no way around it.
# Install Xcode from the Mac App Store, open it once to finish setup, then
# run this script.
set -euo pipefail

cd "$(dirname "$0")/.."

# EDIT ME before your first run (and before submitting to the App Store):
# reverse-DNS identifier under your own Apple Developer account.
BUNDLE_ID="${BUNDLE_ID:-com.example.starlinkflights}"
APP_NAME="${APP_NAME:-Starlink Column for Google Flights}"
PROJECT_DIR="xcode"

if ! xcode-select -p >/dev/null 2>&1 || ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "error: full Xcode.app is required (not just the Command Line Tools)." >&2
  echo "Install it from the Mac App Store, open it once, then re-run this script." >&2
  exit 1
fi

if [ "$BUNDLE_ID" = "com.example.starlinkflights" ]; then
  echo "warning: using placeholder bundle identifier '$BUNDLE_ID'." >&2
  echo "         Set BUNDLE_ID=com.yourname.starlinkflights before running for real, e.g.:" >&2
  echo "         BUNDLE_ID=com.yourname.starlinkflights ./scripts/build-xcode-project.sh" >&2
fi

mkdir -p "$PROJECT_DIR"

xcrun safari-web-extension-converter web-extension \
  --project-location "$PROJECT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --swift \
  --macos-only \
  --no-open \
  --force

echo
echo "Done. Open $PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj in Xcode, set your"
echo "Team under Signing & Capabilities for both targets, then Run."
