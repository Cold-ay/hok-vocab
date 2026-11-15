import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { translateText, TranslationError } from '../src/translation.ts'
import { lookupDefinition } from '../src/dictionary.ts'

let values
beforeEach(() => {
  values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
})
afterEach(() => { delete globalThis.localStorage })
const result = text => new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: text }, quotaFinished: false }))

test('same-language, blank and unsupported dictionary requests use no network', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request') })
  assert.equal(await translateText(' hello ', 'en', 'en-US'), 'hello')
  assert.equal(await translateText(' ', 'fr', 'en'), '')
  assert.deepEqual(await lookupDefinition('acteur', 'fr'), [])
  assert.deepEqual(await lookupDefinition('profesor', 'es'), [])
  assert.equal(fetch.mock.callCount(), 0)
})

test('translation sends explicit language pair and reuses successful device cache', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async url => {
    const query = new URL(url).searchParams
    assert.equal(query.get('langpair'), 'fr|es')
    assert.equal(query.get('q'), 'acteur')
    return result('actor\\/actriz &amp; actriz')
  })
  assert.equal(await translateText('acteur', 'es', 'fr'), 'actor/actriz & actriz')
  assert.equal(await translateText('acteur', 'es', 'fr'), 'actor/actriz & actriz')
  assert.equal(fetch.mock.callCount(), 1)
})

test('simultaneous duplicate lookups share a single request', async t => {
  let finish
  const response = new Promise(resolve => { finish = resolve })
  const fetch = t.mock.method(globalThis, 'fetch', () => response)
  const first = translateText('teacher', 'fr', 'en')
  const second = translateText('teacher', 'fr', 'en')
  finish(result('enseignant'))
  assert.deepEqual(await Promise.all([first, second]), ['enseignant', 'enseignant'])
  assert.equal(fetch.mock.callCount(), 1)
})

test('HTTP rate limits are classified and never cached as vocabulary', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 429 }))
  for (let i = 0; i < 2; i++) await assert.rejects(translateText('book', 'es', 'en'), error => error instanceof TranslationError && error.reason === 'rate-limited')
  assert.equal(fetch.mock.callCount(), 2)
  assert.equal(values.size, 0)
})

test('quota errors inside HTTP 200 responses are not saved as translations', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ responseStatus: 403, quotaFinished: true, responseData: { translatedText: 'DAILY LIMIT EXCEEDED' } })))
  await assert.rejects(translateText('cat', 'fr', 'en'), error => error.reason === 'rate-limited')
  assert.equal(values.size, 0)
})

test('network and malformed replies remain actionable failures', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline') })
  await assert.rejects(translateText('dog', 'fr', 'en'), error => error.reason === 'network')
  fetch.mock.mockImplementation(async () => new Response('<html>unavailable</html>'))
  await assert.rejects(translateText('dog', 'fr', 'en'), error => error.reason === 'invalid-response')
  assert.equal(values.size, 0)
})

test('UTF-8 byte limits are checked before sending a request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => result('unused'))
  await assert.rejects(translateText('é'.repeat(251), 'es', 'fr'), error => error.reason === 'too-long')
  assert.equal(fetch.mock.callCount(), 0)
})

test('expired cached results are refreshed', async t => {
  values.set('hok-translations-v1', JSON.stringify([{ key: JSON.stringify(['en', 'fr', 'book']), text: 'outdated', savedAt: Date.now() - 8 * 86400000 }]))
  const fetch = t.mock.method(globalThis, 'fetch', async () => result('livre'))
  assert.equal(await translateText('book', 'fr', 'en'), 'livre')
  assert.equal(fetch.mock.callCount(), 1)
})
