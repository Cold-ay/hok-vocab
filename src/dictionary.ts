// Free Dictionary API documents its current word-entry endpoint for English.
// Unsupported source languages are an expected absence, not an outage.
export async function lookupDefinition(term: string, language: string): Promise<unknown[]> {
  if (language.split('-')[0] !== 'en' || !term.trim()) return []
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term.trim())}`, { signal: AbortSignal.timeout(10000) })
  if (response.status === 404) return []
  if (!response.ok) throw new Error('Dictionary unavailable')
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('Invalid dictionary response')
  return data
}
