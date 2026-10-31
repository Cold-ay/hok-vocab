# Privacy review for store submission

This is a technical inventory to help the publisher complete store forms, not a completed legal/account declaration.

- Local storage: words, images selected by the user, concepts, bookmarks, daily activity, goals, and language/theme preferences.
- Network: optional dictionary requests go to api.dictionaryapi.dev; optional translation requests (including source-language changes) go to translate.googleapis.com. Entered text and the network's normal IP/request metadata reach these providers.
- No account, advertising SDK, analytics SDK, tracking domain, purchases, location access, or push-notification service is configured.
- Selected images are read using the system file picker and stored locally. The app does not request broad photo-library or camera access.
- Removing app/site storage deletes the local library. There is no publisher-run server holding an account to delete.
- Android automatic OS backup is disabled in this release to align with the local-device behavior. iOS system/device backups may contain local app data; do not claim it never leaves the device under any circumstances.
- iOS includes the Capacitor SDK privacy manifests plus an app manifest conservatively declaring other user content for optional lookup functionality, unlinked and not for tracking. No app-owned required-reason native APIs are called.

Before publishing, confirm third-party provider terms and retention policies, decide whether any collection qualifies for the stores' ephemeral-processing exceptions, and make App Privacy / Data safety answers match the final binary and actual practices. Do not select “no data collected” merely because there is no developer-operated backend. Check metadata again if adding a backend, account, analytics, ads, crash reporting, or plugins.

A bundled public/privacy.html explains the current technical behavior. Host that page at a public HTTPS URL and supply the publisher's real support/contact details in the store listings before submitting.

References:
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/documentation/technotes/tn3184-adding-data-collection-details-to-your-privacy-manifest
- https://support.google.com/googleplay/android-developer/answer/10787469
