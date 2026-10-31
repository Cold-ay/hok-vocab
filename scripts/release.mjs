import { spawnSync } from 'node:child_process'
import { readFileSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const platform = process.argv[2]
const unsigned = process.argv.includes('--unsigned')
if (!['ios', 'android'].includes(platform)) throw new Error('Usage: node scripts/release.mjs ios|android [--unsigned]')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const { buildNumber, appId } = JSON.parse(readFileSync('release.config.json', 'utf8'))
const output = resolve('releases', platform === 'ios' ? 'app-store' : 'play-store')
mkdirSync(output, { recursive: true })
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Fail before building when a signed release is missing credentials.
if (platform === 'android' && !unsigned) {
  for (const key of ['HOK_KEYSTORE_PATH', 'HOK_KEYSTORE_PASSWORD', 'HOK_KEY_ALIAS', 'HOK_KEY_PASSWORD']) {
    if (!process.env[key]) throw new Error(`Missing ${key}; use --unsigned for a preparation build.`)
  }
  if (!existsSync(process.env.HOK_KEYSTORE_PATH)) throw new Error('Upload keystore file does not exist.')
}
if (platform === 'ios' && !unsigned && !/^[A-Z0-9]{10}$/.test(process.env.HOK_APPLE_TEAM_ID ?? '')) {
  throw new Error('Set HOK_APPLE_TEAM_ID to your 10-character Apple Team ID, or use --unsigned.')
}
if (platform === 'ios' && process.platform !== 'darwin') throw new Error('iOS archives require macOS and Xcode 26+.')
run('npm', ['run', 'verify'])
run('npm', ['run', 'build'])
run('npx', ['--no-install', 'cap', 'sync', platform])
if (platform === 'android') {
  const gradleArgs = ['bundleRelease', `-PHOK_UNSIGNED_RELEASE=${unsigned}`, '--no-daemon']
  run(process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32' ? ['/d', '/c', 'gradlew.bat', ...gradleArgs] : ['./gradlew', ...gradleArgs], { cwd: resolve('android') })
  const name = `Hok-${pkg.version}-${buildNumber}${unsigned ? '-unsigned' : ''}.aab`
  copyFileSync('android/app/build/outputs/bundle/release/app-release.aab', resolve(output, name))
  console.log(`Created ${resolve(output, name)}${unsigned ? ' — UNSIGNED: cannot upload to Google Play yet.' : ' — signed with your upload key.'}`)
} else {
  const archivePath = resolve(output, `Hok-${pkg.version}-${buildNumber}${unsigned ? '-unsigned' : ''}.xcarchive`)
  const args = ['-workspace', 'ios/App/App.xcworkspace', '-scheme', 'App', '-configuration', 'Release', '-destination', 'generic/platform=iOS', '-archivePath', archivePath, `MARKETING_VERSION=${pkg.version}`, `CURRENT_PROJECT_VERSION=${buildNumber}`, 'archive']
  if (unsigned) args.push('CODE_SIGNING_ALLOWED=NO')
  else args.push(`DEVELOPMENT_TEAM=${process.env.HOK_APPLE_TEAM_ID}`, '-allowProvisioningUpdates')
  run('xcodebuild', args)
  if (!unsigned) {
    const plistPath = resolve(output, 'ExportOptions.plist')
    writeFileSync(plistPath, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>teamID</key><string>${process.env.HOK_APPLE_TEAM_ID}</string><key>signingStyle</key><string>automatic</string><key>destination</key><string>export</string><key>uploadSymbols</key><true/></dict></plist>`)
    run('xcodebuild', ['-exportArchive', '-archivePath', archivePath, '-exportPath', output, '-exportOptionsPlist', plistPath, '-allowProvisioningUpdates'])
  }
  console.log(`Created ${archivePath}${unsigned ? ' — UNSIGNED: rebuild with signing before App Store upload.' : ' and exported an App Store IPA.'}`)
}
writeFileSync(resolve(output, 'build-info.json'), JSON.stringify({ platform, appId, version: pkg.version, buildNumber, signed: !unsigned, builtAt: new Date().toISOString() }, null, 2) + '\n')
