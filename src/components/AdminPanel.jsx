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
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
      messages: [{ role: 'user', content: [content, { type: 'text', text: 'Estrai TUTTO il testo presente in questa pagina di un libro scolastico. Trascrivi fedelmente mantenendo la struttura. NON aggiungere commenti. Se ci sono immagini/grafici, descrivi brevemente tra parentesi quadre. Rispondi SOLO con il testo estratto.' }] }]
    })
  })
  const data = await response.json()
  return data.content.filter(i => i.type === 'text').map(i => i.text).join('')
}

function extractPageNumber(filename) {
  // Remove extension first
  const nameOnly = filename.replace(/\.[^.]+$/, '')
  // Take the last 3 characters and try to parse as number
  const lastChars = nameOnly.slice(-3)
  const num = parseInt(lastChars)
  if (!isNaN(num)) return num
  // Fallback: find the last number sequence in the filename
  const matches = nameOnly.match(/(\d+)/g)
  if (matches && matches.length > 0) return parseInt(matches[matches.length - 1])
  return null
}

function getNextMonthDate(fromDate) {
  const d = new Date(fromDate)
  const day = d.getDate()
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const lastDayNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(day, lastDayNextMonth)).toISOString().split('T')[0]
}

/* ─── ADMIN USERS ─── */
function AdminUsers() {
  const [users, setUsers] = useState([])
  const [quizStats, setQuizStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ child_name: '', school_year: '1', section: '' })
  useEffect(() => { loadUsers() }, [])
  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    // Load quiz stats and page stats for each user
    const { data: results } = await supabase.from('quiz_results').select('user_id, total_count')
    const stats = {}
    const pageStats = {}
    if (results) {
      results.forEach(r => {
        stats[r.user_id] = (stats[r.user_id] || 0) + 1
        pageStats[r.user_id] = (pageStats[r.user_id] || 0) + (r.total_count || 0)
      })
    }
    // Also count total pages from quizzes generated
    const { data: quizzes } = await supabase.from('quizzes').select('user_id, page_start, page_end')
    const totalPages = {}
    if (quizzes) {
      quizzes.forEach(q => {
        const pages = q.page_end && q.page_start ? (q.page_end - q.page_start + 1) : 1
        totalPages[q.user_id] = (totalPages[q.user_id] || 0) + pages
      })
    }
    setQuizStats({ counts: stats, pages: totalPages })
    setLoading(false)
  }
  const toggleFreeAccess = async (userId, current) => { await supabase.from('profiles').update({ is_free_access: !current }).eq('id', userId); loadUsers() }
  const activatePaid = async (userId) => { await supabase.from('profiles').update({ has_paid: true, paid_until: getNextMonthDate(new Date()) }).eq('id', userId); loadUsers() }
  const deactivatePaid = async (userId) => { await supabase.from('profiles').update({ has_paid: false, paid_until: null }).eq('id', userId); loadUsers() }
  const toggleActive = async (userId, current) => { await supabase.from('profiles').update({ is_active: !current }).eq('id', userId); loadUsers() }
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
  const isExpired = (d) => d ? new Date(d) < new Date() : false
  const daysUntilExpiry = (d) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const startEdit = (u) => {
    setEditing(u.id)
    setEditForm({ child_name: u.child_name || '', school_year: u.school_year || '1', section: u.section || '' })
  }

  const saveEdit = async (userId) => {
    await supabase.from('profiles').update({
      child_name: editForm.child_name.trim() || 'Bambino',
      school_year: editForm.school_year,
      section: editForm.section.trim().toUpperCase() || null,
    }).eq('id', userId)
    setEditing(null)
    loadUsers()
  }

  if (loading) return <p style={{ fontFamily: FONTS.body, color: COLORS.grayLight }}>Caricamento...</p>
  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>👥 Utenti registrati ({users.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '400px', overflowY: 'auto' }}>
        {users.map(u => {
          const expired = u.has_paid && isExpired(u.paid_until)
          const daysLeft = u.has_paid ? daysUntilExpiry(u.paid_until) : null
          const expiringSOon = daysLeft !== null && daysLeft > 0 && daysLeft <= 5
          const isEditing = editing === u.id
          return (
            <div key={u.id} style={{ padding: '0.75rem', borderRadius: '12px', background: u.is_admin ? COLORS.bgPurple : expired ? 'rgba(255,107,107,0.04)' : expiringSOon ? 'rgba(253,203,110,0.06)' : 'white', border: `1px solid ${expired ? 'rgba(255,107,107,0.2)' : expiringSOon ? 'rgba(253,203,110,0.3)' : COLORS.grayBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                  <span style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.dark }}>{u.child_name}</span>
                  {u.is_admin && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: COLORS.purple, color: 'white', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>ADMIN</span>}
                  <span style={{ marginLeft: '0.4rem', fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight }}>{u.school_year}ª{u.section ? ` ${u.section}` : ''}</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', fontFamily: FONTS.body,
                  background: u.is_free_access ? COLORS.bgGreen : u.has_paid && !expired && !expiringSOon ? COLORS.bgGreen : u.has_paid && expiringSOon ? COLORS.bgRed : u.has_paid && expired ? COLORS.bgRed : u.free_sessions_used < u.max_free_sessions ? COLORS.bgYellow : COLORS.bgRed,
                  color: u.is_free_access ? COLORS.green : u.has_paid && !expired && !expiringSOon ? COLORS.green : u.has_paid && expiringSOon ? COLORS.red : u.has_paid && expired ? COLORS.orange : u.free_sessions_used < u.max_free_sessions ? '#e67e22' : COLORS.orange }}>
                  {u.is_free_access ? 'Gratuito' : u.has_paid && expired ? `Scaduto ${formatDate(u.paid_until)}` : u.has_paid && expiringSOon ? `⚠️ Scade tra ${daysLeft}gg (${formatDate(u.paid_until)})` : u.has_paid ? `Pagato → ${formatDate(u.paid_until)}` : `${u.free_sessions_used}/${u.max_free_sessions} gratis`}
                </span>
              </div>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight, margin: '0 0 0.2rem' }}>
                {u.email} · Registrato: {formatDateTime(u.created_at)}
              </p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: '0 0 0.5rem' }}>
                📝 {quizStats.counts?.[u.id] || 0} quiz tot. · 📄 {quizStats.pages?.[u.id] || 0} pagine tot. · 📄 {u.daily_pages_used || 0}/{u.max_daily_pages || 20} oggi
              </p>
              
              {/* Edit form */}
              {isEditing && (
                <div style={{ padding: '0.6rem', background: COLORS.bgPurple, borderRadius: '10px', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <input value={editForm.child_name} onChange={e => setEditForm({...editForm, child_name: e.target.value})} placeholder="Nome"
                      style={{ flex: 1, minWidth: '100px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.8rem' }} />
                    <select value={editForm.school_year} onChange={e => setEditForm({...editForm, school_year: e.target.value})}
                      style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.8rem' }}>
                      {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y}ª</option>)}
                    </select>
                    <input value={editForm.section} onChange={e => setEditForm({...editForm, section: e.target.value})} placeholder="Sez."
                      maxLength={3}
                      style={{ width: '50px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.8rem', textTransform: 'uppercase' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => saveEdit(u.id)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.green, color: 'white' }}>✓ Salva</button>
                    <button onClick={() => setEditing(null)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.grayBorder, color: COLORS.gray }}>Annulla</button>
                  </div>
                </div>
              )}

              {!u.is_admin && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button onClick={() => startEdit(u)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: isEditing ? COLORS.purple : COLORS.grayBorder, color: isEditing ? 'white' : COLORS.gray }}>✏️ Modifica</button>
                  <button onClick={() => toggleFreeAccess(u.id, u.is_free_access)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_free_access ? COLORS.green : COLORS.grayBorder, color: u.is_free_access ? 'white' : COLORS.gray }}>{u.is_free_access ? '✓ Gratuito' : 'Rendi gratuito'}</button>
                  {(!u.has_paid || expired) ? (
                    <button onClick={() => activatePaid(u.id)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.purple, color: 'white' }}>{expired ? '🔄 Rinnova' : '💳 Attiva'}</button>
                  ) : (
                    <button onClick={() => deactivatePaid(u.id)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.purple, color: 'white' }}>✓ Pagato</button>
                  )}
                  <button onClick={() => toggleActive(u.id, u.is_active)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: u.is_active ? COLORS.grayBorder : COLORS.red, color: u.is_active ? COLORS.gray : 'white' }}>{u.is_active ? 'Disattiva' : 'Riattiva'}</button>
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
          {icons.map(ic => (<button key={ic} onClick={() => setNewIcon(ic)} style={{ fontSize: '1.2rem', padding: '0.3rem', border: newIcon === ic ? `2px solid ${COLORS.purple}` : '2px solid transparent', borderRadius: '8px', background: newIcon === ic ? COLORS.bgPurple : 'transparent', cursor: 'pointer' }}>{ic}</button>))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome materia..." onKeyDown={e => e.key === 'Enter' && addSubject()} style={{ flex: 1, padding: '0.5rem 0.75rem', border: `1.5px solid ${COLORS.grayBorder}`, borderRadius: '10px', fontFamily: FONTS.body, fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={addSubject} style={{ ...btnSuccess, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>+ Aggiungi</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {subjects.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: COLORS.bgPurple, borderRadius: '10px', border: '1px solid rgba(108,92,231,0.1)' }}>
            <span>{s.icon}</span><span style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.dark }}>{s.name}</span>
            <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── ADMIN PAGES (batch upload) ─── */
function AdminPages() {
  const [subjects, setSubjects] = useState([])
  const [pages, setPages] = useState([])
  const [form, setForm] = useState({ subject_id: '', school_year: '1', section: '', book_title: '' })
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, currentFile: '', phase: '' })
  const [uploadResults, setUploadResults] = useState(null)
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

  const handleFiles = (inputFiles) => {
    const newFiles = Array.from(inputFiles)
      .filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    
    // Preview with auto-detected page numbers
    const processed = newFiles.map((f, i) => {
      const detected = extractPageNumber(f.name)
      return {
        file: f,
        name: f.name,
        pageNumber: detected || (i + 1),
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        id: Math.random().toString(36).substr(2, 9),
      }
    })
    setFiles(prev => [...prev, ...processed])
  }

  const updatePageNumber = (id, num) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, pageNumber: parseInt(num) || 0 } : f))
  }

  const removeFile = (id) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id)
      if (f && f.preview) URL.revokeObjectURL(f.preview)
      return prev.filter(x => x.id !== id)
    })
  }

  const startBatchUpload = async () => {
    if (!form.subject_id || files.length === 0) return

    // Check for duplicates first
    const pageNumbers = files.map(f => f.pageNumber)
    const { data: existing } = await supabase.from('pages')
      .select('id, page_number, image_url')
      .eq('subject_id', form.subject_id)
      .eq('school_year', form.school_year)
      .in('page_number', pageNumbers)
    
    let existingFiltered = existing || []
    if (form.section) {
      existingFiltered = existingFiltered.filter(e => true) // already filtered by query
      const { data: existSec } = await supabase.from('pages')
        .select('id, page_number, image_url')
        .eq('subject_id', form.subject_id)
        .eq('school_year', form.school_year)
        .eq('section', form.section)
        .in('page_number', pageNumbers)
      existingFiltered = existSec || []
    } else {
      const { data: existNull } = await supabase.from('pages')
        .select('id, page_number, image_url')
        .eq('subject_id', form.subject_id)
        .eq('school_year', form.school_year)
        .is('section', null)
        .in('page_number', pageNumbers)
      existingFiltered = existNull || []
    }

    if (existingFiltered.length > 0) {
      const dupPages = existingFiltered.map(e => e.page_number).sort((a, b) => a - b).join(', ')
      const action = confirm(`Le pagine ${dupPages} esistono già per questa materia/classe. Vuoi sovrascriverle?\n\nOK = Sovrascrivi\nAnnulla = Salta le pagine duplicate`)
      
      if (action) {
        // Delete existing duplicates (storage + db)
        for (const ex of existingFiltered) {
          const fn = ex.image_url.split('/pages/')[1]
          if (fn) await supabase.storage.from('pages').remove([fn])
          await supabase.from('pages').delete().eq('id', ex.id)
        }
      } else {
        // Remove duplicate files from upload queue
        const dupNums = new Set(existingFiltered.map(e => e.page_number))
        const filtered = files.filter(f => !dupNums.has(f.pageNumber))
        if (filtered.length === 0) {
          setUploadResults({ success: 0, failed: 0, total: 0, skipped: files.length })
          return
        }
        setFiles(filtered)
        // Continue with filtered files
      }
    }

    setUploading(true)
    setUploadResults(null)
    let success = 0, failed = 0
    const filesToUpload = files.filter(f => {
      const dupNums = new Set((existingFiltered || []).map(e => e.page_number))
      return true // all files at this point are OK (dups either overwritten or removed from queue)
    })

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setUploadProgress({ current: i + 1, total: files.length, currentFile: f.name, phase: 'upload' })

      try {
        // 1. Upload image
        const ext = f.file.name.split('.').pop()
        const fileName = `${form.subject_id}_${form.school_year}_${f.pageNumber}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('pages').upload(fileName, f.file)
        if (uploadError) throw uploadError
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/pages/${fileName}`

        // 2. Extract text
        setUploadProgress({ current: i + 1, total: files.length, currentFile: f.name, phase: 'extract' })
        let extractedText = ''
        try { extractedText = await extractTextFromImage(f.file, apiKey) } catch (e) { console.error('Extract failed:', e) }

        // 3. Save to database
        setUploadProgress({ current: i + 1, total: files.length, currentFile: f.name, phase: 'save' })
        await supabase.from('pages').insert({
          subject_id: form.subject_id, school_year: form.school_year,
          section: form.section || null, page_number: f.pageNumber,
          image_url: imageUrl, extracted_text: extractedText,
          book_title: form.book_title.trim() || null,
        })
        success++
      } catch (err) {
        console.error('Upload failed for', f.name, err)
        failed++
      }
    }

    setUploadResults({ success, failed, total: files.length })
    setFiles([])
    setUploading(false)
    loadData()
  }

  const deletePage = async (page) => {
    if (!confirm(`Eliminare pagina ${page.page_number}?`)) return
    const fileName = page.image_url.split('/pages/')[1]
    if (fileName) await supabase.storage.from('pages').remove([fileName])
    await supabase.from('pages').delete().eq('id', page.id); loadData()
  }

  // Bulk edit
  const [bulkEdit, setBulkEdit] = useState(false)
  const [bulkFrom, setBulkFrom] = useState({ subject_id: '', school_year: '', section: '', book_title: '' })
  const [bulkTo, setBulkTo] = useState({ school_year: '', section: '', book_title: '' })
  const [bulkMsg, setBulkMsg] = useState('')

  const executeBulkEdit = async () => {
    if (!bulkFrom.subject_id) return

    const updateData = {}
    if (bulkTo.school_year) updateData.school_year = bulkTo.school_year
    if (bulkTo.section === '__null__') updateData.section = null
    else if (bulkTo.section) updateData.section = bulkTo.section.toUpperCase()
    if (bulkTo.book_title === '__null__') updateData.book_title = null
    else if (bulkTo.book_title) updateData.book_title = bulkTo.book_title

    if (Object.keys(updateData).length === 0) { setBulkMsg('❌ Seleziona almeno un campo da modificare'); return }

    let q = supabase.from('pages').update(updateData).eq('subject_id', bulkFrom.subject_id)
    if (bulkFrom.school_year) q = q.eq('school_year', bulkFrom.school_year)
    if (bulkFrom.section === '__null__') q = q.is('section', null)
    else if (bulkFrom.section) q = q.eq('section', bulkFrom.section)
    if (bulkFrom.book_title) q = q.eq('book_title', bulkFrom.book_title)

    const { error } = await q
    if (error) { setBulkMsg('❌ Errore: ' + error.message) }
    else { setBulkMsg('✅ Pagine aggiornate!'); loadData(); setTimeout(() => setBulkMsg(''), 3000) }
  }

  const filteredPages = filterSubject ? pages.filter(p => p.subject_id === filterSubject) : pages
  const progressPct = uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0
  const phaseLabels = { upload: '📤 Caricamento', extract: '🧠 Estrazione testo', save: '💾 Salvataggio' }

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>📸 Pagine dei libri ({pages.length})</h3>

      {/* Upload form */}
      <div style={{ padding: '1rem', background: COLORS.bgPurple, borderRadius: '14px', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.purple, marginBottom: '0.6rem' }}>Carica pagine</p>

        {/* Subject, year, section */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })}
            style={{ flex: 1, minWidth: '120px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            <option value="">Materia...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={form.school_year} onChange={e => setForm({ ...form, school_year: e.target.value })}
            style={{ width: '70px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }}>
            {['1', '2', '3', '4', '5'].map(y => <option key={y} value={y}>{y}ª</option>)}
          </select>
          <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Sez."
            style={{ width: '55px', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
        </div>

        {/* Book title */}
        <input value={form.book_title} onChange={e => setForm({ ...form, book_title: e.target.value })} placeholder="Titolo del libro (es: Geoamici Vol.2)"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} />

        {/* File drop zone */}
        {!uploading && (
          <div onClick={() => fileRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            onDragOver={e => e.preventDefault()}
            style={{ border: `2px dashed ${COLORS.purpleLight}`, borderRadius: '12px', padding: '1.25rem', textAlign: 'center', cursor: 'pointer', marginBottom: '0.75rem', background: 'white' }}>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purple, fontWeight: 600, margin: '0 0 0.2rem' }}>📷 Tocca o trascina le foto</p>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>Puoi selezionare più pagine contemporaneamente</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />

        {/* File preview list */}
        {files.length > 0 && !uploading && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: COLORS.dark, margin: 0 }}>{files.length} file selezionat{files.length === 1 ? 'o' : 'i'}</p>
              <button onClick={() => setFiles([])} style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.orange, background: 'none', border: 'none', cursor: 'pointer' }}>Rimuovi tutti</button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {files.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'white', borderRadius: '10px', border: `1px solid ${COLORS.grayBorder}` }}>
                  {f.preview ? (
                    <img src={f.preview} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '40px', height: '50px', borderRadius: '6px', background: COLORS.bgPurple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>📄</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.dark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                    <p style={{ fontFamily: FONTS.body, fontSize: '0.65rem', color: COLORS.grayLight, margin: 0 }}>{(f.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.gray }}>Pag.</span>
                    <input type="number" value={f.pageNumber} onChange={e => updatePageNumber(f.id, e.target.value)}
                      style={{ width: '50px', padding: '0.3rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.8rem', textAlign: 'center' }} />
                  </div>
                  <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', opacity: 0.4, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: COLORS.purple, margin: 0 }}>
                {phaseLabels[uploadProgress.phase] || '...'} pagina {uploadProgress.current} di {uploadProgress.total}
              </p>
              <span style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight }}>{Math.round(progressPct)}%</span>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#eee', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.purpleLight})`, borderRadius: '8px', transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {uploadProgress.currentFile}
            </p>
          </div>
        )}

        {/* Upload results */}
        {uploadResults && (
          <div style={{ padding: '0.6rem 0.85rem', borderRadius: '10px', marginBottom: '0.75rem', background: uploadResults.failed > 0 ? COLORS.bgYellow : COLORS.bgGreen, border: `1px solid ${uploadResults.failed > 0 ? 'rgba(253,203,110,0.2)' : 'rgba(0,184,148,0.2)'}` }}>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.82rem', color: uploadResults.failed > 0 ? '#e67e22' : COLORS.green, margin: 0 }}>
              ✅ {uploadResults.success} pagin{uploadResults.success === 1 ? 'a' : 'e'} caricat{uploadResults.success === 1 ? 'a' : 'e'}
              {uploadResults.failed > 0 && ` · ❌ ${uploadResults.failed} fallite`}
            </p>
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && !uploading && (
          <button onClick={startBatchUpload} disabled={!form.subject_id}
            style={{ ...btnSuccess, width: '100%', padding: '0.7rem', fontSize: '0.95rem', opacity: !form.subject_id ? 0.5 : 1 }}>
            ⬆️ Carica {files.length} pagin{files.length === 1 ? 'a' : 'e'}
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterSubject('')} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.75rem', background: !filterSubject ? COLORS.purple : COLORS.grayBorder, color: !filterSubject ? 'white' : COLORS.gray }}>Tutte</button>
        {subjects.map(s => (
          <button key={s.id} onClick={() => setFilterSubject(s.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.75rem', background: filterSubject === s.id ? COLORS.purple : COLORS.grayBorder, color: filterSubject === s.id ? 'white' : COLORS.gray }}>{s.icon} {s.name}</button>
        ))}
        <button onClick={() => setBulkEdit(!bulkEdit)} style={{ marginLeft: 'auto', padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.72rem', background: bulkEdit ? COLORS.orange : COLORS.grayBorder, color: bulkEdit ? 'white' : COLORS.gray }}>
          ✏️ Modifica in blocco
        </button>
      </div>

      {/* Bulk edit panel */}
      {bulkEdit && (
        <div style={{ padding: '0.85rem', background: 'rgba(253,203,110,0.08)', borderRadius: '12px', border: '1px solid rgba(253,203,110,0.2)', marginBottom: '0.75rem' }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: '#e67e22', marginBottom: '0.5rem' }}>Modifica in blocco classe/sezione</p>
          
          <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.gray, marginBottom: '0.3rem' }}>Da (filtro pagine):</p>
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <select value={bulkFrom.subject_id} onChange={e => setBulkFrom({...bulkFrom, subject_id: e.target.value})}
              style={{ flex: 1, minWidth: '100px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Materia...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            <select value={bulkFrom.school_year} onChange={e => setBulkFrom({...bulkFrom, school_year: e.target.value})}
              style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Cl.</option>
              {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y}ª</option>)}
            </select>
            <select value={bulkFrom.section} onChange={e => setBulkFrom({...bulkFrom, section: e.target.value})}
              style={{ width: '80px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Sez...</option>
              <option value="__null__">Nessuna</option>
              {[...new Set(pages.map(p => p.section).filter(Boolean))].sort().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <select value={bulkFrom.book_title} onChange={e => setBulkFrom({...bulkFrom, book_title: e.target.value})}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Titolo libro (tutti)...</option>
              {[...new Set(pages.map(p => p.book_title).filter(Boolean))].sort().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.gray, marginBottom: '0.3rem' }}>A (nuovi valori):</p>
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <select value={bulkTo.school_year} onChange={e => setBulkTo({...bulkTo, school_year: e.target.value})}
              style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Classe (invariata)</option>
              {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y}ª</option>)}
            </select>
            <select value={bulkTo.section} onChange={e => setBulkTo({...bulkTo, section: e.target.value})}
              style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem' }}>
              <option value="">Sezione (invariata)</option>
              <option value="__null__">Nessuna (tutte)</option>
              {['A','B','C','D','E','F','G','H'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <input value={bulkTo.book_title} onChange={e => setBulkTo({...bulkTo, book_title: e.target.value})} placeholder="Nuovo titolo libro (invariato se vuoto)"
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.78rem', boxSizing: 'border-box' }} />
          </div>

          {bulkMsg && <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: bulkMsg.includes('✅') ? COLORS.green : COLORS.orange, marginBottom: '0.4rem' }}>{bulkMsg}</p>}

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button onClick={executeBulkEdit} style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: '#e67e22', color: 'white' }}>✅ Applica modifiche</button>
            <button onClick={() => { setBulkEdit(false); setBulkMsg('') }} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, background: COLORS.grayBorder, color: COLORS.gray }}>Chiudi</button>
          </div>
        </div>
      )}

      {/* Pages grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
        {filteredPages.map(p => (
          <div key={p.id} style={{ width: '90px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.grayBorder}`, background: 'white', position: 'relative' }}>
            <img src={p.image_url} alt={`pag ${p.page_number}`} style={{ width: '100%', height: '110px', objectFit: 'cover' }} onError={e => { e.target.style.background = COLORS.bgPurple }} />
            <div style={{ padding: '0.3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.72rem', color: COLORS.dark, margin: 0 }}>{p.subjects?.icon} Pag. {p.page_number}</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.6rem', color: COLORS.grayLight, margin: 0 }}>{p.school_year}ª{p.section ? ` ${p.section}` : ''}{p.book_title ? ` · ${p.book_title}` : ''}</p>
            </div>
            <button onClick={() => deletePage(p)} style={{ position: 'absolute', top: '3px', right: '3px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>✕</button>
          </div>
        ))}
        {filteredPages.length === 0 && <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, textAlign: 'center', width: '100%', padding: '1.5rem 0' }}>Nessuna pagina caricata.</p>}
      </div>
    </div>
  )
}

/* ─── ADMIN SETTINGS ─── */
function AdminSettings() {
  const [pageDisplay, setPageDisplay] = useState('thumbnails')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'page_display').single().then(({ data }) => {
      if (data) setPageDisplay(data.value)
    })
  }, [])

  const saveDisplay = async (mode) => {
    setSaving(true)
    setPageDisplay(mode)
    await supabase.from('settings').upsert({ key: 'page_display', value: mode })
    setSaving(false)
  }

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>⚙️ Impostazioni</h3>
      
      <div style={{ padding: '0.85rem', background: COLORS.bgPurple, borderRadius: '12px', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.purple, marginBottom: '0.6rem' }}>Visualizzazione pagine nel carosello</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => saveDisplay('thumbnails')}
            style={{
              flex: 1, padding: '0.75rem 0.5rem', borderRadius: '12px', border: pageDisplay === 'thumbnails' ? `2px solid ${COLORS.purple}` : `2px solid ${COLORS.grayBorder}`,
              background: pageDisplay === 'thumbnails' ? COLORS.bgPurple : 'white', cursor: 'pointer', textAlign: 'center',
            }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🖼️</div>
            <p style={{ fontFamily: FONTS.heading, fontSize: '0.8rem', color: pageDisplay === 'thumbnails' ? COLORS.purple : COLORS.dark, margin: 0 }}>Miniature</p>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.65rem', color: COLORS.grayLight, margin: '0.15rem 0 0' }}>Anteprima immagini</p>
          </button>
          <button onClick={() => saveDisplay('numbers')}
            style={{
              flex: 1, padding: '0.75rem 0.5rem', borderRadius: '12px', border: pageDisplay === 'numbers' ? `2px solid ${COLORS.purple}` : `2px solid ${COLORS.grayBorder}`,
              background: pageDisplay === 'numbers' ? COLORS.bgPurple : 'white', cursor: 'pointer', textAlign: 'center',
            }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🔢</div>
            <p style={{ fontFamily: FONTS.heading, fontSize: '0.8rem', color: pageDisplay === 'numbers' ? COLORS.purple : COLORS.dark, margin: 0 }}>Solo numeri</p>
            <p style={{ fontFamily: FONTS.body, fontSize: '0.65rem', color: COLORS.grayLight, margin: '0.15rem 0 0' }}>Quadrati colorati</p>
          </button>
        </div>
        {saving && <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.green, marginTop: '0.4rem' }}>Salvato!</p>}
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
    { id: 'settings', label: '⚙️ Impost.', component: <AdminSettings /> },
  ]
  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>← Torna all'app</button>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, marginBottom: '1rem' }}>⚙️ Pannello Admin</h2>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.72rem', fontWeight: 600, background: tab === t.id ? COLORS.purple : COLORS.grayBorder, color: tab === t.id ? 'white' : COLORS.gray, transition: 'all 0.2s ease' }}>{t.label}</button>))}
      </div>
      {tabs.find(t => t.id === tab)?.component}
    </div>
  )
}
