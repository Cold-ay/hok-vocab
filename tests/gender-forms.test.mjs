import test from 'node:test'
import assert from 'node:assert/strict'
import { genderLanguage, resolveGenderEntry } from '../src/gender-lookup.ts'
import { isConceptTree, isGenderForms } from '../src/app-utils.ts'

test('gender lookup handles feminine-first, adjective and shared-form entries', () => {
  assert.deepEqual(resolveGenderEntry({ word: 'actrice', genders: ['feminine gender'], masculine: 'acteur' }, 'fr'), { language: 'fr', masculine: 'acteur', feminine: 'actrice' })
  assert.deepEqual(resolveGenderEntry({ word: 'heureux', genders: [], feminine: 'heureuse' }, 'fr'), { language: 'fr', masculine: 'heureux', feminine: 'heureuse' })
  assert.deepEqual(resolveGenderEntry({ word: 'artista', genders: ['masculine gender', 'feminine gender'] }, 'es'), { language: 'es', masculine: 'artista', feminine: 'artista' })
})

test('single-gender nouns do not acquire invented counterparts', () => {
  assert.deepEqual(resolveGenderEntry({ word: 'maison', genders: ['feminine gender'] }, 'fr'), { language: 'fr', masculine: '', feminine: 'maison' })
  assert.deepEqual(resolveGenderEntry({ word: 'libro', genders: ['masculine gender'] }, 'es'), { language: 'es', masculine: 'libro', feminine: '' })
  assert.deepEqual(resolveGenderEntry({ word: 'bonjour', genders: [] }, 'fr'), { language: 'fr', masculine: '', feminine: '' })
  assert.equal(genderLanguage('es-MX'), 'es')
  assert.equal(genderLanguage('en'), undefined)
})

test('old saved libraries and optional gender forms survive validation', () => {
  const word = { id: '1', term: 'actor', translation: 'acteur', pronunciation: '', definition: '', example: '', exampleTranslation: '', image: '', localeTag: 'NEW' }
  const tree = words => ({ id: 'root', name: 'Words', words })
  const forms = { language: 'fr', masculine: 'acteur', feminine: 'actrice', sourceUrl: 'https://en.wiktionary.org/wiki/acteur#French' }
  assert.equal(isConceptTree(tree([word])), true)
  const restored = JSON.parse(JSON.stringify(tree([{ ...word, translationForms: forms }])))
  assert.equal(isConceptTree(restored), true)
  assert.deepEqual(restored.words[0].translationForms, forms)
  assert.equal(isGenderForms({ ...forms, masculine: null }), false)
  assert.equal(isGenderForms({ ...forms, sourceUrl: 'javascript:alert(1)' }), false)
  assert.equal(isGenderForms({ ...forms, language: 'en' }), false)
})
