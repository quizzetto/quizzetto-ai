import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateQuizFromText, generateQuizFromImages } from '../lib/ai'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnPink, btnDanger, pressStyle, card } from '../lib/styles'
import Header from './Header'
import QuizPlay from './QuizPlay'
import QuizResults from './QuizResults'
import TimerSetup from './TimerSetup'
import PaymentWall from './PaymentWall'
import AdminPanel from './AdminPanel'

const PHASES = { HOME: 'home', BROWSE: 'browse', PAGES: 'pages', UPLOAD: 'upload', LOADING: 'loading', SETUP: 'setup', QUIZ: 'quiz', RESULTS: 'results', PAYMENT: 'payment', ADMIN: 'admin' }

const loadingMessages = ['📚 Sto leggendo le pagine...', '🧠 Analizzo gli argomenti...', '✏️ Preparo le domande...', '🎯 Quasi pronto!']

export default function App({ user, profile }) {
  const [phase, setPhase] = useState(PHASES.HOME)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [error, setError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [contents, setContents] = useState([])
  const [savedQuizzes, setSavedQuizzes] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedContent, setSelectedContent] = useState(null)
  const [access, setAccess] = useState(null)
  const [dailyLimit, setDailyLimit] = useState(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  // Load initial data
  useEffect(() => {
    loadAccess()
    loadSubjects()
    loadSavedQuizzes()
    loadDailyLimit()
  }, [])

  const loadAccess = async () => {
    const { data } = await supabase.rpc('check_user_access', { p_user_id: user.id })
    setAccess(data)
  }

  const loadDailyLimit = async () => {
    const { data } = await supabase.rpc('check_daily_quiz_limit', { p_user_id: user.id })
    setDailyLimit(data)
  }

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const loadSavedQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').eq('user_id', user.id).eq('is_saved', true).order('created_at', { ascending: false })
    setSavedQuizzes(data || [])
  }

  const loadContents = async (subjectId) => {
    const yearFilter = profile.school_year || '1'
    let query = supabase.from('contents').select('*').eq('subject_id', subjectId).eq('school_year', yearFilter)
    if (profile.section) {
      query = query.or(`section.is.null,section.eq.${profile.section}`)
    }
    const { data } = await query.order('page_start')
    setContents(data || [])
  }

  // Check access before generating
  const checkCanGenerate = async () => {
    await loadAccess()
    await loadDailyLimit()
    const freshAccess = await supabase.rpc('check_user_access', { p_user_id: user.id })
    const freshLimit = await supabase.rpc('check_daily_quiz_limit', { p_user_id: user.id })

    if (freshAccess.data?.needs_payment) {
      setPhase(PHASES.PAYMENT)
      return false
    }
    if (!freshLimit.data?.can_generate) {
      setError(`Hai fatto tanti quiz oggi, complimenti! 🎉 I nuovi quiz tornano domani, ma puoi ancora ripassare quelli salvati! (${freshLimit.data?.max || 10} quiz al giorno)`)
      return false
    }
    return true
  }

  // Generate from content
  const handleGenerateFromContent = async (content) => {
    if (!(await checkCanGenerate())) return
    setPhase(PHASES.LOADING)
    setError(null)
    const msgTimer = setInterval(() => setLoadingMsgIdx(p => (p + 1) % loadingMessages.length), 2500)

    try {
      const pageCount = content.page_end - content.page_start + 1
      const quizData = await generateQuizFromText(content.content_text, content.title, pageCount, apiKey)
      
      // Save to DB
      const { data: saved } = await supabase.from('quizzes').insert({
        user_id: user.id,
        subject_id: content.subject_id,
        content_id: content.id,
        topic: quizData.topic,
        questions: quizData.questions,
        source_type: 'content',
        page_start: content.page_start,
        page_end: content.page_end,
      }).select().single()

      // Increment counters
      await supabase.from('profiles').update({
        daily_quiz_count: (dailyLimit?.max || 10) - (dailyLimit?.remaining || 10) + 1,
        free_sessions_used: (access?.free_sessions_used || 0) + 1,
      }).eq('id', user.id)

      quizData.dbId = saved?.id
      setQuiz(quizData)
      setPhase(PHASES.SETUP)
    } catch (err) {
      console.error(err)
      setError('Ops! Qualcosa è andato storto. Riprova! 📸')
      setPhase(PHASES.HOME)
    }
    clearInterval(msgTimer)
  }

  // Generate from photos
  const handleGenerateFromImages = async (files) => {
    if (!(await checkCanGenerate())) return
    setPhase(PHASES.LOADING)
    setError(null)
    const msgTimer = setInterval(() => setLoadingMsgIdx(p => (p + 1) % loadingMessages.length), 2500)

    try {
      const quizData = await generateQuizFromImages(files, apiKey)
      
      const { data: saved } = await supabase.from('quizzes').insert({
        user_id: user.id,
        topic: quizData.topic,
        questions: quizData.questions,
        source_type: 'photo',
      }).select().single()

      await supabase.from('profiles').update({
        daily_quiz_count: (dailyLimit?.max || 10) - (dailyLimit?.remaining || 10) + 1,
        free_sessions_used: (access?.free_sessions_used || 0) + 1,
      }).eq('id', user.id)

      quizData.dbId = saved?.id
      setQuiz(quizData)
      setPhase(PHASES.SETUP)
    } catch (err) {
      console.error(err)
      setError('Ops! Qualcosa è andato storto. Riprova con foto più chiare! 📸')
      setPhase(PHASES.HOME)
    }
    clearInterval(msgTimer)
  }

  // Load saved quiz
  const handleLoadSaved = (savedQuiz) => {
    setQuiz({ ...savedQuiz, dbId: savedQuiz.id })
    setPhase(PHASES.SETUP)
  }

  // Quiz finished
  const handleFinish = async (ans) => {
    setAnswers(ans)
    const correctCount = ans.filter(a => a.selected === a.correct).length
    
    // Save result
    await supabase.from('quiz_results').insert({
      quiz_id: quiz.dbId,
      user_id: user.id,
      answers: ans,
      correct_count: correctCount,
      total_count: ans.length,
      percentage: Math.round((correctCount / ans.length) * 100),
      timer_mode: timerSeconds > 0 ? `${timerSeconds}s` : 'off',
    })

    setPhase(PHASES.RESULTS)
  }

  const handleRetryWrong = (wrongQs) => {
    setQuiz(prev => ({ ...prev, questions: wrongQs.map((q, i) => ({ ...q, id: i + 1 })) }))
    setAnswers([])
    setPhase(PHASES.QUIZ)
  }

  const goHome = () => {
    setQuiz(null)
    setAnswers([])
    setError(null)
    setSelectedSubject(null)
    setSelectedContent(null)
    loadSavedQuizzes()
    loadDailyLimit()
    loadAccess()
    setPhase(PHASES.HOME)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ─── RENDER PHASES ───

  const renderHome = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, margin: 0 }}>
          Ciao {profile.child_name}! 👋
        </p>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {profile.is_admin && (
            <button onClick={() => setPhase(PHASES.ADMIN)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }} title="Admin">⚙️</button>
          )}
          <button onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }} title="Esci">🚪</button>
        </div>
      </div>

      {/* Daily limit indicator */}
      {dailyLimit && (
        <p style={{ fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.grayLight, marginBottom: '1rem' }}>
          Quiz nuovi disponibili oggi: {dailyLimit.remaining}/{dailyLimit.max}
        </p>
      )}

      {/* Free sessions indicator */}
      {access && !access.has_paid && !access.is_free_access && !access.is_admin && (
        <div style={{ padding: '0.5rem 0.75rem', background: COLORS.bgYellow, borderRadius: '10px', marginBottom: '1rem' }}>
          <p style={{ fontFamily: FONTS.body, fontSize: '0.8rem', color: '#e67e22', margin: 0 }}>
            Sessioni gratuite: {access.max_free_sessions - access.free_sessions_used} di {access.max_free_sessions} rimaste
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: COLORS.bgRed, border: '1px solid rgba(255,107,107,0.15)', borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1rem', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.orange }}>
          {error}
        </div>
      )}

      {/* Main actions */}
      <button onClick={() => setPhase(PHASES.BROWSE)} {...pressStyle}
        style={{ ...btnPrimary, width: '100%', padding: '1rem', fontSize: '1.05rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        📖 Quiz dagli argomenti
      </button>

      <button onClick={() => setPhase(PHASES.UPLOAD)} {...pressStyle}
        style={{ ...btnSuccess, width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        📷 Quiz da foto
      </button>

      {/* Saved quizzes */}
      {savedQuizzes.length > 0 && (
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '0.95rem', color: COLORS.gray, marginBottom: '0.6rem' }}>
            💾 Quiz salvati ({savedQuizzes.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
            {savedQuizzes.map(q => (
              <div key={q.id} onClick={() => handleLoadSaved(q)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: COLORS.bgPurple, borderRadius: '12px', border: '1px solid rgba(108,92,231,0.1)', cursor: 'pointer' }}>
                <span style={{ fontSize: '1.1rem' }}>📖</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: FONTS.heading, fontSize: '0.88rem', color: COLORS.dark, margin: 0 }}>{q.topic}</p>
                  <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>{q.questions?.length || 0} domande</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderBrowse = () => (
    <div>
      <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem' }}>← Indietro</button>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.dark, marginBottom: '0.3rem' }}>Scegli la materia</h3>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginBottom: '1rem' }}>Su cosa ti vuoi mettere alla prova?</p>
      
      {subjects.length === 0 ? (
        <p style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.grayLight, textAlign: 'center', padding: '2rem 0' }}>
          Nessuna materia disponibile ancora. {profile.is_admin ? 'Vai nel pannello admin per aggiungerne!' : 'Chiedi al tuo insegnante di aggiungere i contenuti!'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {subjects.map(s => (
            <button key={s.id} onClick={() => { setSelectedSubject(s); loadContents(s.id); setPhase(PHASES.PAGES) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem',
                background: 'white', border: `2px solid ${COLORS.grayBorder}`, borderRadius: '14px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
              }}>
              <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
              <span style={{ fontFamily: FONTS.heading, fontSize: '1.05rem', color: COLORS.dark }}>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const renderPages = () => (
    <div>
      <button onClick={() => setPhase(PHASES.BROWSE)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem' }}>← Indietro</button>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.dark, marginBottom: '0.3rem' }}>
        {selectedSubject?.icon} {selectedSubject?.name}
      </h3>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginBottom: '1rem' }}>
        Su quali pagine ti vuoi mettere alla prova?
      </p>

      {contents.length === 0 ? (
        <p style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.grayLight, textAlign: 'center', padding: '2rem 0' }}>
          Nessun contenuto disponibile per questa materia.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {contents.map(c => (
            <button key={c.id} onClick={() => handleGenerateFromContent(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                background: 'white', border: `2px solid ${COLORS.grayBorder}`, borderRadius: '14px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
              }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: COLORS.bgPurple,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONTS.heading, fontSize: '0.75rem', color: COLORS.purple,
              }}>
                p.{c.page_start}{c.page_end > c.page_start ? `-${c.page_end}` : ''}
              </div>
              <div>
                <p style={{ fontFamily: FONTS.heading, fontSize: '0.95rem', color: COLORS.dark, margin: 0 }}>{c.title}</p>
                <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight, margin: 0 }}>
                  {c.page_end - c.page_start + 1} pagin{c.page_end > c.page_start ? 'e' : 'a'} · {10 + Math.max(0, (c.page_end - c.page_start) * 5)} domande
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const renderUpload = () => {
    const [images, setImages] = useState([])
    const fileRef = useRef(null)
    const camRef = useRef(null)

    const handleFiles = (files) => {
      const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).map(f => ({ file: f, preview: URL.createObjectURL(f), id: Math.random().toString(36).substr(2, 9) }))
      setImages(prev => [...prev, ...newImgs])
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>← Indietro</button>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📸</div>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.3rem' }}>Fotografa il tuo libro!</h2>
        <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.85rem', margin: '0 0 1.25rem' }}>Scatta una foto delle pagine da studiare</p>

        <div onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: `3px dashed ${COLORS.purpleLight}`, borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem', background: COLORS.bgPurple, cursor: 'pointer' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>📄</div>
          <p style={{ fontFamily: FONTS.body, color: COLORS.purple, fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>Tocca per caricare</p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem' }}>
          <button onClick={() => camRef.current?.click()} {...pressStyle}
            style={{ ...btnPrimary, flex: 1, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>📷 Scatta</button>
          <button onClick={() => fileRef.current?.click()} {...pressStyle}
            style={{ ...btnSuccess, flex: 1, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>🖼️ Galleria</button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

        {images.length > 0 && (
          <>
            <p style={{ fontFamily: FONTS.heading, color: COLORS.dark, marginBottom: '0.6rem', fontSize: '0.95rem' }}>
              {images.length} pagin{images.length === 1 ? 'a' : 'e'} · {10 + Math.max(0, (images.length - 1) * 5)} domande
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
              {images.map(img => (
                <div key={img.id} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${COLORS.grayBorder}` }}>
                  <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => handleGenerateFromImages(images.map(i => i.file))} {...pressStyle}
              style={{ ...btnPink, width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}>🚀 Crea il Quiz!</button>
          </>
        )}
      </div>
    )
  }

  const renderLoading = () => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '70px', height: '70px', margin: '0 auto 1.5rem', borderRadius: '50%', border: '5px solid #eee', borderTopColor: COLORS.purple, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.purple }}>{loadingMessages[loadingMsgIdx]}</p>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginTop: '0.4rem' }}>Ci vuole qualche secondo...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      {quiz && ![PHASES.HOME, PHASES.BROWSE, PHASES.PAGES, PHASES.UPLOAD, PHASES.LOADING, PHASES.PAYMENT, PHASES.ADMIN].includes(phase) && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{ fontFamily: FONTS.heading, background: 'white', padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', color: COLORS.purple, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(108,92,231,0.12)' }}>📖 {quiz.topic}</span>
        </div>
      )}

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 1rem 2rem' }}>
        <div style={card}>
          {phase === PHASES.HOME && renderHome()}
          {phase === PHASES.BROWSE && renderBrowse()}
          {phase === PHASES.PAGES && renderPages()}
          {phase === PHASES.UPLOAD && renderUpload()}
          {phase === PHASES.LOADING && renderLoading()}
          {phase === PHASES.SETUP && quiz && <TimerSetup quiz={quiz} onStart={s => { setTimerSeconds(s); setAnswers([]); setPhase(PHASES.QUIZ) }} />}
          {phase === PHASES.QUIZ && quiz && <QuizPlay quiz={quiz} timerSeconds={timerSeconds} onFinish={handleFinish} />}
          {phase === PHASES.RESULTS && quiz && <QuizResults quiz={quiz} answers={answers} userId={user.id} onRetryWrong={handleRetryWrong} onHome={goHome} />}
          {phase === PHASES.PAYMENT && <PaymentWall onBack={goHome} />}
          {phase === PHASES.ADMIN && <AdminPanel onBack={goHome} />}
        </div>
        <p style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight, marginTop: '1.5rem' }}>Quizzetto AI ✨</p>
      </div>
    </div>
  )
}
