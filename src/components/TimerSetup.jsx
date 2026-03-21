import { useState } from 'react'
import { COLORS, FONTS, btnPink, pressStyle } from '../lib/styles'

export default function TimerSetup({ quiz, onStart }) {
  const [timerMode, setTimerMode] = useState('off')
  const timerOptions = [
    { value: 'off', label: 'Senza tempo', emoji: '😌', desc: 'Rispondi con calma' },
    { value: '30', label: '30 secondi', emoji: '⏱️', desc: 'Un po\' di fretta!' },
    { value: '20', label: '20 secondi', emoji: '🔥', desc: 'Sfida veloce!' },
    { value: '10', label: '10 secondi', emoji: '⚡', desc: 'Modalità fulmine!' },
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎮</div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.4rem', color: COLORS.dark, margin: '0 0 0.2rem' }}>Quiz pronto!</h2>
      <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.9rem', margin: '0 0 0.3rem' }}>📖 {quiz.topic}</p>
      <p style={{ fontFamily: FONTS.body, color: COLORS.grayLight, fontSize: '0.8rem', margin: '0 0 1.5rem' }}>{quiz.questions.length} domande</p>
      <p style={{ fontFamily: FONTS.heading, fontSize: '1.05rem', color: COLORS.dark, marginBottom: '0.75rem' }}>Vuoi una sfida a tempo?</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {timerOptions.map(opt => (
          <button key={opt.value} onClick={() => setTimerMode(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem',
              border: timerMode === opt.value ? `2px solid ${COLORS.purple}` : '2px solid #eee',
              borderRadius: '14px', background: timerMode === opt.value ? COLORS.bgPurple : 'white',
              cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left',
            }}>
            <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
            <div>
              <p style={{ fontFamily: FONTS.heading, fontSize: '0.95rem', color: timerMode === opt.value ? COLORS.purple : COLORS.dark, margin: 0 }}>{opt.label}</p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.grayLight, margin: 0 }}>{opt.desc}</p>
            </div>
            {timerMode === opt.value && <span style={{ marginLeft: 'auto', color: COLORS.purple, fontSize: '1.2rem' }}>✓</span>}
          </button>
        ))}
      </div>

      <button onClick={() => onStart(timerMode === 'off' ? 0 : parseInt(timerMode))} {...pressStyle}
        style={{ ...btnPink, width: '100%', padding: '1rem', fontSize: '1.15rem' }}>
        🚀 Inizia!
      </button>
    </div>
  )
}
