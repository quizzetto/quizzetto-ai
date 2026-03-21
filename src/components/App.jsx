import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateQuizFromText, generateQuizFromImages, pickRandomQuestions } from '../lib/ai'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnPink, btnDanger, pressStyle, card } from '../lib/styles'
import Header from './Header'
import QuizPlay from './QuizPlay'
import QuizResults from './QuizResults'
import TimerSetup from './TimerSetup'
import PaymentWall from './PaymentWall'
import AdminPanel from './AdminPanel'
import PhotoUpload from './PhotoUpload'

const PHASES = { HOME: 'home', BROWSE: 'browse', PAGES: 'pages', UPLOAD: 'upload', LOADING: 'loading', SETUP: 'setup', QUIZ: 'quiz', RESULTS: 'results', PAYMENT: 'payment', ADMIN: 'admin' }
const loadingMessages = ['📚 Sto leggendo le pagine...', '🧠 Analizzo gli argomenti...', '✏️ Preparo le domande...', '🎯 Quasi pronto!']

export default function App({ user, profile }) {
  const [phase, setPhase] = useState(PHASES.HOME)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [error, setError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [availablePages, setAvailablePages] = useState([])
  const [selectedPages, setSelectedPages] = useState([])
  const [savedQuizzes, setSavedQuizzes] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [access, setAccess] = useState(null)
  const [dailyLimit, setDailyLimit] = useState(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  useEffect(() => {
    loadAccess(); loadSubjects(); loadSavedQuizzes(); loadDailyLimit(); checkPaymentExpiry()
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

  const checkPaymentExpiry = async () => {
    const { data: p } = await supabase.from('profiles').select('has_paid, paid_until').eq('id', user.id).single()
    if (p && p.has_paid && p.paid_until && new Date(p.paid_until) < new Date()) {
      await supabase.from('profiles').update({ has_paid: false, paid_until: null }).eq('id', user.id)
      loadAccess()
    }
  }

  const loadPages = async (subjectId) => {
    const yearFilter = profile.school_year || '1'
    let query = supabase.from('pages').select('*, subjects(name, icon)').eq('subject_id', subjectId).eq('school_year', yearFilter)
    if (profile.section) {
      query = query.or(`section.is.null,section.eq.${profile.section}`)
    }
    const { data } = await query.order('page_number')
    setAvailablePages(data || [])
  }

  const togglePageSelection = (page) => {
    setSelectedPages(prev => {
      const exists = prev.find(p => p.id === page.id)
      if (exists) return prev.filter(p => p.id !== page.id)
      return [...prev, page].sort((a, b) => a.page_number - b.page_number)
    })
  }

  const checkCanGenerate = async () => {
    await checkPaymentExpiry()
    const freshAccess = await supabase.rpc('check_user_access', { p_user_id: user.id })
    const freshLimit = await supabase.rpc('check_daily_quiz_limit', { p_user_id: user.id })
    setAccess(freshAccess.data); setDailyLimit(freshLimit.data)

    if (freshAccess.data?.needs_payment) { setPhase(PHASES.PAYMENT); return false }
    if (!freshLimit.data?.can_generate) {
      setError(`Hai fatto tanti quiz oggi, complimenti! 🎉 I nuovi quiz tornano domani, ma puoi ancora ripassare quelli salvati! (${freshLimit.data?.max || 10} quiz al giorno)`)
      return false
    }
    return true
  }

  const handleGenerateFromPages = async () => {
    if (selectedPages.length === 0) return
    if (!(await checkCanGenerate())) return
    setPhase(PHASES.LOADING); setError(null)
    const msgTimer = setInterval(() => setLoadingMsgIdx(p => (p + 1) % loadingMessages.length), 2500)

    try {
      const combinedText = selectedPages.map(p => `--- Pagina ${p.page_number} ---\n${p.extracted_text || ''}`).join('\n\n')
      const topic = `${selectedSubject?.name} - pag. ${selectedPages.map(p => p.page_number).join(', ')}`
      const quizData = await generateQuizFromText(combinedText, topic, selectedPages.length, apiKey)

      const { data: saved } = await supabase.from('quizzes').insert({
        user_id: user.id, subject_id: selectedSubject?.id, topic: quizData.topic,
        questions: quizData.questions, source_type: 'pages',
        page_start: selectedPages[0].page_number, page_end: selectedPages[selectedPages.length - 1].page_number,
      }).select().single()

      await supabase.from('profiles').update({
        daily_quiz_count: (dailyLimit?.max || 10) - (dailyLimit?.remaining || 10) + 1,
        free_sessions_used: (access?.free_sessions_used || 0) + 1,
      }).eq('id', user.id)

      quizData.dbId = saved?.id
      quizData.allQuestions = quizData.questions
      quizData.questions = pickRandomQuestions(quizData.questions, 10)
      setQuiz(quizData); setPhase(PHASES.SETUP)
    } catch (err) {
      console.error(err); setError('Ops! Qualcosa è andato storto. Riprova!'); setPhase(PHASES.HOME)
    }
    clearInterval(msgTimer)
  }

  const handleGenerateFromImages = async (files) => {
    if (!(await checkCanGenerate())) return
    setPhase(PHASES.LOADING); setError(null)
    const msgTimer = setInterval(() => setLoadingMsgIdx(p => (p + 1) % loadingMessages.length), 2500)

    try {
      const quizData = await generateQuizFromImages(files, apiKey)
      const { data: saved } = await supabase.from('quizzes').insert({
        user_id: user.id, topic: quizData.topic, questions: quizData.questions, source_type: 'photo',
      }).select().single()

      await supabase.from('profiles').update({
        daily_quiz_count: (dailyLimit?.max || 10) - (dailyLimit?.remaining || 10) + 1,
        free_sessions_used: (access?.free_sessions_used || 0) + 1,
      }).eq('id', user.id)

      quizData.dbId = saved?.id
      quizData.allQuestions = quizData.questions
      quizData.questions = pickRandomQuestions(quizData.questions, 10)
      setQuiz(quizData); setPhase(PHASES.SETUP)
    } catch (err) {
      console.error(err); setError('Ops! Qualcosa è andato storto. Riprova con foto più chiare! 📸'); setPhase(PHASES.HOME)
    }
    clearInterval(msgTimer)
  }

  const handleLoadSaved = (savedQuiz) => {
    const randomQuestions = pickRandomQuestions(savedQuiz.questions, 10)
    setQuiz({ ...savedQuiz, dbId: savedQuiz.id, allQuestions: savedQuiz.questions, questions: randomQuestions })
    setPhase(PHASES.SETUP)
  }

  const handleFinish = async (ans) => {
    setAnswers(ans)
    const correctCount = ans.filter(a => a.selected === a.correct).length
    await supabase.from('quiz_results').insert({
      quiz_id: quiz.dbId, user_id: user.id, answers: ans, correct_count: correctCount,
      total_count: ans.length, percentage: Math.round((correctCount / ans.length) * 100),
      timer_mode: timerSeconds > 0 ? `${timerSeconds}s` : 'off',
    })
    setPhase(PHASES.RESULTS)
  }

  const handleRetryWrong = (wrongQs) => {
    setQuiz(prev => ({ ...prev, questions: wrongQs.map((q, i) => ({ ...q, id: i + 1 })) }))
    setAnswers([]); setPhase(PHASES.QUIZ)
  }

  const goHome = () => {
    setQuiz(null); setAnswers([]); setError(null); setSelectedSubject(null); setSelectedPages([]); setAvailablePages([])
    loadSavedQuizzes(); loadDailyLimit(); loadAccess(); setPhase(PHASES.HOME)
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

  // ─── RENDER HOME ───
  const renderHome = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.dark, margin: 0 }}>Ciao {profile.child_name}! 👋</p>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {profile.is_admin && <button onClick={() => setPhase(PHASES.ADMIN)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }}>⚙️</button>}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }}>🚪</button>
        </div>
      </div>

      {dailyLimit && <p style={{ fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.grayLight, marginBottom: '1rem' }}>Quiz nuovi oggi: {dailyLimit.remaining}/{dailyLimit.max}</p>}

      {access && !access.has_paid && !access.is_free_access && !access.is_admin && (
        <div style={{ padding: '0.5rem 0.75rem', background: COLORS.bgYellow, borderRadius: '10px', marginBottom: '1rem' }}>
          <p style={{ fontFamily: FONTS.body, fontSize: '0.8rem', color: '#e67e22', margin: 0 }}>Sessioni gratuite: {access.max_free_sessions - access.free_sessions_used} di {access.max_free_sessions} rimaste</p>
        </div>
      )}

      {error && <div style={{ background: COLORS.bgRed, border: '1px solid rgba(255,107,107,0.15)', borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1rem', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.orange }}>{error}</div>}

      <button onClick={() => setPhase(PHASES.BROWSE)} {...pressStyle}
        style={{ ...btnPrimary, width: '100%', padding: '1rem', fontSize: '1.05rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        📖 Quiz dalle pagine del libro
      </button>

      <button onClick={() => setPhase(PHASES.UPLOAD)} {...pressStyle}
        style={{ ...btnSuccess, width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        📷 Quiz da foto
      </button>

      {savedQuizzes.length > 0 && (
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '0.95rem', color: COLORS.gray, marginBottom: '0.6rem' }}>💾 Quiz salvati ({savedQuizzes.length})</p>
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

  // ─── RENDER BROWSE ───
  const renderBrowse = () => (
    <div>
      <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem' }}>← Indietro</button>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.dark, marginBottom: '0.3rem' }}>Scegli la materia</h3>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginBottom: '1rem' }}>Su cosa ti vuoi mettere alla prova?</p>
      {subjects.length === 0 ? (
        <p style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.grayLight, textAlign: 'center', padding: '2rem 0' }}>Nessuna materia disponibile.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {subjects.map(s => (
            <button key={s.id} onClick={() => { setSelectedSubject(s); loadPages(s.id); setSelectedPages([]); setPhase(PHASES.PAGES) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', background: 'white', border: `2px solid ${COLORS.grayBorder}`, borderRadius: '14px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
              <span style={{ fontFamily: FONTS.heading, fontSize: '1.05rem', color: COLORS.dark }}>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ─── RENDER PAGE CAROUSEL ───
  const renderPageCarousel = () => (
    <div>
      <button onClick={() => setPhase(PHASES.BROWSE)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem' }}>← Indietro</button>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.dark, marginBottom: '0.3rem' }}>{selectedSubject?.icon} {selectedSubject?.name}</h3>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginBottom: '1rem' }}>Su quali pagine ti vuoi mettere alla prova?</p>

      {availablePages.length === 0 ? (
        <p style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.grayLight, textAlign: 'center', padding: '2rem 0' }}>Nessuna pagina disponibile.</p>
      ) : (
        <>
          {selectedPages.length > 0 && (
            <div style={{ padding: '0.6rem 0.85rem', background: COLORS.bgPurple, borderRadius: '12px', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: FONTS.heading, fontSize: '0.9rem', color: COLORS.purple, margin: 0 }}>{selectedPages.length} pagin{selectedPages.length === 1 ? 'a' : 'e'} selezionat{selectedPages.length === 1 ? 'a' : 'e'}</p>
                <p style={{ fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.grayLight, margin: 0 }}>{10 + Math.max(0, (selectedPages.length - 1) * 5)} domande</p>
              </div>
              <button onClick={() => setSelectedPages([])} style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.orange, background: 'none', border: 'none', cursor: 'pointer' }}>Deseleziona</button>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center', marginBottom: '1.25rem', maxHeight: '380px', overflowY: 'auto', padding: '0.25rem' }}>
            {availablePages.map(p => {
              const isSelected = selectedPages.find(sp => sp.id === p.id)
              return (
                <div key={p.id} onClick={() => togglePageSelection(p)}
                  style={{
                    width: '100px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                    border: isSelected ? `3px solid ${COLORS.purple}` : `2px solid ${COLORS.grayBorder}`,
                    background: 'white', transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 15px rgba(108,92,231,0.25)' : '0 2px 6px rgba(0,0,0,0.05)',
                  }}>
                  <div style={{ position: 'relative' }}>
                    <img src={p.image_url} alt={`pag ${p.page_number}`} style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.background = COLORS.bgPurple }} />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px', borderRadius: '50%', background: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>✓</div>
                    )}
                  </div>
                  <div style={{ padding: '0.35rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: FONTS.heading, fontSize: '0.82rem', color: isSelected ? COLORS.purple : COLORS.dark, margin: 0 }}>Pag. {p.page_number}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedPages.length > 0 && (
            <button onClick={handleGenerateFromPages} {...pressStyle}
              style={{ ...btnPink, width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
              🚀 Crea il Quiz! ({selectedPages.length} pagin{selectedPages.length === 1 ? 'a' : 'e'})
            </button>
          )}
        </>
      )}
    </div>
  )

  // ─── RENDER LOADING ───
  const renderLoading = () => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '70px', height: '70px', margin: '0 auto 1.5rem', borderRadius: '50%', border: '5px solid #eee', borderTopColor: COLORS.purple, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: FONTS.heading, fontSize: '1.2rem', color: COLORS.purple }}>{loadingMessages[loadingMsgIdx]}</p>
      <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight, marginTop: '0.4rem' }}>Ci vuole qualche secondo...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ─── MAIN RENDER ───
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
          {phase === PHASES.PAGES && renderPageCarousel()}
          {phase === PHASES.UPLOAD && <PhotoUpload onGenerate={handleGenerateFromImages} onBack={goHome} />}
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
