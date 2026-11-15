import type { GenderForms } from './app-utils'
import { useI18n } from './i18n'

function Attribution({ sourceUrl }: { sourceUrl?: string }) {
  const { t } = useI18n()
  return sourceUrl ? <small className="gender-attribution"><a href={sourceUrl} target="_blank" rel="noreferrer">{t('wiktionarySource')}</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></small> : null
}

export function GenderFields({ id, label, forms, onChange }: {
  id: string; label: string; forms: GenderForms; onChange: (forms: GenderForms) => void
}) {
  const { t } = useI18n()
  return <fieldset className="gender-fields" aria-describedby={`${id}-hint`}>
    <legend>{label} · {t(forms.language === 'fr' ? 'french' : 'spanish')}</legend>
    <p id={`${id}-hint`} className="gender-hint">{t('genderHint')}</p>
    <div className="gender-inputs">
      {(['masculine', 'feminine'] as const).map(gender => <div className="form-group" key={gender}>
        <label htmlFor={`${id}-${gender}`}>{t(gender)}</label>
        <input id={`${id}-${gender}`} className="form-input" value={forms[gender]} onChange={event => onChange({ ...forms, [gender]: event.target.value })} autoCapitalize="none" lang={forms.language} />
      </div>)}
    </div>
    {forms.masculine && forms.masculine === forms.feminine && <p className="gender-hint">{t('sameGenderForm')}</p>}
    <Attribution sourceUrl={forms.sourceUrl} />
  </fieldset>
}

export function GenderSummary({ forms, compact = false }: { forms?: GenderForms; compact?: boolean }) {
  const { t } = useI18n()
  if (!forms || (!forms.masculine && !forms.feminine)) return null
  return <div className={`gender-summary${compact ? ' compact' : ''}`}>
    {!compact && <h4>{t('genderForms')} · {t(forms.language === 'fr' ? 'french' : 'spanish')}</h4>}
    <dl>{(['masculine', 'feminine'] as const).map(gender => forms[gender] ? <div key={gender}><dt>{t(gender)}</dt><dd lang={forms.language}>{forms[gender]}</dd></div> : null)}</dl>
    {!compact && <Attribution sourceUrl={forms.sourceUrl} />}
  </div>
}
