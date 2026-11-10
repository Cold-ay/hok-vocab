# Hok Vocabulary

A local-first vocabulary trainer built with React 19, TypeScript, Vite, and Capacitor 7. Organize words into concepts, practice flashcards, bookmark difficult words, and track daily learning goals.

## Run locally

Requires Node.js 22.18+ (or 24+) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm run lint
npm test
npm run build
```

`npm test` uses Node's built-in test runner and TypeScript stripping; no extra test dependency is required. Tests cover malformed/unavailable storage and calendar streaks, including daylight saving transitions.

## Data and network behavior

Words, concepts, bookmarks, preferences, and activity live in this browser/device's local storage. Learned status persists between days. Daily activity counts each practiced word once per day, independently of its learned status. Study time counts visible flashcard sessions and flushes on leaving study. Clearing site data removes saved learning data; there is no account or cloud sync.

Dictionary and translation lookup use DictionaryAPI and Google Translate's public endpoint. These require network access and may be unavailable or rate-limited; manual entry works without them. Failed lookups retain entered fields and show an inline error. Source-language changes translate saved definitions/examples only if every request succeeds. Newly added interface copy supports all seven existing UI languages.

## Design

The redesign follows the included `.agents/skills/ui-ux-pro-max` skill. Design decisions are recorded in `design-system/hok-vocab/MASTER.md`. It includes responsive desktop/tablet/mobile layouts, light/dark themes, local SVG assets, keyboard focus, labeled forms, and reduced-motion support.

## Native apps

See [CAPACITOR.md](CAPACITOR.md) for Android/iOS setup. After web changes, run `npm run cap:sync` for Android or `npm run cap:sync:all` for both platforms, then build with the platform IDE. Native simulator/device execution is separate from the browser build.

## Separate store releases

Version 1.0.0 (build 1) is prepared for independent iOS and Android releases. See [App Store instructions](store/app-store/RELEASE.md) and [Play Store instructions](store/play-store/RELEASE.md). Signing credentials are supplied later and are never included in the source.

- `npm run release:ios:unsigned`: verify an unsigned iOS archive (macOS/Xcode/CocoaPods required).
- `npm run release:android:unsigned`: build an unsigned Android App Bundle (JDK 21/SDK 36 required).
- `npm run release:ios` / `npm run release:android`: produce signed outputs after configuring credentials.
- `python3 scripts/package-release-kits.py`: create separate source release ZIPs in `releases/`.

The two GitHub Actions templates in `store/workflow-templates/` build unsigned native verification artifacts once enabled with workflow-authorized GitHub access. They are templates because the current GitHub token lacks permission to create workflows. They do not publish to either store. Store listing drafts, icons, a Play feature graphic, privacy inventory, and a bundled privacy page are included. Supply real support/contact details and host the privacy page before submitting.

Publishing setup (November 10, 2026): the iOS target is 15.0+ for the installed Xcode 27 toolchain. Public support/privacy sources are in docs/ and are published through the repository’s GitHub Pages branch deployment.
