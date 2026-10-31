import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const text = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const pkg = JSON.parse(text('package.json'))
const config = JSON.parse(text('release.config.json'))
assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
assert.ok(Number.isSafeInteger(config.buildNumber) && config.buildNumber > 0)
assert.equal(config.appId, 'com.hok.vocab')
assert.match(text('capacitor.config.ts'), /appId: 'com.hok.vocab'/)
assert.doesNotMatch(text('capacitor.config.ts'), /server\s*:/)
if (existsSync(new URL('../android', import.meta.url))) {
assert.match(text('android/variables.gradle'), /targetSdkVersion = 36/)
assert.match(text('android/variables.gradle'), /compileSdkVersion = 36/)
assert.match(text('android/app/build.gradle'), /versionName packageInfo.version/)
assert.match(text('android/app/build.gradle'), /versionCode releaseInfo.buildNumber/)
}
if (existsSync(new URL('../ios', import.meta.url))) {
const project = text('ios/App/App.xcodeproj/project.pbxproj')
assert.match(project, /PrivacyInfo.xcprivacy in Resources/)
assert.ok(project.includes(`MARKETING_VERSION = ${pkg.version};`), 'Keep iOS version synchronized with package.json')
assert.ok(project.includes(`CURRENT_PROJECT_VERSION = ${config.buildNumber};`), 'Keep iOS build number synchronized')
assert.ok(text('ios/App/App/PrivacyInfo.xcprivacy').includes('NSPrivacyTracking'))
const icon = readFileSync(new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', import.meta.url))
assert.equal(icon.readUInt32BE(16), 1024)
assert.equal(icon.readUInt32BE(20), 1024)
}
console.log(`Release configuration valid: ${pkg.version} (${config.buildNumber}), ${config.appId}, Android API 36.`)
