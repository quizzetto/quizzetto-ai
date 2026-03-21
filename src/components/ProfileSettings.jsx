import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, btnSuccess, pressStyle } from '../lib/styles'

export default function ProfileSettings({ profile, onBack, onUpdated }) {
  const [childName, setChildName] = useState(profile.child_name || '')
  const [schoolYear, setSchoolYear] = useState(profile.school_year || '1')
  const [section, setSection] = useState(profile.section || '')
  const [notifyQuiz, setNotifyQuiz] = useState(profile.notify_after_quiz || false)
  const [notifyWeekly, setNotifyWeekly] = useState(profile.notify_weekly || false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await supabase.from('profiles').update({
      child_name: childName.trim() || 'Bambino',
      school_year: schoolYear,
      section: section.trim().toUpperCase() || null,
      notify_after_quiz: notifyQuiz,
      notify_weekly: notifyWeekly,
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    if (onUpdated) onUpdated()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        ← Indietro
      </button>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</div>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.2rem' }}>Il mio profilo</h2>
        <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, margin: 0 }}>Modifica i tuoi dati</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Child name */}
        <div>
          <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
            Nome del bambino
          </label>
          <input type="text" value={childName} onChange={e => setChildName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = COLORS.purple}
            onBlur={e => e.target.style.borderColor = COLORS.grayBorder} />
        </div>

        {/* Class and section */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
              Classe
            </label>
            <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
              {['1', '2', '3', '4', '5'].map(y => <option key={y} value={y}>{y}ª elementare</option>)}
            </select>
          </div>
          <div style={{ width: '100px' }}>
            <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
              Sezione
            </label>
            <input type="text" value={section} onChange={e => setSection(e.target.value)} placeholder="Es: E"
              maxLength={3}
              style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none', textTransform: 'uppercase', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = COLORS.purple}
              onBlur={e => e.target.style.borderColor = COLORS.grayBorder} />
          </div>
        </div>

        {/* Notifications */}
        <div style={{ padding: '0.75rem', background: COLORS.bgPurple, borderRadius: '12px' }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: COLORS.purple, marginBottom: '0.6rem' }}>
            📧 Notifiche email
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.gray, marginBottom: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyQuiz} onChange={e => setNotifyQuiz(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: COLORS.purple }} />
            Ricevi i risultati dopo ogni quiz
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.gray, cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyWeekly} onChange={e => setNotifyWeekly(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: COLORS.purple }} />
            Ricevi il riepilogo settimanale (domenica)
          </label>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} {...pressStyle}
          style={{ ...btnSuccess, width: '100%', padding: '0.9rem', fontSize: '1.05rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? '...' : saved ? '✅ Salvato!' : '💾 Salva modifiche'}
        </button>

        {saved && (
          <p style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.green }}>
            Modifiche salvate! Le nuove impostazioni sono attive.
          </p>
        )}
      </div>
    </div>
  )
}
