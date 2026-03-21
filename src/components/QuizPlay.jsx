import { useState, useEffect, useRef } from 'react'
import { COLORS, FONTS, btnPrimary, pressStyle, correctPhrases, wrongPhrases } from '../lib/styles'

export default function QuizPlay({ quiz, timerSeconds, onFinish }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState([])
  const [animating, setAnimating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timerSeconds)
  const timerRef = useRef(null)
  const hasTimer = timerSeconds > 0
  const question = quiz.questions[currentQ]
  const progress = ((currentQ + 1) / quiz.questions.length) * 100

  useEffect(() => {
    if (!hasTimer || selected !== null) return
    setTimeLeft(timerSeconds)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [currentQ, hasTimer, timerSeconds, selected])

  useEffect(() => {
    if (hasTimer && timeLeft === 0 && selected === null) handleSelect(-1)
  }, [timeLeft])

  const handleSelect = (optIndex) => {
    if (selected !== null) return
    clearInterval(timerRef.current)
    setSelected(optIndex)
    setShowExplanation(true)
    setAnswers(prev => [...prev, { questionId: question.id, selected: optIndex, correct: question.correct }])
  }

  const handleNext = () => {
    setAnimating(true)
    setTimeout(() => {
      if (currentQ + 1 >= quiz.questions.length) {
        onFinish([...answers])
      } else {
        setCurrentQ(p => p + 1)
        setSelected(null)
        setShowExplanation(false)
        setAnimating(false)
      }
    }, 300)
  }

  const isCorrect = selected === question.correct
  const isTimeout = selected === -1
  const diffColors = { facile: COLORS.green, media: COLORS.yellow, difficile: COLORS.orange }
  const timerColor = timeLeft <= 5 ? COLORS.orange : timeLeft <= 10 ? COLORS.yellow : COLORS.green
  const timerPct = hasTimer ? (timeLeft / timerSeconds) * 100 : 0

  return (
    <div style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateX(-30px)' : 'none', transition: 'all 0.3s ease' }}>
      {/* Progress bar */}
      <div style={{ background: '#eee', borderRadius: '10px', height: '8px', marginBottom: '0.75rem', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg,${COLORS.purple},${COLORS.purpleLight})`, borderRadius: '10px', transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.gray }}>{currentQ + 1} di {quiz.questions.length}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasTimer && selected === null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '50px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${timerPct}%`, height: '100%', background: timerColor, borderRadius: '3px', transition: 'width 1s linear, background 0.3s' }} />
              </div>
              <span style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: timerColor, minWidth: '28px', textAlign: 'right' }}>{timeLeft}s</span>
            </div>
          )}
          <span style={{ fontFamily: FONTS.heading, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', color: 'white', background: diffColors[question.difficulty] || COLORS.purpleLight }}>{question.difficulty}</span>
        </div>
      </div>

      <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.15rem', color: COLORS.dark, marginBottom: '1.1rem', lineHeight: 1.4 }}>{question.question}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {question.options.map((opt, i) => {
          let bg = 'white', border = `2px solid ${COLORS.grayBorder}`, color = COLORS.dark
          if (selected !== null) {
            if (i === question.correct) { bg = `linear-gradient(135deg,${COLORS.green},${COLORS.greenLight})`; border = `2px solid ${COLORS.green}`; color = 'white' }
            else if (i === selected && !isCorrect) { bg = `linear-gradient(135deg,${COLORS.red},${COLORS.orange})`; border = `2px solid ${COLORS.red}`; color = 'white' }
          }
          const labels = ['A', 'B', 'C', 'D']
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={selected !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.8rem 1rem',
                background: bg, border, borderRadius: '14px', cursor: selected !== null ? 'default' : 'pointer',
                textAlign: 'left', fontFamily: FONTS.body, fontSize: '0.93rem', color,
                transition: 'all 0.25s ease', boxShadow: selected === null ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              }}>
              <span style={{
                fontFamily: FONTS.heading, width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0, fontWeight: 600,
                background: selected !== null && (i === question.correct || (i === selected && !isCorrect)) ? 'rgba(255,255,255,0.3)' : '#f0efff',
                color: selected !== null && (i === question.correct || (i === selected && !isCorrect)) ? 'white' : COLORS.purple,
              }}>{labels[i]}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {showExplanation && (
        <div style={{
          marginTop: '1.1rem', padding: '0.9rem 1.1rem', borderRadius: '16px',
          background: isTimeout ? COLORS.bgPurple : isCorrect ? COLORS.bgGreen : COLORS.bgRed,
          border: `2px solid ${isTimeout ? 'rgba(108,92,231,0.15)' : isCorrect ? 'rgba(0,184,148,0.15)' : 'rgba(255,107,107,0.15)'}`,
        }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: '1.05rem', color: isTimeout ? COLORS.purple : isCorrect ? COLORS.green : COLORS.orange, marginBottom: '0.4rem' }}>
            {isTimeout ? '⏰ Tempo scaduto!' : isCorrect ? correctPhrases[Math.floor(Math.random() * correctPhrases.length)] : wrongPhrases[Math.floor(Math.random() * wrongPhrases.length)]}
          </p>
          <p style={{ fontFamily: FONTS.body, fontSize: '0.88rem', color: COLORS.gray, lineHeight: 1.5, margin: 0 }}>💡 {question.explanation}</p>
        </div>
      )}

      {selected !== null && (
        <button onClick={handleNext} {...pressStyle}
          style={{ ...btnPrimary, width: '100%', marginTop: '1.1rem', padding: '0.85rem', fontSize: '1.05rem' }}>
          {currentQ + 1 >= quiz.questions.length ? '📊 Vedi i risultati!' : '➡️ Prossima domanda'}
        </button>
      )}
    </div>
  )
}
