# Native iPad / iPhone build

The repository ships a native iOS wrapper under `ios/` — a Capacitor project that
runs the production web build inside a fullscreen, landscape-locked WKWebView.
This gives a real installable app (Xcode → device, TestFlight, or the App Store),
with the same save data and gameplay as the web version.

The lightweight alternative that needs no Mac at all: open the deployed site in
Safari on the iPad/iPhone and use **Share → Add to Home Screen**. The PWA
manifest makes that launch fullscreen in landscape with the app icon.

## Requirements

- A Mac with Xcode 15+ (iOS builds are only possible on macOS).
- Node 22+ (same as the web build). No CocoaPods needed — the project uses
  Swift Package Manager.

## Build and run

```bash
npm install
npm run ios:sync    # builds dist/ and copies it into ios/App/App/public
npm run ios:open    # opens ios/App in Xcode
```

In Xcode: select the `App` scheme, pick your iPad/iPhone (or a simulator),
set your signing team under *Signing & Capabilities*, and press Run.

After any web-side change, re-run `npm run ios:sync` before building again —
the native shell only ships whatever is currently in `dist/`.

## What is configured

- `capacitor.config.ts` — app id `com.fairwaymogul.app`, web assets from `dist/`,
  `contentInset: 'never'` so the canvas uses the full screen (the CSS already
  handles safe-area insets via `viewport-fit=cover`).
- `ios/App/App/Info.plist` — landscape-only on iPhone and iPad, status bar hidden.
- App icon in `ios/App/App/Assets.xcassets` (1024px, opaque, generated from the
  same artwork as the PWA icons).

## Performance notes

The renderer is already tuned for Apple hardware: the canvas backing store is
capped at 2x devicePixelRatio, frames are capped at 60fps (so 120Hz ProMotion
panels don't double the work), and the ambient build-mode simulation drops to
30fps until you interact, play a round, or a ball is in flight. Saves flush on
`visibilitychange`, which is what fires when iOS suspends the app.

## Online play

The online layer (sign-in, cloud saves, competitions) talks to the same API as
the web app. Point the deployed origin at your production Worker before shipping
builds that need it; local-only play works with no network at all.
