type TranslationFailure = 'rate-limited' | 'network' | 'invalid-response' | 'too-long'

export class TranslationError extends Error {
  readonly reason: TranslationFailure
  constructor(reason: TranslationFailure) {
    super(`Translation ${reason}`)
    this.reason = reason
  }
}

const CACHE_KEY = 'hok-translations-v1'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 100
type CachedTranslation = { key: string; text: string; savedAt: number }
const pending = new Map<string, Promise<string>>()

function readCache(): CachedTranslation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
    return Array.isArray(data) ? data.filter((item): item is CachedTranslation => item
      && typeof item.key === 'string' && typeof item.text === 'string'
      && Number.isFinite(item.savedAt) && Date.now() - item.savedAt < MAX_AGE).slice(-MAX_ENTRIES) : []
  } catch { return [] }
}

function languageCode(language: string): string {
  if (language === 'zh-CN') return 'zh-CN'
  if (language === 'zh-TW') return 'zh-TW'
  return language.split('-')[0].toLowerCase()
}

function decodeText(text: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }
  return text.replace(/\\\//g, '/').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || match
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
  }).trim()
}

export async function translateText(text: string, toLanguage: string, fromLanguage = 'en'): Promise<string> {
  const input = text.trim()
  const source = languageCode(fromLanguage)
  const target = languageCode(toLanguage)
  if (!input || source === target) return input
  if (new TextEncoder().encode(input).length > 500) throw new TranslationError('too-long')
  const key = JSON.stringify([source, target, input])
  const cached = readCache().find(item => item.key === key)
  if (cached) return cached.text
  const existing = pending.get(key)
  if (existing) return existing
  const request = (async () => {
    const query = new URLSearchParams({ q: input, langpair: `${source}|${target}` })
    let response: Response
    try {
      response = await fetch(`https://api.mymemory.translated.net/get?${query}`, { signal: AbortSignal.timeout(15000) })
    } catch { throw new TranslationError('network') }
    if (response.status === 429) throw new TranslationError('rate-limited')
    if (!response.ok) throw new TranslationError('network')
    let data
    try { data = await response.json() } catch { throw new TranslationError('invalid-response') }
    // The service also reports quota failures inside HTTP 200 responses. Never
    // save those error strings into a vocabulary card as a translation.
    if (data.quotaFinished || Number(data.responseStatus) === 429
      || /(?:quota|limit|too many requests)/i.test(String(data.responseDetails || ''))) throw new TranslationError('rate-limited')
    if (Number(data.responseStatus) !== 200 || typeof data.responseData?.translatedText !== 'string'
      || !data.responseData.translatedText.trim()) throw new TranslationError('invalid-response')
    const translated = decodeText(data.responseData.translatedText)
    if (!translated) throw new TranslationError('invalid-response')
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify([...readCache().filter(item => item.key !== key), { key, text: translated, savedAt: Date.now() }].slice(-MAX_ENTRIES)))
    } catch { /* Translation remains usable if local storage is full/unavailable. */ }
    return translated
  })()
  pending.set(key, request)
  try { return await request } finally { pending.delete(key) }
}
