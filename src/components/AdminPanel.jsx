import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnDanger, btnPink, pressStyle } from '../lib/styles'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

async function extractTextFromImage(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Errore lettura'))
    reader.readAsDataURL(file)
  })

  const content = file.type === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: [
        content,
        { type: 'text', text: `Estrai TUTTO il testo presente in questa pagina di un libro scolastico. Trascrivi fedelmente mantenendo la struttura. NON aggiungere commenti. Se ci sono immagini/grafici, descrivi brevemente tra parentesi quadre. Rispondi SOLO con il testo estratto.` }
      ]}]
    })
  })
  const data = await response.json()
  return data.content.filter(i => i.type === 'text').map(i => i.text).join('')
}

function getNextMonthDate(fromDate) {
  const d = new Date(fromDate)
  const day = d.getDate()
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const lastDayNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
  const targetDay = Math.min(day, lastDayNextMonth)
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay).toISOString().split('T')[0]
}

/* ─── ADMIN USERS ─── */
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

  const activatePaid = async (userId) => {
    const paidUntil = getNextMonthDate(new Date())
    await supabase.from('profiles').update({ has_paid: true, paid_until: paidUntil }).eq('id', userId)
    loadUsers()
  }

  const deactivatePaid = async (userId) => {
    await supabase.from('profiles').update({ has_paid: false, paid_until: null }).eq('id', userId)
    loadUsers()
  }

  const toggleActive = async (userId, current) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', userId)
    loadUsers()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isExpired = (paidUntil) => {
    if (!paidUntil) return false
    return new Date(paidUntil) < new Date()
  }

  if (loading) return <p style={{ fontFamily: FONTS.body, color: COLORS.grayLight }}>Caricamento...</p>

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>
        👥 Utenti registrati ({users.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '400px', overflowY: 'auto' }}>
        {users.map(u => {
          const expired = u.has_paid && isExpired(u.paid_until)
          return (
            <div key={u.id} style={{ padding: '0.75rem', borderRadius: '12px', background: u.is_admin ? COLORS.bgPurple : expired ? 'rgba(255,107,107,0.04)' : 'white', border: `1px solid ${expired ? 'rgba(255,107,107,0.2)' : COLORS.grayBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                  <span style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.dark }}>{u.child_name}</span>
                  {u.is_admin && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: COLORS.purple, color: 'white', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>ADMIN</span>}
                </div>
                <span style={{
                  fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', fontFamily: FONTS.body,
                  background: u.is_free_access ? COLORS.bgGreen : u.has_paid && !expired ? COLORS.bgGreen : u.has_paid && expired ? COLORS.bgRed : u.free_sessions_used < u.max_free_sessions ? COLORS.bgYellow : COLORS.bgRed,
                  color: u.is_free_access ? COLORS.green : u.has_paid && !expired ? COLORS.green : u.has_paid && expired ? COLORS.orange : u.free_sessions_used < u.max_free_sessions ? '#e67e22' : COLORS.orange,
                }}>
                  {u.is_free_access ? 'Gratuito' : u.has_paid && !expired ? `Pagato → ${formatDate(u.paid_until)}` : u.has_paid && expired ? `Scaduto ${formatDate(u.paid_until)}` : `${u.free_sessions_used}/${u.max_free_sessions} gratis`}
                </span>
              </div>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight, margin: '0 0 0.5rem' }}>{u.email}</p>
              {!u.is_admin && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button onClick={() => toggleFreeAccess(u.id, u.is_free_access)}
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_free_access ? COLORS.green : COLORS.grayBorder, color: u.is_free_access ? 'white' : COLORS.gray }}>
                    {u.is_free_access ? '✓ Gratuito' : 'Rendi gratuito'}
                  </button>
                  {(!u.has_paid || expired) ? (
                    <button onClick={() => activatePaid(u.id)}
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.purple, color: 'white' }}>
                      {expired ? '🔄 Rinnova (+30gg)' : '💳 Attiva pagamento'}
                    </button>
                  ) : (
                    <button onClick={() => deactivatePaid(u.id)}
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.purple, color: 'white' }}>
                      ✓ Pagato
                    </button>
                  )}
                  <button onClick={() => toggleActive(u.id, u.is_active)}
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_active ? COLORS.grayBorder : COLORS.red, color: u.is_active ? COLORS.gray : 'white' }}>
                    {u.is_active ? 'Disattiva' : 'Riattiva'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── ADMIN SUBJECTS ─── */
function AdminSubjects() {
  const [subjects, setSubjects] = useState([])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')
  useEffect(() => { loadSubjects() }, [])
  const loadSubjects = async () => { const { data } = await supabase.from('subjects').select('*').order('name'); setSubjects(data || []) }
  const addSubject = async () => { if (!newName.trim()) return; await supabase.from('subjects').insert({ name: newName.trim(), icon: newIcon }); setNewName(''); setNewIcon('📚'); loadSubjects() }
  const deleteSubject = async (id) => { if (!confirm('Eliminare questa materia e tutti i suoi contenuti?')) return; await supabase.from('subjects').delete().eq('id', id); loadSubjects() }
  const icons = ['📚', '📖', '🌍', '🔬', '🧮', '🇬🇧', '💻', '🎨', '🎵', '⚽', '📐', '🏛️']

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>📚 Materie</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {icons.map(ic => (
            <button key={ic} onClick={() => setNewIcon(ic)} style={{ fontSize: '1.2rem', padding: '0.3rem', border: newIcon === ic ? `2px solid ${COLORS.purple}` : '2px solid transparent', borderRadius: '8px', background: newIcon === ic ? COLORS.bgPurple : 'transparent', cursor: 'pointer' }}>{ic}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome materia..." onKeyDown={e => e.key === 'Enter' && addSubject()}
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '10px', fontFamily: FONTS.body, fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={addSubject} style={{ ...btnSuccess, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>+ Aggiungi</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {subjects.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: COLORS.bgPurple, borderRadius: '10px', border: '1px solid rgba(108,92,231,0.1)' }}>
            <span>{s.icon}</span>
            <span style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.dark }}>{s.name}</span>
            <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── ADMIN PAGES ─── */
function AdminPages() {
  const [subjects, setSubjects] = useState([])
  const [pages, setPages] = useState([])
  const [form, setForm] = useState({ subject_id: '', school_year: '1', section: '', page_number: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const fileRef = useRef(null)
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: subs } = await supabase.from('subjects').select('*').order('name')
    const { data: pgs } = await supabase.from('pages').select('*, subjects(name, icon)').order('subject_id').order('page_number')
    setSubjects(subs || []); setPages(pgs || [])
  }

  const handleFile = (files) => {
    const f = files[0]; if (!f) return; setFile(f)
    if (f.type.startsWith('image/')) { setPreview(URL.createObjectURL(f)) } else { setPreview(null) }
  }

  const uploadPage = async () => {
    if (!form.subject_id || !form.page_number || !file) return
    setUploading(true); setUploadMsg('📤 Caricamento immagine...')
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${form.subject_id}_${form.school_year}_${form.page_number}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('pages').upload(fileName, file)
      if (uploadError) throw uploadError
      const imageUrl = `${supabaseUrl}/storage/v1/object/public/pages/${fileName}`
      setUploadMsg('🧠 Estraggo il testo con l\'AI...')
      let extractedText = ''
      try { extractedText = await extractTextFromImage(file, apiKey) } catch (e) { console.error(e) }
      setUploadMsg('💾 Salvataggio...')
      await supabase.from('pages').insert({ subject_id: form.subject_id, school_year: form.school_year, section: form.section || null, page_number: parseInt(form.page_number), image_url: imageUrl, extracted_text: extractedText })
      setUploadMsg('✅ Pagina caricata!')
      setForm({ ...form, page_number: String(parseInt(form.page_number) + 1) })
      setFile(null); setPreview(null); loadData()
      setTimeout(() => setUploadMsg(''), 3000)
    } catch (err) { console.error(err); setUploadMsg('❌ Errore. Riprova!') }
    setUploading(false)
  }

  const deletePage = async (page) => {
    if (!confirm(`Eliminare pagina ${page.page_number}?`)) return
    const fileName = page.image_url.split('/pages/')[1]
    if (fileName) await supabase.storage.from('pages').remove([fileName])
    await supabase.from('pages').delete().eq('id', page.id); loadData()
  }

  const filteredPages = filterSubject ? pages.filter(p => p.subject_id === filterSubject) : pages

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>📸 Pagine dei libri ({pages.length})</h3>
      <div style={{ padding: '1rem', background: COLORS.bgPurple, borderRadius: '14px', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.purple, marginBottom: '0.6rem' }}>Carica una pagina</p>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <select value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}
            style={{ flex: 1, minWidth: '120px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            <option value="">Materia...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={form.school_year} onChange={e => setForm({...form, school_year: e.target.value})}
            style={{ width: '70px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y}ª</option>)}
          </select>
          <input value={form.section} onChange={e => setForm({...form, section: e.target.value})} placeholder="Sez."
            style={{ width: '55px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
          <input type="number" value={form.page_number} onChange={e => setForm({...form, page_number: e.target.value})} placeholder="Pag."
            style={{ width: '65px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
        </div>
        <div onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${COLORS.purpleLight}`, borderRadius: '12px', padding: file ? '0.5rem' : '1rem', textAlign: 'center', cursor: 'pointer', marginBottom: '0.5rem', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', minHeight: file ? 'auto' : '80px' }}>
          {preview ? <img src={preview} alt="anteprima" style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} /> : file ? <span style={{ fontSize: '2rem' }}>📄</span> : null}
          <div>
            {file ? (
              <><p style={{ fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.dark, margin: 0 }}>{file.name}</p><p style={{ fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight, margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p></>
            ) : (
              <><p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.purple, fontWeight: 600, margin: '0 0 0.2rem' }}>📷 Tocca per caricare</p><p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>Foto o PDF della pagina</p></>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files)} />
        {uploadMsg && <p style={{ fontFamily: FONTS.body, fontSize: '0.78rem', margin: '0.4rem 0', color: uploadMsg.includes('✅') ? COLORS.green : uploadMsg.includes('❌') ? COLORS.orange : COLORS.purple }}>{uploadMsg}</p>}
        <button onClick={uploadPage} disabled={uploading || !file || !form.subject_id || !form.page_number}
          style={{ ...btnSuccess, width: '100%', padding: '0.6rem', fontSize: '0.9rem', marginTop: '0.3rem', opacity: (uploading || !file || !form.subject_id || !form.page_number) ? 0.5 : 1 }}>
          {uploading ? uploadMsg : '⬆️ Carica pagina'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterSubject('')} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.75rem', background: !filterSubject ? COLORS.purple : COLORS.grayBorder, color: !filterSubject ? 'white' : COLORS.gray }}>Tutte</button>
        {subjects.map(s => (
          <button key={s.id} onClick={() => setFilterSubject(s.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.75rem', background: filterSubject === s.id ? COLORS.purple : COLORS.grayBorder, color: filterSubject === s.id ? 'white' : COLORS.gray }}>{s.icon} {s.name}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
        {filteredPages.map(p => (
          <div key={p.id} style={{ width: '90px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.grayBorder}`, background: 'white', position: 'relative' }}>
            <img src={p.image_url} alt={`pag ${p.page_number}`} style={{ width: '100%', height: '110px', objectFit: 'cover' }} onError={e => { e.target.style.background = COLORS.bgPurple }} />
            <div style={{ padding: '0.3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.72rem', color: COLORS.dark, margin: 0 }}>{p.subjects?.icon} Pag. {p.page_number}</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.6rem', color: COLORS.grayLight, margin: 0 }}>{p.school_year}ª{p.section ? ` ${p.section}` : ''}</p>
            </div>
            <button onClick={() => deletePage(p)} style={{ position: 'absolute', top: '3px', right: '3px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>✕</button>
          </div>
        ))}
        {filteredPages.length === 0 && <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, textAlign: 'center', width: '100%', padding: '1.5rem 0' }}>Nessuna pagina caricata.</p>}
      </div>
    </div>
  )
}

/* ─── MAIN ADMIN ─── */
export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('pages')
  const tabs = [
    { id: 'pages', label: '📸 Pagine', component: <AdminPages /> },
    { id: 'subjects', label: '📚 Materie', component: <AdminSubjects /> },
    { id: 'users', label: '👥 Utenti', component: <AdminUsers /> },
  ]

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>← Torna all'app</button>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, marginBottom: '1rem' }}>⚙️ Pannello Admin</h2>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.78rem', fontWeight: 600, background: tab === t.id ? COLORS.purple : COLORS.grayBorder, color: tab === t.id ? 'white' : COLORS.gray, transition: 'all 0.2s ease' }}>{t.label}</button>
        ))}
      </div>
      {tabs.find(t => t.id === tab)?.component}
    </div>
  )
}
