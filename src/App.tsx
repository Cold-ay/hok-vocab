import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { I18nContext, UI_MESSAGES, mapFromLangToUiLang, useI18n, tpl } from './i18n'
import type { I18nKey } from './i18n'

type TabKey = 'home' | 'learn' | 'stats' | 'me'
type ThemeMode = 'light' | 'dark'
type LearnView = 'tree' | 'card' | 'add-word'

interface DailyLog {
  date: string
  cardsLearned: number
  studySeconds: number
  learnedIds?: string[]
  totalCards?: number
}

function getDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveJson<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota exceeded */ }
}

function computeStreak(logs: DailyLog[]): number {
  if (logs.length === 0) return 0
  const sorted = [...logs].filter(l => l.cardsLearned > 0).sort((a, b) => b.date.localeCompare(a.date))
  if (sorted.length === 0) return 0

  const todayKey = getDateKey()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday)

  if (sorted[0].date !== todayKey && sorted[0].date !== yesterdayKey) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + 'T00:00:00')
    const curr = new Date(sorted[i].date + 'T00:00:00')
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
}

function formatStudyTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const mins = Math.floor(totalSeconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h${remainMins}m` : `${hrs}h`
}

interface VocabWord {
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

interface ConceptNode {
  id: string
  name: string
  color?: string
  icon?: string
  words?: VocabWord[]
  children?: ConceptNode[]
}

const CONCEPT_COLORS = [
  '#3cc8a0', '#4a7cff', '#f5a623', '#9b59b6',
  '#e84393', '#ef4444', '#06b6d4', '#f97316',
]

const CONCEPT_ICONS = [
  { emoji: '\uD83D\uDCDA', label: 'Books' },
  { emoji: '\uD83D\uDCD6', label: 'Open Book' },
  { emoji: '\u270F\uFE0F', label: 'Pencil' },
  { emoji: '\uD83C\uDFAF', label: 'Target' },
  { emoji: '\u26A1', label: 'Lightning' },
  { emoji: '\uD83D\uDD0C', label: 'Plug' },
  { emoji: '\uD83D\uDCBB', label: 'Laptop' },
  { emoji: '\uD83D\uDD2C', label: 'Microscope' },
  { emoji: '\u2699\uFE0F', label: 'Gear' },
  { emoji: '\uD83C\uDFA8', label: 'Palette' },
  { emoji: '\uD83E\uDDEA', label: 'Test Tube' },
  { emoji: '\uD83C\uDF0D', label: 'Globe' },
]

const defaultTree: ConceptNode = {
  id: 'root',
  name: 'Concept Tree',
  children: [],
}

const tabs: { key: TabKey; labelKey: I18nKey; icon: React.ReactNode }[] = [
  { 
    key: 'home', 
    labelKey: 'navHome', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 
  },
  { 
    key: 'learn', 
    labelKey: 'navConcepts', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-6"></path><path d="M12 16l-4-4h2l-3-4h2l-2-4h10l-2 4h2l-3 4h2z"></path></svg>
  },
  { 
    key: 'stats', 
    labelKey: 'navStats', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> 
  },
  { 
    key: 'me', 
    labelKey: 'navProfile', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 
  },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh-CN', label: 'Simplified Chinese' },
  { code: 'zh-TW', label: 'Traditional Chinese' },
]

const translateText = async (text: string, toLang: string): Promise<string> => {
  if (!text) return text
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`)
    const data = await res.json()
    return data[0].map((item: string[]) => item[0]).join('')
  } catch (e) {
    console.error('Translation failed', e)
    return text
  }
}

function collectWords(node: ConceptNode): VocabWord[] {
  const ownWords = node.words ?? []
  const childWords = (node.children ?? []).flatMap((child) => collectWords(child))
  return [...ownWords, ...childWords]
}

function findNodeById(node: ConceptNode, id: string): ConceptNode | undefined {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const match = findNodeById(child, id)
    if (match) return match
  }
  return undefined
}

function findConceptAndIndexForWord(node: ConceptNode, wordId: string): { conceptId: string; index: number } | null {
  const words = node.words || []
  const index = words.findIndex((w) => w.id === wordId)
  if (index !== -1) {
    return { conceptId: node.id, index }
  }
  for (const child of node.children || []) {
    const result = findConceptAndIndexForWord(child, wordId)
    if (result) return result
  }
  return null
}

