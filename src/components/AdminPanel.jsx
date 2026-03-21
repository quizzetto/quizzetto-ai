import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnDanger, pressStyle, card } from '../lib/styles'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const toggleFreeAccess = async (userId, current) => {
    await supabase.from('profiles').update({ is_free_access: !current }).eq('id', userId)
    loadUsers()
  }

  const togglePaid = async (userId, current) => {
    await supabase.from('profiles').update({ has_paid: !current }).eq('id', userId)
    loadUsers()
  }

  const toggleActive = async (userId, current) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', userId)
    loadUsers()
  }

  if (loading) return <p style={{ fontFamily: FONTS.body, color: COLORS.grayLight }}>Caricamento...</p>

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>
        👥 Utenti registrati ({users.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '400px', overflowY: 'auto' }}>
        {users.map(u => (
          <div key={u.id} style={{
            padding: '0.75rem', borderRadius: '12px', background: u.is_admin ? COLORS.bgPurple : 'white',
            border: `1px solid ${COLORS.grayBorder}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div>
                <span style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.dark }}>{u.child_name}</span>
                {u.is_admin && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: COLORS.purple, color: 'white', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>ADMIN</span>}
              </div>
              <span style={{
                fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', fontFamily: FONTS.body,
                background: u.has_paid || u.is_free_access ? COLORS.bgGreen : u.free_sessions_used < u.max_free_sessions ? COLORS.bgYellow : COLORS.bgRed,
                color: u.has_paid || u.is_free_access ? COLORS.green : u.free_sessions_used < u.max_free_sessions ? '#e67e22' : COLORS.orange,
              }}>
                {u.has_paid ? 'Pagato' : u.is_free_access ? 'Gratuito' : `${u.free_sessions_used}/${u.max_free_sessions} gratis`}
              </span>
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight, margin: '0 0 0.5rem' }}>{u.email}</p>
            {!u.is_admin && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button onClick={() => toggleFreeAccess(u.id, u.is_free_access)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_free_access ? COLORS.green : COLORS.grayBorder, color: u.is_free_access ? 'white' : COLORS.gray }}>
                  {u.is_free_access ? '✓ Gratuito' : 'Rendi gratuito'}
                </button>
                <button onClick={() => togglePaid(u.id, u.has_paid)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.has_paid ? COLORS.purple : COLORS.grayBorder, color: u.has_paid ? 'white' : COLORS.gray }}>
                  {u.has_paid ? '✓ Pagato' : 'Segna pagato'}
                </button>
                <button onClick={() => toggleActive(u.id, u.is_active)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_active ? COLORS.grayBorder : COLORS.red, color: u.is_active ? COLORS.gray : 'white' }}>
                  {u.is_active ? 'Disattiva' : 'Riattiva'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminSubjects() {
  const [subjects, setSubjects] = useState([])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')

  useEffect(() => { loadSubjects() }, [])

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const addSubject = async () => {
    if (!newName.trim()) return
    await supabase.from('subjects').insert({ name: newName.trim(), icon: newIcon })
    setNewName('')
    setNewIcon('📚')
    loadSubjects()
  }

  const deleteSubject = async (id) => {
    if (!confirm('Eliminare questa materia e tutti i suoi contenuti?')) return
    await supabase.from('subjects').delete().eq('id', id)
    loadSubjects()
  }

  const icons = ['📚', '📖', '🌍', '🔬', '🧮', '🇬🇧', '💻', '🎨', '🎵', '⚽', '📐', '🏛️']

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>
        📚 Materie
      </h3>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {icons.map(ic => (
            <button key={ic} onClick={() => setNewIcon(ic)}
              style={{ fontSize: '1.2rem', padding: '0.3rem', border: newIcon === ic ? `2px solid ${COLORS.purple}` : '2px solid transparent', borderRadius: '8px', background: newIcon === ic ? COLORS.bgPurple : 'transparent', cursor: 'pointer' }}>
              {ic}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome materia..."
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '10px', fontFamily: FONTS.body, fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={addSubject} style={{ ...btnSuccess, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>+ Aggiungi</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {subjects.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: COLORS.bgPurple, borderRadius: '10px', border: `1px solid rgba(108,92,231,0.1)` }}>
            <span>{s.icon}</span>
            <span style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.dark }}>{s.name}</span>
            <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.4, padding: '0 0.2rem' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminContents() {
  const [subjects, setSubjects] = useState([])
  const [contents, setContents] = useState([])
  const [form, setForm] = useState({ subject_id: '', school_year: '1', section: '', title: '', page_start: '', page_end: '', content_text: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: subs } = await supabase.from('subjects').select('*').order('name')
    const { data: conts } = await supabase.from('contents').select('*, subjects(name, icon)').order('school_year').order('title')
    setSubjects(subs || [])
    setContents(conts || [])
  }

  const addContent = async () => {
    if (!form.subject_id || !form.title || !form.content_text || !form.page_start) return
    await supabase.from('contents').insert({
      subject_id: form.subject_id,
      school_year: form.school_year,
      section: form.section || null,
      title: form.title,
      page_start: parseInt(form.page_start),
      page_end: parseInt(form.page_end || form.page_start),
      content_text: form.content_text,
    })
    setForm({ subject_id: '', school_year: '1', section: '', title: '', page_start: '', page_end: '', content_text: '' })
    loadData()
  }

  const deleteContent = async (id) => {
    if (!confirm('Eliminare questo contenuto?')) return
    await supabase.from('contents').delete().eq('id', id)
    loadData()
  }

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>
        📄 Contenuti dei libri
      </h3>

      {/* Add form */}
      <div style={{ padding: '1rem', background: COLORS.bgPurple, borderRadius: '14px', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.purple, marginBottom: '0.6rem' }}>Aggiungi contenuto</p>
        
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <select value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}
            style={{ flex: 1, minWidth: '120px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            <option value="">Materia...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={form.school_year} onChange={e => setForm({...form, school_year: e.target.value})}
            style={{ width: '80px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y}ª</option>)}
          </select>
          <input value={form.section} onChange={e => setForm({...form, section: e.target.value})} placeholder="Sez. (opz.)"
            style={{ width: '70px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
        </div>

        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Titolo argomento (es: I Romani)"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem', marginBottom: '0.5rem', boxSizing: 'border-box' }} />

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <input type="number" value={form.page_start} onChange={e => setForm({...form, page_start: e.target.value})} placeholder="Da pag."
            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
          <input type="number" value={form.page_end} onChange={e => setForm({...form, page_end: e.target.value})} placeholder="A pag."
            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
        </div>

        <textarea value={form.content_text} onChange={e => setForm({...form, content_text: e.target.value})}
          placeholder="Incolla qui il testo del libro per queste pagine..."
          rows={5}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }} />

        <button onClick={addContent} style={{ ...btnSuccess, width: '100%', padding: '0.6rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          ✅ Salva contenuto
        </button>
      </div>

      {/* Existing contents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
        {contents.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'white', borderRadius: '10px', border: `1px solid ${COLORS.grayBorder}` }}>
            <span style={{ fontSize: '1.1rem' }}>{c.subjects?.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: COLORS.dark, margin: 0 }}>{c.title}</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight, margin: 0 }}>
                {c.subjects?.name} · {c.school_year}ª{c.section ? ` ${c.section}` : ''} · pag. {c.page_start}{c.page_end > c.page_start ? `-${c.page_end}` : ''}
              </p>
            </div>
            <button onClick={() => deleteContent(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.4 }}>🗑️</button>
          </div>
        ))}
        {contents.length === 0 && <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, textAlign: 'center' }}>Nessun contenuto ancora. Aggiungine uno!</p>}
      </div>
    </div>
  )
}

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('users')

  const tabs = [
    { id: 'users', label: '👥 Utenti', component: <AdminUsers /> },
    { id: 'subjects', label: '📚 Materie', component: <AdminSubjects /> },
    { id: 'contents', label: '📄 Contenuti', component: <AdminContents /> },
  ]

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        ← Torna all'app
      </button>

      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, marginBottom: '1rem' }}>⚙️ Pannello Admin</h2>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontFamily: FONTS.body, fontSize: '0.78rem', fontWeight: 600,
              background: tab === t.id ? COLORS.purple : COLORS.grayBorder,
              color: tab === t.id ? 'white' : COLORS.gray,
              transition: 'all 0.2s ease',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tabs.find(t => t.id === tab)?.component}
    </div>
  )
}
