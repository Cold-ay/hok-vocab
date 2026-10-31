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