function ConceptBranch(props: {
  node: ConceptNode
  depth?: number
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onAddWord: (conceptId: string) => void
  onEditConcept: (node: ConceptNode) => void
  onDeleteConcept: (nodeId: string) => void
  learnedWordIds: string[]
}) {
  const { node, depth = 0, onSelect, onAddChild, onAddWord, onEditConcept, onDeleteConcept, learnedWordIds } = props
  const { t } = useI18n()
  const [isExpanded, setIsExpanded] = useState(true)

  const words = collectWords(node)
  const learnedHere = words.filter((w) => learnedWordIds.includes(w.id)).length
  const hasWords = words.length > 0
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={`tree-node-wrap ${depth === 0 ? 'root-node' : ''}`}>
      <div className="tree-node-row">
        <button
          className={`tree-node ${hasWords ? 'has-words' : ''}${node.color ? ' has-color' : ''}`}
          {...(node.color ? { style: { '--node-color': node.color } as React.CSSProperties } : {})}
          onClick={() => {
            if (hasWords) {
              onSelect(node.id)
            } else if (hasChildren) {
              setIsExpanded(!isExpanded)
            }
          }}
        >
          <div className="tree-label-wrap">
            {hasChildren && (
              <span 
                className={`tree-toggle ${isExpanded ? 'expanded' : ''}`} 
                onClick={handleToggle}
              >
                ▼
              </span>
            )}
            {node.icon && (
              <span className="tree-icon-badge">
                {node.icon}
              </span>
            )}
            <span className="tree-label">{node.name}</span>
          </div>
          <span className="tree-meta">
            {learnedHere}/{words.length} {t('words')}
          </span>
        </button>
        <div className="node-actions">
          <button className="action-btn" onClick={() => onAddWord(node.id)} title={t('addWord')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </button>
          <button className="action-btn" onClick={() => onAddChild(node.id)} title={t('addSubConcept')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
          <button className="action-btn" onClick={() => onEditConcept(node)} title={t('editConcept')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="action-btn danger" onClick={() => onDeleteConcept(node.id)} title={t('deleteConcept')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map((child) => (
            <ConceptBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onAddWord={onAddWord}
              onEditConcept={onEditConcept}
              onDeleteConcept={onDeleteConcept}
              learnedWordIds={learnedWordIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WordForm({
  conceptName,
  initialWord,
  onSave,
  onCancel,
  fromLang,
  learnLang,
}: {
  conceptName: string
  initialWord?: VocabWord | null
  onSave: (word: VocabWord) => void
  onCancel: () => void
  fromLang: string
  learnLang: string
}) {
  const [term, setTerm] = useState(initialWord?.term || '')
  const [translation, setTranslation] = useState(initialWord?.translation || '')
  const [pronunciation, setPronunciation] = useState(initialWord?.pronunciation || '')
  const [definition, setDefinition] = useState(initialWord?.definition || '')
  const [example, setExample] = useState(initialWord?.example || '')
  const [exampleTranslation, setExampleTranslation] = useState(initialWord?.exampleTranslation || '')
  const [image, setImage] = useState(initialWord?.image || '')
  const [isFetching, setIsFetching] = useState(false)

  const { t } = useI18n()

  const handleFetchDictionary = async () => {
    if (!term) return alert(t('alertEnterTerm'))
    setIsFetching(true)

    setTranslation('')
    setPronunciation('')
    setDefinition('')
    setExample('')
    setExampleTranslation('')

    try {
      const dictLang = fromLang.split('-')[0]
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${dictLang}/${term}`)
      
      let foundDef = ''
      let foundExTl = ''
      let foundPronunciation = ''

      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          const meaning = data[0].meanings?.[0]
          const def = meaning?.definitions?.[0]
          if (def) {
            foundDef = def.definition || ''
            foundExTl = def.example || ''
          }
          foundPronunciation = data[0].phonetic || ''
        }
      }

      setDefinition(foundDef)
      setExampleTranslation(foundExTl)
      setPronunciation(foundPronunciation)

      const translatedTerm = await translateText(term, learnLang)
      if (translatedTerm && translatedTerm !== term) {
        setTranslation(translatedTerm)
      }

      if (foundExTl) {
        const translatedExample = await translateText(foundExTl, learnLang)
        if (translatedExample) {
          setExample(translatedExample)
        }
      }
    } catch {
      alert(t('alertFetchFailed'))
    }
    setIsFetching(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!term) return alert(t('alertTermRequired'))
    onSave({
      id: initialWord?.id || 'w-' + Date.now(),
      term,
      translation,
      pronunciation,
      definition,
      example,
      exampleTranslation,
      image: image || 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
      localeTag: initialWord?.localeTag || 'NEW',
    })
  }

  return (
    <form className="add-word-form" onSubmit={handleSubmit}>
      <h2 className="page-title">{initialWord ? t('formEditWord') : t('formAddWord')}</h2>
      <p className="page-subtitle">{initialWord ? t('editingIn') : t('addingTo')} <strong>{conceptName}</strong></p>

      <div className="form-group">
        <label>{t('term')}</label>
        <div className="input-with-button">
          <input
            className="form-input"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value)
              setTranslation('')
              setPronunciation('')
              setDefinition('')
              setExample('')
              setExampleTranslation('')
            }}
            placeholder={t('termPlaceholder')}
            required
          />
          <button
            type="button"
            className="ghost-btn fetch-btn"
            onClick={handleFetchDictionary}
            disabled={isFetching}
          >
            {isFetching ? '...' : t('fetch')}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>{t('translation')}</label>
        <input
          className="form-input"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder={t('translationPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label>{t('pronunciation')}</label>
        <input
          className="form-input"
          value={pronunciation}
          onChange={(e) => setPronunciation(e.target.value)}
          placeholder={t('pronunciationPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label>{t('formDefinition')}</label>
        <textarea
          className="form-input"
          rows={2}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder={t('definitionPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label>{t('exampleSentence')}</label>
        <textarea
          className="form-input"
          rows={2}
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder={t('examplePlaceholder')}
        />
      </div>

      <div className="form-group">
        <label>{t('exampleTranslation')}</label>
        <textarea
          className="form-input"
          rows={2}
          value={exampleTranslation}
          onChange={(e) => setExampleTranslation(e.target.value)}
          placeholder={t('exampleTranslationPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="image-upload">{t('cardImage')}</label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="form-input file-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onloadend = () => {
                setImage(reader.result as string)
              }
              reader.readAsDataURL(file)
            }
          }}
        />
        {image && (
          <img 
            src={image} 
            alt={t('preview')} 
            className="image-preview" 
          />
        )}
      </div>

      <div className="card-actions mt-20">
        <button type="button" className="ghost-btn" onClick={onCancel}>
          {t('cancel')}
        </button>
        <button type="submit" className="primary-btn">
          {t('saveWord')}
        </button>
      </div>
    </form>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadJson('hok-theme', 'light'))
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [learnView, setLearnView] = useState<LearnView>('tree')
  const [tree, setTree] = useState<ConceptNode>(() => loadJson('hok-tree', defaultTree))
  const [selectedConceptId, setSelectedConceptId] = useState('root')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [learnedWordIds, setLearnedWordIds] = useState<string[]>(() => loadJson('hok-learned', []))
  const [bookmarkedWordIds, setBookmarkedWordIds] = useState<string[]>(() => loadJson('hok-bookmarked', []))
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null)
  
  const [fromLang, setFromLang] = useState(() => loadJson('hok-fromLang', 'en'))
  const [learnLang, setLearnLang] = useState(() => loadJson('hok-learnLang', 'ko'))
  const [isTranslating, setIsTranslating] = useState(false)
  const [addingConceptToId, setAddingConceptToId] = useState<string | null>(null)
  const [newConceptName, setNewConceptName] = useState('')
  const [newConceptColor, setNewConceptColor] = useState(CONCEPT_COLORS[0])
  const [newConceptIcon, setNewConceptIcon] = useState(CONCEPT_ICONS[0].emoji)
  const [editingConcept, setEditingConcept] = useState<ConceptNode | null>(null)
  const [reviewFilterId, setReviewFilterId] = useState<string>('all')
  const [showLanguagePanel, setShowLanguagePanel] = useState(false)
  const [showCollectedWords, setShowCollectedWords] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [goals, setGoals] = useState<{ dailyCards: number | null; weeklyCards: number | null; streakDays: number | null }>(() => loadJson('hok-goals', { dailyCards: null, weeklyCards: null, streakDays: null }))
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [goalDraft, setGoalDraft] = useState<{ dailyCards: number | null; weeklyCards: number | null; streakDays: number | null }>({ dailyCards: null, weeklyCards: null, streakDays: null })
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null)
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => loadJson('hok-dailyLogs', []))
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const prevLearnedCountRef = useRef<number | null>(null)

  const uiLang = mapFromLangToUiLang(fromLang)
  const t = useCallback((key: I18nKey) => UI_MESSAGES[uiLang][key] ?? UI_MESSAGES.en[key], [uiLang])

  // Daily renewal: reset learnedWordIds at the start of each new day
  useEffect(() => {
    const lastDate = localStorage.getItem('hok-lastActiveDate')
    const todayKey = getDateKey()
    if (lastDate && lastDate !== todayKey) {
      setLearnedWordIds([])
    }
    localStorage.setItem('hok-lastActiveDate', todayKey)
  }, [])

  // Persist state to localStorage on change
  useEffect(() => { saveJson('hok-theme', theme) }, [theme])
  useEffect(() => { saveJson('hok-tree', tree) }, [tree])
  useEffect(() => { saveJson('hok-learned', learnedWordIds) }, [learnedWordIds])
  useEffect(() => { saveJson('hok-bookmarked', bookmarkedWordIds) }, [bookmarkedWordIds])
  useEffect(() => { saveJson('hok-fromLang', fromLang) }, [fromLang])
  useEffect(() => { saveJson('hok-learnLang', learnLang) }, [learnLang])
  useEffect(() => { saveJson('hok-dailyLogs', dailyLogs) }, [dailyLogs])
  useEffect(() => { saveJson('hok-goals', goals) }, [goals])

  // Study time timer: ticks every second while app is visible
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const start = () => { interval = setInterval(() => setSessionSeconds(s => s + 1), 1000) }
    const stop = () => clearInterval(interval)

    start()
    const onVisibility = () => { document.hidden ? stop() : start() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  // Flush session seconds into daily log every 10 seconds
  useEffect(() => {
    if (sessionSeconds > 0 && sessionSeconds % 10 === 0) {
      const todayKey = getDateKey()
      setDailyLogs(prev => {
        const idx = prev.findIndex(l => l.date === todayKey)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], studySeconds: updated[idx].studySeconds + 10 }
          return updated
        }
        return [...prev, { date: todayKey, cardsLearned: 0, studySeconds: 10, learnedIds: [], totalCards: 0 }]
      })
    }
  }, [sessionSeconds])

  // Track cards learned per day with word IDs
  const recordCardLearned = useCallback((wordId: string, total: number) => {
    const todayKey = getDateKey()
    setDailyLogs(prev => {
      const idx = prev.findIndex(l => l.date === todayKey)
      if (idx >= 0) {
        const existing = prev[idx]
        const ids = existing.learnedIds ?? []
        if (ids.includes(wordId)) return prev
        const updated = [...prev]
        updated[idx] = {
          ...existing,
          cardsLearned: ids.length + 1,
          learnedIds: [...ids, wordId],
          totalCards: total,
        }
        return updated
      }
      return [...prev, { date: todayKey, cardsLearned: 1, studySeconds: 0, learnedIds: [wordId], totalCards: total }]
    })
  }, [])

  const selectedNode = useMemo(
    () => findNodeById(tree, selectedConceptId) ?? tree,
    [tree, selectedConceptId],
  )
  const wordsInConcept = useMemo(() => collectWords(selectedNode), [selectedNode])
  const allWords = useMemo(() => collectWords(tree), [tree])

  const safeIndex = Math.min(currentIndex, Math.max(wordsInConcept.length - 1, 0))
  const currentWord = wordsInConcept[safeIndex] ?? null

  const learnedCount = allWords.filter(w => learnedWordIds.includes(w.id)).length
  const totalCount = allWords.length
  
  const bookmarkedWords = useMemo(
    () => allWords.filter((w) => bookmarkedWordIds.includes(w.id)),
    [allWords, bookmarkedWordIds]
  )

  // Track when learnedWordIds grows (a new card was marked learned)
  useEffect(() => {
    if (prevLearnedCountRef.current !== null && learnedWordIds.length > prevLearnedCountRef.current) {
      const newIds = learnedWordIds.slice(prevLearnedCountRef.current)
      const total = collectWords(tree).length
      for (const id of newIds) recordCardLearned(id, total)
    }
    prevLearnedCountRef.current = learnedWordIds.length
  }, [learnedWordIds, recordCardLearned, tree])

  const todayLog = useMemo(
    () => dailyLogs.find(l => l.date === getDateKey()),
    [dailyLogs],
  )
  const cardsToday = todayLog?.cardsLearned ?? 0
  const todayStudySeconds = todayLog?.studySeconds ?? 0
  const totalStudySeconds = useMemo(() => dailyLogs.reduce((sum, l) => sum + l.studySeconds, 0), [dailyLogs])
  const streak = useMemo(() => computeStreak(dailyLogs), [dailyLogs])

  const cardsThisWeek = useMemo(() => {
    const now = new Date()
    const dow = now.getDay()
    const mondayOffset = dow === 0 ? 6 : dow - 1
    const monday = new Date(now)
    monday.setDate(monday.getDate() - mondayOffset)
    const mondayKey = getDateKey(monday)
    return dailyLogs
      .filter(l => l.date >= mondayKey)
      .reduce((sum, l) => sum + l.cardsLearned, 0)
  }, [dailyLogs])

  const weekBarData = useMemo(() => {
    const days = [t('weekMon'), t('weekTue'), t('weekWed'), t('weekThu'), t('weekFri'), t('weekSat'), t('weekSun')]
    const now = new Date()
    const todayDow = now.getDay()
    const todayIdx = todayDow === 0 ? 6 : todayDow - 1

    return days.map((_, i) => {
      const diff = i - todayIdx
      const d = new Date(now)
      d.setDate(d.getDate() + diff)
      const key = getDateKey(d)
      const log = dailyLogs.find(l => l.date === key)
      return log?.cardsLearned ?? 0
    })
  }, [dailyLogs])

  const reviewQueue = useMemo(() => {
    let filteredWords = allWords
    if (reviewFilterId !== 'all') {
      const targetNode = findNodeById(tree, reviewFilterId)
      if (targetNode) {
        const wordsInFilter = collectWords(targetNode).map(w => w.id)
        filteredWords = filteredWords.filter(w => wordsInFilter.includes(w.id))
      }
    }
    return filteredWords.filter(
      (word) => bookmarkedWordIds.includes(word.id) || !learnedWordIds.includes(word.id),
    )
  }, [allWords, tree, reviewFilterId, bookmarkedWordIds, learnedWordIds])

  const allConceptsList = useMemo(() => {
    const list: { id: string; name: string }[] = []
    const traverse = (node: ConceptNode) => {
      if (node.id !== 'root') list.push({ id: node.id, name: node.name })
      node.children?.forEach(traverse)
    }
    traverse(tree)
    return list
  }, [tree])

  const enterConcept = (id: string) => {
    setSelectedConceptId(id)
    setCurrentIndex(0)
    setLearnView('card')
  }

  const handleFromLangChange = async (newLang: string) => {
    if (newLang === fromLang) return
    setIsTranslating(true)
    
    const processNodes = async (nodes: ConceptNode[]): Promise<ConceptNode[]> => {
      return Promise.all(nodes.map(async (n) => {
        const newWords = await Promise.all((n.words || []).map(async (w) => {
          const translatedDef = await translateText(w.definition, newLang)
          const translatedExTl = await translateText(w.exampleTranslation, newLang)
          return {
            ...w,
            definition: translatedDef,
            exampleTranslation: translatedExTl
          }
        }))
        
        const newChildren = n.children ? await processNodes(n.children) : []
        return {
          ...n,
          words: newWords,
          children: newChildren
        }
      }))
    }

    const translatedChildren = await processNodes(tree.children || [])
    setTree({ ...tree, children: translatedChildren })
    
    setFromLang(newLang)
    setIsTranslating(false)
  }

  const handleAddChildClick = (parentId: string) => {
    setAddingConceptToId(parentId)
    setNewConceptName('')
    setNewConceptColor(CONCEPT_COLORS[0])
    setNewConceptIcon(CONCEPT_ICONS[0].emoji)
  }

  const submitNewConcept = () => {
    if (!addingConceptToId || !newConceptName.trim()) {
      setAddingConceptToId(null)
      setNewConceptName('')
      return
    }

    const newId = newConceptName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    const newNode: ConceptNode = {
      id: newId,
      name: newConceptName.trim(),
      color: newConceptColor,
      icon: newConceptIcon,
      words: [],
      children: [],
    }

    const insertNode = (nodes: ConceptNode[]): ConceptNode[] => {
      return nodes.map((node) => {
        if (node.id === addingConceptToId) {
          return { ...node, children: [...(node.children || []), newNode] }
        }
        if (node.children) {
          return { ...node, children: insertNode(node.children) }
        }
        return node
      })
    }

    if (tree.id === addingConceptToId) {
      setTree({ ...tree, children: [...(tree.children || []), newNode] })
    } else {
      setTree({ ...tree, children: insertNode(tree.children || []) })
    }

    setAddingConceptToId(null)
    setNewConceptName('')
  }

  const handleEditConceptClick = (node: ConceptNode) => {
    setEditingConcept(node)
    setNewConceptName(node.name)
    setNewConceptColor(node.color || CONCEPT_COLORS[0])
    setNewConceptIcon(node.icon || CONCEPT_ICONS[0].emoji)
  }

  const submitEditConcept = () => {
    if (!editingConcept || !newConceptName.trim()) {
      setEditingConcept(null)
      setNewConceptName('')
      return
    }

    const updatedProps = { name: newConceptName.trim(), color: newConceptColor, icon: newConceptIcon }
    const updateNode = (nodes: ConceptNode[]): ConceptNode[] => {
      return nodes.map(n => {
        if (n.id === editingConcept.id) {
          return { ...n, ...updatedProps }
        }
        if (n.children) {
          return { ...n, children: updateNode(n.children) }
        }
        return n
      })
    }
    
    if (tree.id === editingConcept.id) {
      setTree({ ...tree, ...updatedProps })
    } else {
      setTree({ ...tree, children: updateNode(tree.children || []) })
    }
    setEditingConcept(null)
    setNewConceptName('')
  }

  const handleDeleteConceptClick = (nodeId: string) => {
    if (nodeId === tree.id) {
      alert(t('alertCannotDeleteRoot'))
      return
    }
    if (!window.confirm(t('confirmDelete'))) return

    const deleteNode = (nodes: ConceptNode[]): ConceptNode[] => {
      return nodes.filter(n => n.id !== nodeId).map(n => {
        if (n.children) {
          return { ...n, children: deleteNode(n.children) }
        }
        return n
      })
    }
    setTree({ ...tree, children: deleteNode(tree.children || []) })
  }

  const handleAddWordClick = (conceptId: string) => {
    setEditingWord(null)
    setSelectedConceptId(conceptId)
    setLearnView('add-word')
  }

  const handleEditWordClick = () => {
    if (currentWord) {
      setEditingWord(currentWord)
      setLearnView('add-word')
    }
  }

  const handleDeleteWordClick = () => {
    if (!currentWord) return
    if (!window.confirm(t('confirmDelete'))) return

    const processNodes = (nodes: ConceptNode[]): ConceptNode[] => {
      return nodes.map(n => {
        return {
          ...n,
          words: (n.words || []).filter(w => w.id !== currentWord.id),
          ...(n.children ? { children: processNodes(n.children) } : {})
        }
      })
    }

    if ((tree.words || []).some(w => w.id === currentWord.id)) {
      setTree({
        ...tree,
        words: (tree.words || []).filter(w => w.id !== currentWord.id),
        children: processNodes(tree.children || [])
      })
    } else {
      setTree({
        ...tree,
        children: processNodes(tree.children || [])
      })
    }

    // adjust view/index
    if (wordsInConcept.length <= 1) {
      setLearnView('tree')
    } else if (safeIndex >= wordsInConcept.length - 1) {
      setCurrentIndex(Math.max(0, wordsInConcept.length - 2))
    }
  }

  const handleSaveWord = (word: VocabWord) => {
    const processNodes = (nodes: ConceptNode[]): ConceptNode[] => {
      return nodes.map(n => {
        let newWords = n.words || []
        let changed = false
        
        if (editingWord && newWords.some(w => w.id === editingWord.id)) {
           newWords = newWords.map(w => w.id === editingWord.id ? word : w)
           changed = true
        } else if (!editingWord && n.id === selectedConceptId) {
           newWords = [...newWords, word]
           changed = true
        }

        return {
          ...n,
          ...(changed ? { words: newWords } : {}),
          ...(n.children ? { children: processNodes(n.children) } : {})
        }
      })
    }

    if (editingWord && (tree.words || []).some(w => w.id === editingWord.id)) {
      setTree({ 
        ...tree, 
        words: (tree.words || []).map(w => w.id === editingWord.id ? word : w), 
        children: processNodes(tree.children || []) 
      })
    } else if (!editingWord && tree.id === selectedConceptId) {
      setTree({ 
        ...tree, 
        words: [...(tree.words || []), word], 
        children: processNodes(tree.children || []) 
      })
    } else {
      setTree({ ...tree, children: processNodes(tree.children || []) })
    }
    
    if (!editingWord) {
      // jump to the newly added word (it will be at the end)
      // Since wordsInConcept hasn't updated yet, we can't reliably set the index to wordsInConcept.length
      // It's safer to just set to 0 or leave it alone, but wait, the wordsInConcept will include it next render.
      // Let's just set index to 0 or end.
      setCurrentIndex(0)
    }
    setLearnView('card')
    setEditingWord(null)
  }

  const exitForm = () => {
    if (editingWord) {
      setLearnView('card')
    } else {
      setLearnView('tree')
    }
    setEditingWord(null)
  }

  const moveCard = (direction: 1 | -1) => {
    if (wordsInConcept.length === 0) return
    setCurrentIndex(
      (safeIndex + direction + wordsInConcept.length) % wordsInConcept.length,
    )
  }

  const markLearned = () => {
    if (!currentWord) return
    if (!learnedWordIds.includes(currentWord.id)) {
      setLearnedWordIds((prev) => [...prev, currentWord.id])
    }
    moveCard(1)
  }

  const toggleBookmark = () => {
    if (!currentWord) return
    setBookmarkedWordIds((prev) =>
      prev.includes(currentWord.id)
        ? prev.filter((id) => id !== currentWord.id)
        : [...prev, currentWord.id],
    )
  }

  const handleReviewOutcome = (wordId: string, remembered: boolean) => {
    if (remembered) {
      if (!learnedWordIds.includes(wordId)) {
        setLearnedWordIds((prev) => [...prev, wordId])
      }
      if (bookmarkedWordIds.includes(wordId)) {
        setBookmarkedWordIds((prev) => prev.filter((id) => id !== wordId))
      }
    } else {
      if (learnedWordIds.includes(wordId)) {
        setLearnedWordIds((prev) => prev.filter((id) => id !== wordId))
      }
      
      const result = findConceptAndIndexForWord(tree, wordId)
      if (result) {
        setSelectedConceptId(result.conceptId)
        setCurrentIndex(result.index)
        setLearnView('card')
        setActiveTab('learn')
      }
    }
  }

  const handleBackArrow = () => {
    if (learnView === 'add-word' && editingWord) {
      exitForm()
    } else {
      setLearnView('tree')
      setEditingWord(null)
    }
  }

  const showBackArrow =
    (activeTab === 'learn' && learnView !== 'tree') || activeTab !== 'learn'

  return (
    <I18nContext.Provider value={{ t, uiLang }}>
      <div className={`app-shell ${theme}`}>
        <div className="mobile-frame">
        {/* ── Header ── */}
        <header className="top-bar">
          <button
            aria-label={t('ariaBack')}
            className={`icon-btn ${showBackArrow ? '' : 'hidden'}`}
            onClick={showBackArrow ? handleBackArrow : undefined}
          >
            ←
          </button>
          <div className="progress-wrap">
            <progress
              className="progress-track"
              value={learnedCount}
              max={Math.max(totalCount, 1)}
            />
            <span>
              {learnedCount}/{totalCount}
            </span>
          </div>
          <button
            aria-label={t('ariaToggleTheme')}
            className="icon-btn"
            onClick={() =>
              setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
            }
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>

        {/* ── Body ── */}
        <main className="screen-body">
          {/* ─── LEARN: Tree browser ─── */}
          {activeTab === 'learn' && learnView === 'tree' && (
            <div className="tree-page">
              <div className="page-header-row">
                <h2 className="page-title">{t('conceptTrees')}</h2>
                <button 
                  className="action-btn create-concept-btn"
                  onClick={() => handleAddChildClick(tree.id)}
                  title={t('createConcept')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
              <p className="page-subtitle">
                {t('conceptTreesHint')}
              </p>
              {(tree.children ?? []).map((branch) => (
                <ConceptBranch
                  key={branch.id}
                  node={branch}
                  onSelect={enterConcept}
                  onAddChild={handleAddChildClick}
                  onAddWord={handleAddWordClick}
                  onEditConcept={handleEditConceptClick}
                  onDeleteConcept={handleDeleteConceptClick}
                  learnedWordIds={learnedWordIds}
                />
              ))}
              <div className="tree-stats">
                <div className="tree-stat-item">
                  <span>{t('total')}</span>
                  <strong>{totalCount}</strong>
                </div>
                <div className="tree-stat-item">
                  <span>{t('learned')}</span>
                  <strong>{learnedCount}</strong>
                </div>
                <div className="tree-stat-item">
                  <span>{t('toGo')}</span>
                  <strong>{totalCount - learnedCount}</strong>
                </div>
              </div>

              {(addingConceptToId || editingConcept) && (
                <div className="modal-overlay">
                  <div className="modal-content concept-creator-modal">
                    <h3 className="modal-title">{editingConcept ? t('editConceptTitle') : t('newConceptTitle')}</h3>
                    
                    <div className="form-group">
                      <label>{t('conceptName')}</label>
                      <input
                        autoFocus
                        className="form-input"
                        placeholder={t('conceptNamePlaceholder')}
                        value={newConceptName}
                        onChange={(e) => setNewConceptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') editingConcept ? submitEditConcept() : submitNewConcept()
                          if (e.key === 'Escape') { setAddingConceptToId(null); setEditingConcept(null) }
                        }}
                      />
                    </div>

                    <div className="concept-creator-section">
                      <h4 className="concept-creator-label">{t('chooseColor')}</h4>
                      <div className="color-picker-grid">
                        {CONCEPT_COLORS.map((color, i) => (
                          <button
                            type="button"
                            key={color}
                            className={`color-swatch swatch-${i} ${newConceptColor === color ? 'selected' : ''}`}
                            onClick={() => setNewConceptColor(color)}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="concept-creator-section">
                      <h4 className="concept-creator-label">{t('chooseIcon')}</h4>
                      <div className="icon-picker-grid">
                        {CONCEPT_ICONS.map((icon) => (
                          <button
                            type="button"
                            key={icon.emoji}
                            className={`icon-swatch ${newConceptIcon === icon.emoji ? 'selected' : ''}`}
                            onClick={() => setNewConceptIcon(icon.emoji)}
                            aria-label={icon.label}
                          >
                            {icon.emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="concept-creator-section">
                      <h4 className="concept-creator-label">{t('preview')}</h4>
                      <div className={`concept-preview-card preview-color-${CONCEPT_COLORS.indexOf(newConceptColor)}`}>
                        <div className="concept-preview-icon">
                          <span>{newConceptIcon}</span>
                        </div>
                        <div className="concept-preview-info">
                          <span className="concept-preview-name">
                            {newConceptName.trim() || t('yourConceptName')}
                          </span>
                          <span className="concept-preview-count">{t('zeroCards')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions mt-14">
                      <button className="ghost-btn" onClick={() => { setAddingConceptToId(null); setEditingConcept(null); }}>{t('cancel')}</button>
                      <button className="primary-btn" onClick={editingConcept ? submitEditConcept : submitNewConcept}>
                        {editingConcept ? t('save') : t('add')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── LEARN: Add Word Form ─── */}
          {activeTab === 'learn' && learnView === 'add-word' && (
            <div className="sub-page">
              <WordForm
                key={editingWord ? editingWord.id : 'new-word'}
                conceptName={selectedNode.name}
                initialWord={editingWord}
                onSave={handleSaveWord}
                onCancel={exitForm}
                fromLang={fromLang}
                learnLang={learnLang}
              />
            </div>
          )}

          {/* ─── LEARN: Card view ─── */}
          {activeTab === 'learn' && learnView === 'card' && currentWord && (
            <>
              <section className="learn-card">
                <div className="learn-image">
                  <img
                    className="learn-image-media"
                    src={currentWord.image}
                    alt={currentWord.term}
                  />
                </div>

                <div className="learn-content">
                  <div className="card-header">
                    <div>
                      <h1 className="word-term">{currentWord.term}</h1>
                      <p className="word-translation">{currentWord.translation}</p>
                      <p className="word-pronunciation">{currentWord.pronunciation}</p>
                    </div>
                    <div className="card-actions-top">
                      <button 
                        className="ghost-btn icon-only-btn" 
                        onClick={handleEditWordClick} 
                        title={t('editWordTitle')}
                      >
                        ✏️
                      </button>
                      <button 
                        className="ghost-btn icon-only-btn danger-btn" 
                        onClick={handleDeleteWordClick} 
                        title={t('deleteWordTitle')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="info-box">
                    <h4>📖 {t('definition')}</h4>
                    <p>{currentWord.definition}</p>
                  </div>

                  <div className="example-box">
                    <h4>{t('example')}</h4>
                    <p className="example-sentence">{currentWord.example}</p>
                    <p className="example-tl">{currentWord.exampleTranslation}</p>
                  </div>

                  <div className="card-actions">
                    <button className="primary-btn" onClick={markLearned}>
                      {t('markLearned')}
                    </button>
                    <button className="bookmark-btn" onClick={toggleBookmark}>
                      {bookmarkedWordIds.includes(currentWord.id) ? '★' : '☆'}
                    </button>
                  </div>
                </div>
              </section>

              <div className="nav-arrows">
                <button className="arrow-btn" onClick={() => moveCard(-1)}>
                  ‹
                </button>
                <button className="arrow-btn" onClick={() => moveCard(1)}>
                  ›
                </button>
              </div>
            </>
          )}

          {activeTab === 'learn' && learnView === 'card' && !currentWord && (
            <div className="sub-page">
              <div className="empty-card-view">
                <h3>{t('noWordsYet')}</h3>
                <p className="empty">{t('emptyConceptMsg')}</p>
                <button 
                  className="primary-btn mt-20" 
                  onClick={() => handleAddWordClick(selectedConceptId)}
                >
                  {t('addWordBtn')}
                </button>
              </div>
            </div>
          )}

          {/* ─── HOME ─── */}
          {activeTab === 'home' && (
            <div className="home-page">
              <header className="home-header">
                <h1 className="app-title">{t('homeTitle')} <span className="sparkle">✨</span></h1>
                <p className="app-subtitle">{t('homeSubtitle')} 🚀</p>
              </header>

              <section className="dashboard-cards">
                <div className="progress-card">
                  <div className="card-header-row">
                    <h3>{t('todaysProgress')}</h3>
                    <span className="flame-icon">🔥</span>
                  </div>
                  <div className="progress-stats">
                    <div className="stat-box">
                      <span className="stat-label">◎ {t('cardsToday')}</span>
                      <span className="stat-value">{cardsToday}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">🔥 {t('streak')}</span>
                      <span className="stat-value">{streak} {streak === 1 ? t('day') : t('days')}</span>
                    </div>
                  </div>
                </div>

                <div className="stats-row">
                  <div className="small-stat-card outline-purple">
                    <span className="stat-icon purple">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                    </span>
                    <span className="stat-number">{totalCount}</span>
                    <span className="stat-text">{t('totalCards')}</span>
                  </div>
                  <div className="small-stat-card outline-green">
                    <span className="stat-icon green">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l9-9l-9-9l2 5l-10 2l10 2z" opacity="0"></path><path d="M12 15l-2 5l9-9l-9-9l2 5l-10 2z"></path></svg>
                    </span>
                    <span className="stat-number">{learnedCount}</span>
                    <span className="stat-text">{t('learned')}</span>
                  </div>
                  <div className="small-stat-card outline-blue">
                    <span className="stat-icon blue">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </span>
                    <span className="stat-number">{formatStudyTime(totalStudySeconds)}</span>
                    <span className="stat-text">{t('studyTime')}</span>
                  </div>
                </div>

                <div className="overall-progress-card">
                  <div className="progress-text-row">
                    <span className="progress-label">{t('overallProgress')}</span>
                    <span className="progress-percent">{totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className={`progress-bar-fill pbar-w-${Math.round((totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0) / 5) * 5}`}></div>
                  </div>
                </div>
              </section>

              <section className="continue-learning">
                <div className="section-header">
                  <h3><span className="chart-icon">📈</span> {t('continueLearning')}</h3>
                  <button type="button" className="see-all-btn" onClick={() => setActiveTab('learn')}>{t('seeAll')}</button>
                </div>
                
                <div className="review-queue-container">
                  <div className="page-header-row mb-16">
                    <h4 className="page-title review-queue-title">{t('reviewQueue')}</h4>
                    <select 
                      className="form-input select-input review-filter-select" 
                      value={reviewFilterId} 
                      onChange={(e) => setReviewFilterId(e.target.value)}
                      aria-label={t('ariaFilterByConcept')}
                    >
                      <option value="all">{t('allConcepts')}</option>
                      {allConceptsList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {reviewQueue.length === 0 ? (
                    <p className="empty">{t('allCaughtUp')}</p>
                  ) : (
                    <div className="review-list">
                      {reviewQueue.map((word) => (
                        <article key={word.id} className="review-item">
                          <div>
                            <strong>{word.term}</strong>
                            <span className="review-tl">{word.translation}</span>
                          </div>
                          <div className="review-actions">
                            <button
                              className="review-again"
                              onClick={() => handleReviewOutcome(word.id, false)}
                            >
                              {t('reviewAgain')}
                            </button>
                            <button
                              className="review-ok"
                              onClick={() => handleReviewOutcome(word.id, true)}
                            >
                              {t('reviewGotIt')}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ─── STATS ─── */}
          {activeTab === 'stats' && (() => {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            const todayDow = new Date().getDay()
            const todayIdx = todayDow === 0 ? 6 : todayDow - 1
            const weekTotal = weekBarData.reduce((a, b) => a + b, 0)
            const maxBar = Math.max(...weekBarData, 1)

            return (
              <div className="stats-page">
                <header className="stats-header">
                  <h2 className="stats-title">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    {t('statsTitle')}
                  </h2>
                  <p className="stats-subtitle">{t('statsSubtitle')}</p>
                </header>

                <div className="stats-card-grid">
                  <div className="stats-gradient-card gradient-green">
                    <span className="stats-card-icon">🔥</span>
                    <span className="stats-card-value">{streak}</span>
                    <span className="stats-card-label">{t('dayStreak')}</span>
                  </div>
                  <div className="stats-gradient-card gradient-pink">
                    <span className="stats-card-icon">◎</span>
                    <span className="stats-card-value">{cardsToday}</span>
                    <span className="stats-card-label">{t('cardsToday')}</span>
                  </div>
                  <div className="stats-gradient-card gradient-blue">
                    <span className="stats-card-icon">🏅</span>
                    <span className="stats-card-value">{learnedCount}</span>
                    <span className="stats-card-label">{t('cardsLearned')}</span>
                  </div>
                  <div className="stats-gradient-card gradient-orange">
                    <span className="stats-card-icon">🕐</span>
                    <span className="stats-card-value">{formatStudyTime(todayStudySeconds)}</span>
                    <span className="stats-card-label">{t('studyTime')}</span>
                  </div>
                </div>

                <div className="stats-week-card">
                  <div className="stats-week-header">
                    <span className="stats-week-title">📅 {t('thisWeek')}</span>
                    <span className="stats-week-total">{tpl(t('weekCardsTotal'), { n: weekTotal })}</span>
                  </div>
                  <div className="stats-bar-chart">
                    {days.map((day, i) => (
                      <div key={day} className="stats-bar-col">
                        <div className="stats-bar-track">
                          <div
                            className={`stats-bar-fill ${i === todayIdx ? 'today' : ''} bar-h-${Math.round((maxBar > 0 ? (weekBarData[i] / maxBar) * 100 : 0) / 5) * 5}`}
                          />
                        </div>
                        <span className={`stats-bar-label ${i === todayIdx ? 'today' : ''}`}>{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ─── ME ─── */}
          {activeTab === 'me' && (() => {
            const dailyPct = goals.dailyCards ? Math.min(Math.round((cardsToday / goals.dailyCards) * 100), 100) : 0
            const weeklyPct = goals.weeklyCards ? Math.min(Math.round((cardsThisWeek / goals.weeklyCards) * 100), 100) : 0
            const streakPct = goals.streakDays ? Math.min(Math.round((streak / goals.streakDays) * 100), 100) : 0
            const hasAnyGoal = goals.dailyCards !== null || goals.weeklyCards !== null || goals.streakDays !== null

            const { year: calY, month: calM } = calendarMonth
            const firstDay = new Date(calY, calM, 1).getDay()
            const daysInMonth = new Date(calY, calM + 1, 0).getDate()
            const startOffset = firstDay === 0 ? 6 : firstDay - 1
            const calCells: (number | null)[] = Array(startOffset).fill(null)
            for (let d = 1; d <= daysInMonth; d++) calCells.push(d)
            while (calCells.length % 7 !== 0) calCells.push(null)

            const monthLabel = new Date(calY, calM).toLocaleString('default', { month: 'long', year: 'numeric' })
            const todayKey = getDateKey()

            const prevMonth = () => {
              setCalendarMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 })
              setSelectedCalDay(null)
            }
            const nextMonth = () => {
              setCalendarMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 })
              setSelectedCalDay(null)
            }

            const selectedDayLog = selectedCalDay ? dailyLogs.find(l => l.date === selectedCalDay) : null

            return (
              <div className="profile-page">
                <header className="profile-header">
                  <h2 className="profile-title">{t('profileTitle')}</h2>
                  <p className="profile-subtitle">{t('profileSubtitle')}</p>
                </header>

                {/* ── Current Goal ── */}
                <div className="goal-card">
                  <div className="goal-card-header">
                    <span className="goal-card-title">🎯 {t('currentGoalsTitle')}</span>
                    <button type="button" className="goal-edit-btn" onClick={() => {
                      setGoalDraft({ ...goals })
                      setShowGoalEditor(true)
                    }}>{hasAnyGoal ? t('edit') : t('setGoals')}</button>
                  </div>

                  {!hasAnyGoal ? (
                    <div className="goal-empty">
                      <p>{t('currentGoalsEmpty')}</p>
                    </div>
                  ) : (
                    <>
                      {goals.dailyCards !== null && (
                        <div className="goal-row">
                          <div className="goal-row-info">
                            <span className="goal-row-label">📖 {t('dailyCards')}</span>
                            <span className="goal-row-numbers">{cardsToday} / {goals.dailyCards}</span>
                          </div>
                          <div className="goal-progress-bar">
                            <div className={`goal-progress-fill goal-w-${Math.round(dailyPct / 5) * 5}`} />
                          </div>
                          {dailyPct >= 100 && <span className="goal-check">✓</span>}
                        </div>
                      )}

                      {goals.weeklyCards !== null && (
                        <div className="goal-row">
                          <div className="goal-row-info">
                            <span className="goal-row-label">📅 {t('weeklyCards')}</span>
                            <span className="goal-row-numbers">{cardsThisWeek} / {goals.weeklyCards}</span>
                          </div>
                          <div className="goal-progress-bar">
                            <div className={`goal-progress-fill weekly goal-w-${Math.round(weeklyPct / 5) * 5}`} />
                          </div>
                          {weeklyPct >= 100 && <span className="goal-check">✓</span>}
                        </div>
                      )}

                      {goals.streakDays !== null && (
                        <div className="goal-row">
                          <div className="goal-row-info">
                            <span className="goal-row-label">🔥 {t('streakGoal')}</span>
                            <span className="goal-row-numbers">{streak} / {goals.streakDays} {t('days')}</span>
                          </div>
                          <div className="goal-progress-bar">
                            <div className={`goal-progress-fill streak goal-w-${Math.round(streakPct / 5) * 5}`} />
                          </div>
                          {streakPct >= 100 && <span className="goal-check">✓</span>}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {showGoalEditor && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <h3 className="modal-title">{hasAnyGoal ? t('editGoals') : t('createGoals')}</h3>
                      <p className="goal-editor-hint">{t('goalEditorHint')}</p>

                      <div className="goal-toggle-group">
                        <div className="goal-toggle-header">
                          <label htmlFor="goal-daily-toggle" className="goal-toggle-label">📖 {t('dailyCards')}</label>
                          <button
                            type="button"
                            id="goal-daily-toggle"
                            className={`toggle-switch ${goalDraft.dailyCards !== null ? 'on' : ''}`}
                            onClick={() => setGoalDraft(g => ({ ...g, dailyCards: g.dailyCards !== null ? null : 10 }))}
                          ><span className="toggle-knob" /></button>
                        </div>
                        {goalDraft.dailyCards !== null && (
                          <div className="goal-toggle-input">
                            <label htmlFor="goal-daily">{t('cardsPerDay')}</label>
                            <input
                              id="goal-daily"
                              type="number"
                              min="1"
                              className="form-input"
                              value={goalDraft.dailyCards}
                              onChange={e => setGoalDraft(g => ({ ...g, dailyCards: Math.max(1, Number(e.target.value) || 1) }))}
                            />
                          </div>
                        )}
                      </div>

                      <div className="goal-toggle-group">
                        <div className="goal-toggle-header">
                          <label htmlFor="goal-weekly-toggle" className="goal-toggle-label">📅 {t('weeklyCards')}</label>
                          <button
                            type="button"
                            id="goal-weekly-toggle"
                            className={`toggle-switch ${goalDraft.weeklyCards !== null ? 'on' : ''}`}
                            onClick={() => setGoalDraft(g => ({ ...g, weeklyCards: g.weeklyCards !== null ? null : 50 }))}
                          ><span className="toggle-knob" /></button>
                        </div>
                        {goalDraft.weeklyCards !== null && (
                          <div className="goal-toggle-input">
                            <label htmlFor="goal-weekly">{t('cardsPerWeek')}</label>
                            <input
                              id="goal-weekly"
                              type="number"
                              min="1"
                              className="form-input"
                              value={goalDraft.weeklyCards}
                              onChange={e => setGoalDraft(g => ({ ...g, weeklyCards: Math.max(1, Number(e.target.value) || 1) }))}
                            />
                          </div>
                        )}
                      </div>

                      <div className="goal-toggle-group">
                        <div className="goal-toggle-header">
                          <label htmlFor="goal-streak-toggle" className="goal-toggle-label">🔥 {t('dayStreakLabel')}</label>
                          <button
                            type="button"
                            id="goal-streak-toggle"
                            className={`toggle-switch ${goalDraft.streakDays !== null ? 'on' : ''}`}
                            onClick={() => setGoalDraft(g => ({ ...g, streakDays: g.streakDays !== null ? null : 7 }))}
                          ><span className="toggle-knob" /></button>
                        </div>
                        {goalDraft.streakDays !== null && (
                          <div className="goal-toggle-input">
                            <label htmlFor="goal-streak">{t('targetStreakDays')}</label>
                            <input
                              id="goal-streak"
                              type="number"
                              min="1"
                              className="form-input"
                              value={goalDraft.streakDays}
                              onChange={e => setGoalDraft(g => ({ ...g, streakDays: Math.max(1, Number(e.target.value) || 1) }))}
                            />
                          </div>
                        )}
                      </div>

                      <div className="card-actions mt-14">
                        <button type="button" className="ghost-btn" onClick={() => setShowGoalEditor(false)}>{t('cancel')}</button>
                        <button type="button" className="primary-btn" onClick={() => {
                          setGoals({ ...goalDraft })
                          setShowGoalEditor(false)
                        }}>{t('save')}</button>
                      </div>
                    </div>
                  </div>
                )}x

                {/* ── Study Activity Calendar ── */}
                <div className="cal-card">
                  <div className="cal-header">
                    <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                    <span className="cal-month-label">{monthLabel}</span>
                    <button className="cal-nav-btn" onClick={nextMonth}>›</button>
                  </div>
                  <div className="cal-weekdays">
                    {([t('weekMon'), t('weekTue'), t('weekWed'), t('weekThu'), t('weekFri'), t('weekSat'), t('weekSun')] as string[]).map(d => (
                      <span key={d} className="cal-weekday">{d}</span>
                    ))}
                  </div>
                  <div className="cal-grid">
                    {calCells.map((day, i) => {
                      if (day === null) return <span key={`e${i}`} className="cal-cell empty" />
                      const dateKey = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const log = dailyLogs.find(l => l.date === dateKey)
                      const hasActivity = log && log.cardsLearned > 0
                      const dayTotal = log?.totalCards || totalCount
                      const dayPct = hasActivity && dayTotal > 0
                        ? Math.round(((log?.learnedIds?.length ?? log?.cardsLearned ?? 0) / dayTotal) * 100)
                        : 0
                      const isToday = dateKey === todayKey
                      const isSelected = dateKey === selectedCalDay
                      return (
                        <button
                          key={dateKey}
                          className={`cal-cell${isToday ? ' today' : ''}${hasActivity ? ' active' : ''}${isSelected ? ' selected' : ''}`}
                          onClick={() => setSelectedCalDay(isSelected ? null : dateKey)}
                        >
                          {day}
                          {hasActivity && <span className="cal-pct">{dayPct}%</span>}
                        </button>
                      )
                    })}
                  </div>
                  {selectedCalDay && (() => {
                    const selTotal = selectedDayLog?.totalCards || totalCount
                    const selLearned = selectedDayLog?.learnedIds?.length ?? selectedDayLog?.cardsLearned ?? 0
                    const selPct = selTotal > 0 ? Math.round((selLearned / selTotal) * 100) : 0
                    return (
                      <div className="cal-day-detail">
                        <span className="cal-day-detail-date">{selectedCalDay}</span>
                        {selectedDayLog && selectedDayLog.cardsLearned > 0 ? (
                          <div className="cal-day-detail-stats">
                            <span>{tpl(t('calCardsLearned'), { learned: selLearned, total: selTotal, pct: selPct })}</span>
                            <span>{tpl(t('calStudied'), { time: formatStudyTime(selectedDayLog.studySeconds) })}</span>
                            <div className="cal-detail-bar">
                              <div className="cal-detail-bar-fill" style={{ '--cal-pct': `${selPct}%` } as React.CSSProperties} />
                            </div>
                          </div>
                        ) : (
                          <span className="cal-day-detail-empty">{t('noActivity')}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* ── Lifetime Stats ── */}
                <div className="lifetime-card">
                  <h3 className="lifetime-title">📊 {t('lifetimeStatsTitle')}</h3>
                  <div className="lifetime-grid">
                    <div className="lifetime-item">
                      <span className="lifetime-value">{learnedCount}</span>
                      <span className="lifetime-label">{t('cardsLearned')}</span>
                    </div>
                    <div className="lifetime-item">
                      <span className="lifetime-value">{totalCount}</span>
                      <span className="lifetime-label">{t('totalCards')}</span>
                    </div>
                    <div className="lifetime-item">
                      <span className="lifetime-value">{streak}</span>
                      <span className="lifetime-label">{t('dayStreak')}</span>
                    </div>
                    <div className="lifetime-item">
                      <span className="lifetime-value">{formatStudyTime(totalStudySeconds)}</span>
                      <span className="lifetime-label">{t('studyTime')}</span>
                    </div>
                    <div className="lifetime-item">
                      <span className="lifetime-value">{dailyLogs.filter(l => l.cardsLearned > 0).length}</span>
                      <span className="lifetime-label">{t('daysActive')}</span>
                    </div>
                    <div className="lifetime-item">
                      <span className="lifetime-value">{bookmarkedWords.length}</span>
                      <span className="lifetime-label">{t('starred')}</span>
                    </div>
                  </div>
                </div>

                {/* ── Settings ── */}
                <h3 className="settings-section-title">{t('settings')}</h3>
                <div className="settings-card">
                  <div className="settings-row-v2" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
                    <span className="settings-row-icon">🌙</span>
                    <span className="settings-row-label">{t('darkMode')}</span>
                    <div className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-row-v2" onClick={() => setShowLanguagePanel(true)}>
                    <span className="settings-row-icon">🌐</span>
                    <span className="settings-row-label">{t('language')}</span>
                    <div className="settings-row-trail">
                      <span className="settings-row-value">
                        {LANGUAGES.find(l => l.code === fromLang)?.label || 'English'}
                      </span>
                      <span className="settings-row-chevron">›</span>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-row-v2" onClick={() => setShowCollectedWords(prev => !prev)}>
                    <span className="settings-row-icon">⭐</span>
                    <span className="settings-row-label">{t('collectedWords')}</span>
                    <div className="settings-row-trail">
                      <span className="settings-row-value">{bookmarkedWords.length}</span>
                      <span className="settings-row-chevron">{showCollectedWords ? '▼' : '›'}</span>
                    </div>
                  </div>

                  {showCollectedWords && (
                    <>
                      <div className="settings-divider" />
                      <div className="collected-words-inline">
                        <div className="collected-words-header">
                          <h4 className="collected-words-title">{t('starredWords')}</h4>
                          <span className="collected-words-count">{tpl(t('nWords'), { n: bookmarkedWords.length })}</span>
                        </div>
                        {bookmarkedWords.length === 0 ? (
                          <p className="empty collected-words-empty">{t('noStarredWords')}</p>
                        ) : (
                          <div className="collected-words-list">
                            {bookmarkedWords.map(word => {
                              const isLearned = learnedWordIds.includes(word.id)
                              return (
                                <div
                                  key={word.id}
                                  className="collected-word-item"
                                  onClick={() => {
                                    const result = findConceptAndIndexForWord(tree, word.id)
                                    if (result) {
                                      setSelectedConceptId(result.conceptId)
                                      setCurrentIndex(result.index)
                                      setLearnView('card')
                                      setActiveTab('learn')
                                    }
                                  }}
                                >
                                  <div className="collected-word-left">
                                    <span className={`collected-word-status ${isLearned ? 'learned' : ''}`}>
                                      {isLearned ? '✓' : '○'}
                                    </span>
                                    <div className="collected-word-text">
                                      <span className="collected-word-term">{word.term}</span>
                                      <span className="collected-word-translation">{word.translation}</span>
                                    </div>
                                  </div>
                                  <div className="collected-word-right">
                                    <span className="collected-word-bookmark">★</span>
                                    <span className="collected-word-go">›</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button type="button" className="danger-reset-btn" onClick={() => setShowResetConfirm(true)}>
                  {t('resetTodayButton')}
                </button>

                {showResetConfirm && (
                  <div className="modal-overlay">
                    <div className="modal-content confirm-modal">
                      <h3 className="modal-title">{t('resetTodayTitle')}</h3>
                      <p className="confirm-msg">{t('resetTodayBody')}</p>
                      <div className="card-actions mt-14">
                        <button type="button" className="ghost-btn" onClick={() => setShowResetConfirm(false)}>{t('cancel')}</button>
                        <button type="button" className="danger-btn" onClick={() => {
                          setLearnedWordIds([])
                          const todayKey = getDateKey()
                          setDailyLogs(prev => prev.map(l =>
                            l.date === todayKey ? { ...l, cardsLearned: 0, learnedIds: [] } : l
                          ))
                          setShowResetConfirm(false)
                        }}>{t('reset')}</button>
                      </div>
                    </div>
                  </div>
                )}

                {showLanguagePanel && (
                  <div className="modal-overlay">
                    <div className="modal-content language-modal">
                      <h3 className="modal-title">{t('languageSettings')}</h3>

                      <div className="form-group">
                        <label htmlFor="from-lang-select">{t('fromLanguage')}</label>
                        <select
                          id="from-lang-select"
                          className="form-input select-input-full"
                          value={fromLang}
                          onChange={(e) => handleFromLangChange(e.target.value)}
                          disabled={isTranslating}
                        >
                          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="learn-lang-select">{t('learnLanguage')}</label>
                        <select
                          id="learn-lang-select"
                          className="form-input select-input-full"
                          value={learnLang}
                          onChange={(e) => setLearnLang(e.target.value)}
                        >
                          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>

                      {isTranslating && (
                        <span className="translation-status">{t('translating')}</span>
                      )}

                      <div className="card-actions mt-14">
                        <button className="primary-btn" onClick={() => setShowLanguagePanel(false)}>{t('done')}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </main>

        {/* ── Bottom Nav ── */}
        <nav className="bottom-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'learn') setLearnView('tree')
              }}
            >
              <span>{tab.icon}</span>
              <small>{t(tab.labelKey)}</small>
            </button>
          ))}
        </nav>
        </div>
      </div>
    </I18nContext.Provider>
  )
}

export default App
