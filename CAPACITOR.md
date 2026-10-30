# Deploying Hok Vocabulary with Capacitor

The app is set up for **Capacitor 7** with Android and iOS. Use this guide to build and run on devices or emulators.

## Prerequisites

- **Android**: [Android Studio](https://developer.android.com/studio) installed, with an emulator or device.
- **iOS** (macOS only): Xcode and CocoaPods (`sudo gem install cocoapods`). On Windows, the `ios` folder is present but you’ll need a Mac to build and run iOS.

## Workflow

1. **Build the web app**
   ```bash
   npm run build
   ```

2. **Sync the build into native projects**
   - **Windows** (Android only; avoids iOS “pod” error): `npm run cap:sync` (syncs Android only).
   - **Mac** (both platforms): `npm run cap:sync:all` or `npx cap sync`.

3. **Run on a device or emulator**
   - **Android**: `npm run cap:android` (opens Android Studio), then run from there. Or: `npx cap run android`
   - **iOS** (on Mac): Open the iOS project, run `pod install` in the `ios/App` folder if needed, then open in Xcode and run. Or: `npx cap open ios` then run from Xcode.

## Scripts (package.json)

| Script | Description |
|--------|-------------|
| `npm run cap:sync` | Build and sync **Android only** (use on Windows so iOS `pod` error is skipped) |
| `npm run cap:sync:all` | Build and sync **both** Android and iOS (use on Mac; on Windows iOS step will fail at `pod install`) |
| `npm run cap:android` | Build, sync Android, and open Android Studio |
| `npm run cap:ios` | Build, sync both, and open Xcode (macOS only) |

## After changing the web app

Whenever you change the React/Vite app, run:

```bash
npm run cap:sync
```

Then run or debug again from Android Studio or Xcode so the native app loads the latest web build.

## Configuration

- **App ID**: `com.hok.vocab` (edit in `capacitor.config.ts` if you need a different bundle/application ID).
- **App name**: “Hok Vocabulary”.
- **Web output**: `dist` (Vite build output). The config uses `base: './'` so assets load correctly inside the native WebView.

## iOS on Windows

The `ios` project is in the repo, but `pod install` and building require macOS. To build for iOS, open this project on a Mac, run `pod install` in `ios/App`, then build and run from Xcode.
