export interface DailyLog {
  date: string
  cardsLearned: number
  studySeconds: number
  learnedIds?: string[]
  totalCards?: number
}

export function getDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    if (value === null || typeof value !== typeof fallback || Array.isArray(value) !== Array.isArray(fallback)) return fallback
    if (key === 'hok-tree' && !isConceptTree(value)) return fallback
    if (key === 'hok-theme' && value !== 'light' && value !== 'dark') return fallback
    if ((key === 'hok-learned' || key === 'hok-bookmarked') && !value.every((id: unknown) => typeof id === 'string')) return fallback
    if (key === 'hok-dailyLogs' && !value.every((log: DailyLog) => log && typeof log.date === 'string' && Number.isFinite(log.cardsLearned) && Number.isFinite(log.studySeconds))) return fallback
    return value
  } catch { return fallback }
}

export function saveJson<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota exceeded */ }
}

export function computeStreak(logs: DailyLog[], now: Date = new Date()): number {
  const activeDays = new Set(logs.filter(log => log.cardsLearned > 0).map(log => log.date))
  const cursor = new Date(now)
  if (!activeDays.has(getDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (activeDays.has(getDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatStudyTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const mins = Math.floor(totalSeconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h${remainMins}m` : `${hrs}h`
}

export interface VocabWord {
  id: string
  term: string
  pronunciation: string
  translation: string
  definition: string
  example: string
  exampleTranslation: string
  localeTag: string
  image: string
}

export interface ConceptNode {
  id: string
  name: string
  color?: string
  icon?: string
  words?: VocabWord[]
  children?: ConceptNode[]
}

export function isConceptTree(value: unknown): value is ConceptNode {
  if (!value || typeof value !== 'object') return false
  const node = value as ConceptNode
  return typeof node.id === 'string' && typeof node.name === 'string'
    && (node.children === undefined || (Array.isArray(node.children) && node.children.every(isConceptTree)))
    && (node.words === undefined || (Array.isArray(node.words) && node.words.every(word => word && ['id', 'term', 'translation', 'definition', 'pronunciation', 'example', 'exampleTranslation', 'image', 'localeTag'].every(key => typeof word[key as keyof VocabWord] === 'string'))))
}

