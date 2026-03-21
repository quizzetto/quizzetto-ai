import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnDanger, btnPink, pressStyle, card } from '../lib/styles'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

async function extractTextFromImages(files, apiKey) {
  const imageContents = await Promise.all(
    files.map(async (file) => {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = () => reject(new Error('Errore lettura'))
        reader.readAsDataURL(file)
      })
      return {
        type: 'image',
        source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 }
      }
    })
  )

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
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `Estrai TUTTO il testo presente in queste immagini di pagine di un libro scolastico. 
Trascrivi il contenuto fedelmente, mantenendo la struttura (titoli, paragrafi, elenchi).
NON aggiungere commenti o interpretazioni, solo il testo presente nelle immagini.
Se ci sono immagini o grafici, descrivi brevemente cosa rappresentano tra parentesi quadre.
Rispondi SOLO con il testo estratto.`
          }
        ]
      }]
    })
  })

  const data = await response.json()
  return data.content.filter(i => i.type === 'text').map(i => i.text).join('')
}

async function extractTextFromPDF(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Errore lettura'))
    reader.readAsDataURL(file)
  })

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
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: `Estrai TUTTO il testo presente in questo PDF di pagine di un libro scolastico.
Trascrivi il contenuto fedelmente, mantenendo la struttura (titoli, paragrafi, elenchi).
NON aggiungere commenti o interpretazioni, solo il testo presente nel documento.
Se ci sono immagini o grafici, descrivi brevemente cosa rappresentano tra parentesi quadre.
Rispondi SOLO con il testo estratto.`
          }
        ]
      }]
    })
  })

  const data = await response.json()
  return data.content.filter(i => i.type === 'text').map(i => i.text).join('')
}

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
  const [uploadMode, setUploadMode] = useState('text')
  const [uploadFiles, setUploadFiles] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState('')
  const fileRef = useRef(null)
  const pdfRef = useRef(null)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: subs } = await supabase.from('subjects').select('*').order('name')
    const { data: conts } = await supabase.from('contents').select('*, subjects(name, icon)').order('school_year').order('title')
    setSubjects(subs || [])
    setContents(conts || [])
  }

  const handleImageFiles = (files) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    setUploadFiles(prev => [...prev, ...newFiles])
  }

  const handlePDFFile = (files) => {
    const pdf = Array.from(files).find(f => f.type === 'application/pdf')
    if (pdf) setUploadFiles([pdf])
  }

  const extractText = async () => {
    if (uploadFiles.length === 0) return
    setExtracting(true)
    setExtractMsg('🧠 Sto leggendo le pagine con l\'AI...')

    try {
      let text = ''
      if (uploadFiles[0].type === 'application/pdf') {
        setExtractMsg('📄 Analizzo il PDF...')
        text = await extractTextFromPDF(uploadFiles[0], apiKey)
      } else {
        setExtractMsg(`📸 Analizzo ${uploadFiles.length} foto...`)
        text = await extractTextFromImages(uploadFiles, apiKey)
      }
      setForm(prev => ({ ...prev, content_text: text }))
      setExtractMsg('✅ Testo estratto! Controlla e salva.')
    } catch (err) {
      console.error(err)
      setExtractMsg('❌ Errore nell\'estrazione. Riprova!')
    }
    setExtracting(false)
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
    setUploadFiles([])
    setExtractMsg('')
    setUploadMode('text')
    loadData()
  }

  const deleteContent = async (id) => {
    if (!confirm('Eliminare questo contenuto?')) return
    await supabase.from('contents').delete().eq('id', id)
    loadData()
  }

  const removeFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadModes = [
    { id: 'text', label: '✏️ Testo' },
    { id: 'photo', label: '📷 Foto' },
    { id: 'pdf', label: '📄 PDF' },
  ]

  return (
    <div>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, marginBottom: '0.75rem' }}>
        📄 Contenuti dei libri
      </h3>

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

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <input type="number" value={form.page_start} onChange={e => setForm({...form, page_start: e.target.value})} placeholder="Da pag."
            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
          <input type="number" value={form.page_end} onChange={e => setForm({...form, page_end: e.target.value})} placeholder="A pag."
            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem' }} />
        </div>

        {/* Upload mode selector */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {uploadModes.map(m => (
            <button key={m.id} onClick={() => { setUploadMode(m.id); setUploadFiles([]); setExtractMsg('') }}
              style={{
                flex: 1, padding: '0.45rem 0.3rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontFamily: FONTS.body, fontSize: '0.75rem', fontWeight: 600,
                background: uploadMode === m.id ? COLORS.purple : 'white',
                color: uploadMode === m.id ? 'white' : COLORS.gray,
                transition: 'all 0.2s ease',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* TEXT MODE */}
        {uploadMode === 'text' && (
          <textarea value={form.content_text} onChange={e => setForm({...form, content_text: e.target.value})}
            placeholder="Incolla qui il testo del libro per queste pagine..."
            rows={5}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }} />
        )}

        {/* PHOTO MODE */}
        {uploadMode === 'photo' && (
          <div>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${COLORS.purpleLight}`, borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer', marginBottom: '0.5rem', background: 'white' }}>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.purple, fontWeight: 600, margin: '0 0 0.2rem' }}>📷 Tocca per caricare foto</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>Fotografa le pagine del libro</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => handleImageFiles(e.target.files)} />

            {uploadFiles.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.dark, marginBottom: '0.4rem' }}>
                  {uploadFiles.length} foto caricat{uploadFiles.length === 1 ? 'a' : 'e'}
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {uploadFiles.map((f, i) => (
                    <div key={i} style={{ position: 'relative', width: '55px', height: '55px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${COLORS.grayBorder}` }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeFile(i)}
                        style={{ position: 'absolute', top: '2px', right: '2px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={extractText} disabled={extracting}
                  style={{ ...btnPink, width: '100%', padding: '0.5rem', fontSize: '0.85rem', opacity: extracting ? 0.7 : 1 }}>
                  {extracting ? extractMsg : '🧠 Estrai testo dalle foto'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PDF MODE */}
        {uploadMode === 'pdf' && (
          <div>
            <div onClick={() => pdfRef.current?.click()}
              style={{ border: `2px dashed ${COLORS.purpleLight}`, borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer', marginBottom: '0.5rem', background: 'white' }}>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.purple, fontWeight: 600, margin: '0 0 0.2rem' }}>📄 Tocca per caricare PDF</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>Carica il PDF delle pagine</p>
            </div>
            <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: 'none' }}
              onChange={e => handlePDFFile(e.target.files)} />

            {uploadFiles.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '10px', border: `1px solid ${COLORS.grayBorder}`, marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.dark, margin: 0 }}>{uploadFiles[0].name}</p>
                    <p style={{ fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight, margin: 0 }}>{(uploadFiles[0].size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => setUploadFiles([])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.4 }}>✕</button>
                </div>
                <button onClick={extractText} disabled={extracting}
                  style={{ ...btnPink, width: '100%', padding: '0.5rem', fontSize: '0.85rem', opacity: extracting ? 0.7 : 1 }}>
                  {extracting ? extractMsg : '🧠 Estrai testo dal PDF'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Extracted text / status message */}
        {extractMsg && !extracting && (
          <p style={{ fontFamily: FONTS.body, fontSize: '0.78rem', color: extractMsg.includes('✅') ? COLORS.green : extractMsg.includes('❌') ? COLORS.orange : COLORS.purple, margin: '0.4rem 0' }}>
            {extractMsg}
          </p>
        )}

        {form.content_text && (uploadMode === 'photo' || uploadMode === 'pdf') && (
          <textarea value={form.content_text} onChange={e => setForm({...form, content_text: e.target.value})}
            placeholder="Testo estratto..."
            rows={4}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${COLORS.grayBorder}`, fontFamily: FONTS.body, fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', marginTop: '0.4rem' }} />
        )}

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
