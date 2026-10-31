import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const env = { ...process.env }
for (const key of ['HOK_KEYSTORE_PATH', 'HOK_KEYSTORE_PASSWORD', 'HOK_KEY_ALIAS', 'HOK_KEY_PASSWORD', 'HOK_APPLE_TEAM_ID']) delete env[key]

for (const [platform, expected] of [['android', 'Missing HOK_KEYSTORE_PATH'], ['ios', 'HOK_APPLE_TEAM_ID']]) {
  test(`${platform} release refuses missing signing inputs before running a build`, () => {
    const result = spawnSync(process.execPath, ['scripts/release.mjs', platform], { cwd: root, env, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.ok(result.stderr.includes(expected))
    assert.ok(!result.stdout.includes('vite'), 'Signing preflight must run before any build')
  })
}
