import type { GenderForms } from './app-utils'

export function genderLanguage(language: string): 'fr' | 'es' | undefined {
  const base = language.split('-')[0]
  return base === 'fr' || base === 'es' ? base : undefined
}

export interface GenderEntry {
  word: string
  genders: string[]
  masculine?: string
  feminine?: string
}

// Only dictionary-attested forms are filled. A feminine noun is not automatically
// paired with a made-up masculine noun (and vice versa).
export function resolveGenderEntry(entry: GenderEntry, language: 'fr' | 'es'): GenderForms {
  let masculine = entry.masculine?.trim() || ''
  let feminine = entry.feminine?.trim() || ''
  if (entry.genders.includes('masculine gender') || (!entry.genders.length && entry.feminine)) masculine ||= entry.word
  if (entry.genders.includes('feminine gender') || (!entry.genders.length && entry.masculine)) feminine ||= entry.word
  return { language, masculine, feminine }
}

export function parseGenderForms(html: string, language: 'fr' | 'es'): GenderForms | undefined {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const candidates: GenderForms[] = []
  for (const line of doc.querySelectorAll('.headword-line')) {
    const head = line.querySelector(`.headword[lang="${language}"]`)
    if (!head) continue
    const entry: GenderEntry = {
      word: head.textContent?.trim() || '',
      genders: Array.from(line.children).filter(el => el.classList.contains('gender'))
        .flatMap(el => Array.from(el.querySelectorAll('abbr')).map(el => el.getAttribute('title') || '')),
    }
    for (const label of line.querySelectorAll('i')) {
      const text = label.textContent?.trim().toLowerCase()
      if (text !== 'masculine' && text !== 'feminine' && text !== 'masculine singular' && text !== 'feminine singular') continue
      // Stop at the next label: plural forms must never populate singular fields.
      for (let next = label.nextSibling; next; next = next.nextSibling) {
        if (next.nodeType !== Node.ELEMENT_NODE) continue
        const el = next as Element
        if (el.tagName === 'I') break
        if (el.tagName === 'B' && el.getAttribute('lang') === language) {
          const value = el.textContent?.trim()
          if (value && !value.includes(' ')) entry[text.startsWith('masculine') ? 'masculine' : 'feminine'] = value
          break
        }
      }
    }
    const forms = resolveGenderEntry(entry, language)
    if (forms.masculine || forms.feminine) candidates.push(forms)
  }
  // Prefer a complete entry; never mix different meanings or parts of speech.
  return candidates.find(forms => forms.masculine && forms.feminine) || candidates[0]
}

export async function lookupGenderForms(term: string, language: 'fr' | 'es'): Promise<GenderForms | undefined> {
  const word = term.trim().toLocaleLowerCase(language).replace(/^(?:le |la |les |un |une |el |los |las |una |unos |unas |l[’'])/i, '')
  if (!word || word.length > 80 || /\s/.test(word)) return undefined
  const query = new URLSearchParams({ action: 'parse', page: word, prop: 'text', format: 'json', origin: '*' })
  const response = await fetch(`https://en.wiktionary.org/w/api.php?${query}`, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Gender lookup unavailable')
  const data = await response.json()
  if (data.error?.code === 'missingtitle') return undefined
  if (typeof data.parse?.text?.['*'] !== 'string') throw new Error('Invalid gender response')
  const forms = parseGenderForms(data.parse.text['*'], language)
  if (!forms) return undefined
  return { ...forms, sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#${language === 'fr' ? 'French' : 'Spanish'}` }
}
