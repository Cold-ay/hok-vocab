# App Store release kit

Version 1.0.0, build 1, bundle ID `com.hok.vocab`. This kit contains source and artwork. Credentials are intentionally absent. An unsigned archive is a build-verification artifact and cannot be uploaded as an App Store release.

## Prepare

1. Use macOS with Xcode 26+ and the iOS 26+ SDK. Open Xcode once and finish its required setup. If the system selects Command Line Tools, set `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` for your shell/build.
2. Install Node 22.18+ or 24+ and CocoaPods. Run `npm ci` at the kit root.
3. Run `npm run release:ios:unsigned` to verify the full native archive without signing. A prepared workflow template is in `store/workflow-templates/app-store.yml`. After enabling it as described in that folder's README, download its `app-store-unsigned` artifact after a successful run.

## Sign when your credentials are ready

1. Enroll in Apple Developer, register/confirm `com.hok.vocab`, and create the app in App Store Connect. The bundle ID must match your registered identifier.
2. Sign in to your developer account in Xcode → Settings → Accounts. Add a distribution signing certificate to your local keychain and configure provisioning through Xcode.
3. Set `HOK_APPLE_TEAM_ID` in your shell to your 10-character Team ID. Then run:

   ```sh
   npm run release:ios
   ```

   The script archives with automatic signing and exports an IPA under `releases/app-store/`. It allows Xcode to obtain/update provisioning profiles for your selected team. It does not upload or submit the app.
4. Alternatively run `npm run cap:sync:ios`, open `ios/App/App.xcworkspace`, select **Any iOS Device (arm64)**, set the signing team, and use Product → Archive → Distribute App → App Store Connect.
5. Test through TestFlight. Complete listing.md, actual device screenshots, App Privacy, age rating, support/contact details, and the public privacy URL. Submit only after checking the exported binary on supported devices.

Do not put `.p12`, `.p8`, provisioning profiles, account passwords, or API keys in this repository. The GitHub workflow produces unsigned verification archives only; signing remains local until an explicit signing CI setup is configured.

For later updates, increment package.json version and release.config.json buildNumber; synchronize MARKETING_VERSION and CURRENT_PROJECT_VERSION in the Xcode project. `npm run release:check` detects drift.

Requirement checked 2026-10-31: https://developer.apple.com/news/upcoming-requirements/

Publishing setup (November 10, 2026): the iOS target is 15.0+ for the installed Xcode 27 toolchain. Public support/privacy sources are in docs/ and are published through the repository’s GitHub Pages branch deployment.
