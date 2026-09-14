# Starlink Column for Google Flights (Safari)

A Safari Web Extension that badges each result on
[Google Flights](https://www.google.com/travel/flights) with the airline's
Starlink Wi-Fi status: installed fleet-wide, actively installing, announced,
using a different provider, or unknown.

Chrome has a few extensions that do this already (SeatWiFi, "Google Flights
Starlink Indicator", `ua-starlink-tracker`); there wasn't a Safari one, so
this is a from-scratch equivalent built as a native Safari Web Extension.

## How it works

- `web-extension/` is a standard cross-browser WebExtension (Manifest V3):
  a content script watches Google Flights' result list and, for each row,
  reads the accessibility `aria-label` text Google already generates (the
  most stable hook available, since Google's CSS class names are obfuscated
  and change often) to identify the airline, then appends a small colored
  badge.
- `web-extension/data/starlink-airlines.js` is a **manually curated, static
  dataset** — no backend, no scraping, no live API. It maps airline names to
  a status (`fleetwide` / `installing` / `announced` / `other` / `unknown`)
  with a short note. See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) for
  sources and how to refresh it.
- Safari can't load a raw extension folder like Chrome does — it has to be
  wrapped in a signed native app. `scripts/build-xcode-project.sh` runs
  Apple's own `safari-web-extension-converter` to generate that wrapper
  project into `xcode/` (gitignored — it's fully regenerable from
  `web-extension/`).

### Known limitation

Because the dataset is airline-level, not per-flight or per-tail-number, an
`installing` badge means "this airline is actively rolling Starlink out," not
"this exact aircraft has it." Getting per-flight precision would require a
live backend that tracks tail numbers and schedules (like `ua-starlink-tracker`
does for United) — deliberately out of scope here to keep this a simple,
offline, easy-to-maintain extension.

## Prerequisites

- **Xcode** (the full app, not just the Command Line Tools) — install free
  from the Mac App Store, then open it once to finish first-run setup.
  This machine currently only has the Command Line Tools installed, so
  you'll need to do this before the next step will work.
- To eventually distribute via the App Store: a paid
  [Apple Developer Program](https://developer.apple.com/programs/) account
  ($99/year). Not required just to build and run it locally.

## Build & run locally

```bash
BUNDLE_ID=com.yourname.starlinkflights ./scripts/build-xcode-project.sh
```

Then:

1. Open `xcode/Starlink Column for Google Flights/Starlink Column for Google Flights.xcodeproj` in Xcode.
2. Select **both** targets (the app and the Safari Extension target) in
   *Signing & Capabilities* and set your Team (your personal Apple ID works
   for local development, no paid account needed for this step).
3. Run the app target once (▶ in Xcode) — it just shows a page telling you
   to enable the extension in Safari.
4. In Safari: **Settings → Developer → Allow Unsigned Extensions** (or, on
   older Safari, **Settings → Advanced → Show features for web developers**
   then **Developer → Allow Unsigned Extensions**), then
   **Settings → Extensions** and turn on "Starlink Column for Google
   Flights."
5. Visit [google.com/travel/flights](https://www.google.com/travel/flights)
   and search a route — badges should appear on the right edge of each
   result.

Re-run the build script any time you edit files under `web-extension/`.

## Updating the airline data

Edit `web-extension/data/starlink-airlines.js`, bump `LAST_UPDATED` in that
file and `"version"` in `web-extension/manifest.json`, then rebuild. See
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Preparing for App Store distribution

The project is structured so this is mostly Xcode configuration rather than
code changes:

1. Enroll in the Apple Developer Program and create an App ID matching your
   chosen `BUNDLE_ID`.
2. In Xcode, set that Team on both targets and switch signing to your
   Developer ID / App Store provisioning as needed.
3. Add proper app icons/screenshots and fill in App Store Connect metadata
   (this repo only ships the extension toolbar icon, not App Store marketing
   assets).
4. Archive and submit via Xcode's Organizer, same as any macOS app.

Google Flights' DOM changes periodically; if badges stop appearing after a
Google update, the first place to look is `web-extension/content-script.js`
(the `ROW_SELECTOR` and aria-label matching) — see the comment at the top of
that file.
