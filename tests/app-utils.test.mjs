import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStreak, loadJson, saveJson, isConceptTree } from '../src/app-utils.ts'

const root = { id: 'root', name: 'Concept Tree', children: [] }
const active = date => ({ date, cardsLearned: 1, studySeconds: 10 })

test('streak accepts yesterday, ignores inactive days and duplicate logs', () => {
  const today = new Date(2026, 9, 31, 12)
  assert.equal(computeStreak([active('2026-10-30'), active('2026-10-30'), active('2026-10-29')], today), 2)
  assert.equal(computeStreak([active('2026-10-28')], today), 0)
  assert.equal(computeStreak([{ ...active('2026-10-31'), cardsLearned: 0 }], today), 0)
})

test('calendar streak survives daylight saving transitions', () => {
  const oldTz = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    assert.equal(computeStreak(['2026-03-09', '2026-03-08', '2026-03-07'].map(active), new Date(2026, 2, 9, 12)), 3)
    assert.equal(computeStreak(['2026-11-02', '2026-11-01', '2026-10-31'].map(active), new Date(2026, 10, 2, 12)), 3)
  } finally { if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz }
})

test('invalid and unavailable local storage recover without crashing', () => {
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  for (const malformed of ['null', '{', '[]', '{"id":"root","name":"Tree","children":[null]}']) {
    values.set('hok-tree', malformed)
    assert.deepEqual(loadJson('hok-tree', root), root)
  }
  values.set('hok-learned', '[null,7]')
  assert.deepEqual(loadJson('hok-learned', []), [])
  values.set('hok-dailyLogs', '[{"date":"2026-10-31"}]')
  assert.deepEqual(loadJson('hok-dailyLogs', []), [])
  saveJson('hok-tree', root)
  assert.deepEqual(loadJson('hok-tree', {}), root)
  globalThis.localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } }
  assert.deepEqual(loadJson('hok-tree', root), root)
  assert.doesNotThrow(() => saveJson('hok-tree', root))
  delete globalThis.localStorage
})

test('concept trees reject malformed descendants and incomplete word records', () => {
  assert.equal(isConceptTree(root), true)
  assert.equal(isConceptTree({ ...root, children: [{ id: 3 }] }), false)
  assert.equal(isConceptTree({ ...root, words: [{ id: 'word', term: 'hello' }] }), false)
})
