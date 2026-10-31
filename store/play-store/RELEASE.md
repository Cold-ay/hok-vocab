# Play Store release kit

Version 1.0.0, version code 1, package `com.hok.vocab`, target/compile SDK 36. The kit contains source and artwork. An unsigned AAB cannot be uploaded to Google Play until rebuilt with your upload-key signing configuration.

## Prepare

1. Install Node 22.18+ or 24+, JDK 21, Android SDK Platform 36, and Build Tools 36.0.0. Android Studio can install the SDK components. Point `ANDROID_HOME` at your SDK and `JAVA_HOME` at JDK 21.
2. Run `npm ci` at the kit root, then:

   ```sh
   npm run release:android:unsigned
   ```

   This produces `releases/play-store/Hok-1.0.0-1-unsigned.aab`. A prepared workflow template is in `store/workflow-templates/play-store.yml`. After enabling it as described in that folder's README, download its `play-store-unsigned` artifact after a successful run.

## Sign when your credentials are ready

1. Create/confirm your Play Console app and package name before its first upload.
2. Use Android Studio → Build → Generate Signed App Bundle to create or choose your upload keystore. Keep an encrypted backup of that key separately from the repository. Enable Play App Signing as required by Play Console.
3. Configure these environment variables in your local shell/session, without pasting their values into this repository or chat:
   - `HOK_KEYSTORE_PATH`: absolute path to the upload keystore
   - `HOK_KEYSTORE_PASSWORD`: keystore password
   - `HOK_KEY_ALIAS`: upload key alias
   - `HOK_KEY_PASSWORD`: key password
4. Run `npm run release:android`. It produces `releases/play-store/Hok-1.0.0-1.aab`, signed with your upload key. Missing signing inputs cause a failure; the release script never substitutes a debug key.
5. Upload that signed AAB to a Play Console internal test track, test it on real devices, complete listing.md and Data safety, then fulfill any account-specific testing requirements and request production review.

The app requests internet access, uses the system file picker for selected images, disables cleartext traffic, and disables automatic Android backup. It does not need broad media, location, or camera permissions.

For future updates, increase release.config.json buildNumber and package.json version. Never reuse a version code that has already been uploaded. Gradle reads both values directly.

Requirement checked 2026-10-31: https://support.google.com/googleplay/android-developer/answer/11926878
