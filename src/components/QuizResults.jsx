import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, btnDanger, pressStyle } from '../lib/styles'

export default function QuizResults({ quiz, answers, userId, onRetryWrong, onHome }) {
  const [saved, setSaved] = useState(false)

  const correctCount = answers.filter(a => a.selected === a.correct).length
  const total = answers.length
  const pct = Math.round((correctCount / total) * 100)

  let grade, gradeColor, gradeEmoji, gradeBg
  if (pct >= 80) { grade = 'Ottimo lavoro!'; gradeColor = COLORS.green; gradeEmoji = '🏆'; gradeBg = `linear-gradient(135deg,rgba(0,184,148,0.08),rgba(85,239,196,0.08))` }
  else if (pct >= 50) { grade = 'Va bene, ma meglio se ripassi!'; gradeColor = COLORS.yellow; gradeEmoji = '📖'; gradeBg = `linear-gradient(135deg,rgba(253,203,110,0.08),rgba(255,234,167,0.08))` }
  else { grade = 'Si può fare di meglio, ripassa!'; gradeColor = COLORS.orange; gradeEmoji = '💪'; gradeBg = `linear-gradient(135deg,rgba(225,112,85,0.08),rgba(255,168,148,0.08))` }

  const wrongQs = answers.filter(a => a.selected !== a.correct).map(a => quiz.questions.find(q => q.id === a.questionId)).filter(Boolean)

  const handleSave = async () => {
    try {
      await supabase.from('quizzes').update({ is_saved: true }).eq('id', quiz.dbId)
      setSaved(true)
    } catch (e) { console.error(e) }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '0.3rem' }}>{gradeEmoji}</div>
      <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 1rem' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#eee" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={gradeColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`} strokeDashoffset="66"
            style={{ transition: 'stroke-dasharray 1.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: '1.8rem', color: gradeColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.grayLight }}>{correctCount}/{total}</div>
        </div>
      </div>

      <div style={{ padding: '1.1rem', borderRadius: '20px', background: gradeBg, border: `2px solid ${gradeColor}33`, marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: gradeColor, margin: '0 0 0.4rem' }}>{grade}</h3>
        <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
          {pct >= 80 ? 'Hai capito benissimo gli argomenti! Continua così! 🌟' : pct >= 50 ? 'Hai capito molte cose, ma alcuni argomenti hanno bisogno di un ripasso. Non mollare!' : 'Non preoccuparti! Rileggi le pagine con calma e riprova. Ogni volta impari qualcosa in più!'}
        </p>
      </div>

      {wrongQs.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: '1.25rem', padding: '0.9rem', borderRadius: '16px', background: 'rgba(225,112,85,0.04)', border: '1px solid rgba(225,112,85,0.12)' }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '0.95rem', color: COLORS.orange, marginBottom: '0.6rem' }}>📝 Da ripassare:</p>
          {wrongQs.map((q, i) => (
            <div key={i} style={{ fontFamily: FONTS.body, fontSize: '0.83rem', color: COLORS.gray, padding: '0.4rem 0', borderBottom: i < wrongQs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', lineHeight: 1.4 }}>
              <span style={{ color: COLORS.orange, fontWeight: 700 }}>•</span> {q.question}<br />
              <span style={{ color: COLORS.green, fontSize: '0.78rem' }}>✓ {q.options[q.correct]}</span>
            </div>
          ))}
        </div>
      )}

      {quiz.dbId && !saved ? (
        <button onClick={handleSave} {...pressStyle}
          style={{ width: '100%', padding: '0.8rem', marginBottom: '0.75rem', background: `linear-gradient(135deg,${COLORS.yellow},#f39c12)`, color: 'white', border: 'none', borderRadius: '14px', fontFamily: FONTS.heading, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(243,156,18,0.25)', transition: 'transform 0.2s ease' }}>
          💾 Salva quiz per rifarlo dopo
        </button>
      ) : saved ? (
        <div style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.green, marginBottom: '0.75rem', padding: '0.6rem', background: COLORS.bgGreen, borderRadius: '10px' }}>
          ✅ Quiz salvato!
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.65rem' }}>
        {wrongQs.length > 0 && (
          <button onClick={() => onRetryWrong(wrongQs)} {...pressStyle}
            style={{ ...btnDanger, flex: 1, padding: '0.85rem', fontSize: '0.9rem' }}>
            🔄 Ripeti sbagliate
          </button>
        )}
        <button onClick={onHome} {...pressStyle}
          style={{ ...btnPrimary, flex: 1, padding: '0.85rem', fontSize: '0.9rem' }}>
          🏠 Menu principale
        </button>
      </div>
    </div>
  )
}
