import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, pressStyle, card } from '../lib/styles'
import Header from './Header'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [childName, setChildName] = useState('')
  const [notifyQuiz, setNotifyQuiz] = useState(false)
  const [notifyWeekly, setNotifyWeekly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o password non corretti')
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!childName.trim()) {
      setError('Inserisci il nome del bambino')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { child_name: childName.trim() }
      }
    })

    if (error) {
      setError(error.message === 'User already registered' 
        ? 'Questa email è già registrata. Prova ad accedere!'
        : error.message)
    } else {
      // Update notification preferences
      if (data?.user) {
        await supabase.from('profiles').update({
          child_name: childName.trim(),
          notify_after_quiz: notifyQuiz,
          notify_weekly: notifyWeekly,
        }).eq('id', data.user.id)
      }
      setSuccess('Registrazione completata! Controlla la tua email per confermare l\'account. Se non la trovi, controlla anche nella cartella spam.')
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Inserisci la tua email prima di resettare la password')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setSuccess('Email di reset inviata! Controlla la posta.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '0 1rem 2rem' }}>
        <div style={card}>
          {/* Mascot */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <svg width="70" height="70" viewBox="0 0 80 80">
              <rect x="10" y="25" width="60" height="50" rx="8" fill={COLORS.purple}/>
              <rect x="14" y="29" width="52" height="42" rx="5" fill={COLORS.purpleLight}/>
              <rect x="18" y="33" width="44" height="34" rx="3" fill="#f0efff"/>
              <circle cx="33" cy="48" r="6" fill="none" stroke="#2d3436" strokeWidth="1.5"/>
              <circle cx="47" cy="48" r="6" fill="none" stroke="#2d3436" strokeWidth="1.5"/>
              <circle cx="34" cy="47" r="2.5" fill="#2d3436"/>
              <circle cx="48" cy="47" r="2.5" fill="#2d3436"/>
              <circle cx="35" cy="46" r="1" fill="white"/>
              <circle cx="49" cy="46" r="1" fill="white"/>
              <line x1="39" y1="48" x2="41" y2="48" stroke="#2d3436" strokeWidth="1"/>
              <path d="M33 56 Q40 62 47 56" fill="none" stroke="#2d3436" strokeWidth="1.5" strokeLinecap="round"/>
              <polygon points="40,10 15,22 40,34 65,22" fill="#2d3436"/>
              <circle cx="40" cy="8" r="4" fill="#fdcb6e"/>
              <path d="M40,10 L58,10 L58,20" fill="none" stroke="#fdcb6e" strokeWidth="1.5"/>
            </svg>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.2rem' }}>
              {mode === 'login' ? 'Bentornato!' : 'Crea il tuo account!'}
            </h2>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.85rem', margin: 0 }}>
              {mode === 'login' ? 'Accedi per continuare' : 'Registrati per iniziare'}
            </p>
          </div>

          {error && (
            <div style={{
              background: COLORS.bgRed, border: `1px solid rgba(255,107,107,0.2)`,
              borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1rem',
              fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.orange,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: COLORS.bgGreen, border: `1px solid rgba(0,184,148,0.2)`,
              borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1rem',
              fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.green,
            }}>{success}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Email */}
            <div>
              <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
                Email del genitore
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="mario.rossi@email.it"
                style={{
                  width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`,
                  borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = COLORS.purple}
                onBlur={e => e.target.style.borderColor = COLORS.grayBorder}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="La tua password"
                style={{
                  width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`,
                  borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = COLORS.purple}
                onBlur={e => e.target.style.borderColor = COLORS.grayBorder}
              />
            </div>

            {/* Child name (only register) */}
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
                    Nome del bambino
                  </label>
                  <input
                    type="text" value={childName} onChange={e => setChildName(e.target.value)}
                    placeholder="Come si chiama?"
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`,
                      borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none',
                      transition: 'border-color 0.2s', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = COLORS.purple}
                    onBlur={e => e.target.style.borderColor = COLORS.grayBorder}
                  />
                </div>

                {/* Notification preferences */}
                <div style={{ padding: '0.75rem', background: COLORS.bgPurple, borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONTS.heading, fontSize: '0.85rem', color: COLORS.purple, marginBottom: '0.6rem' }}>
                    Notifiche email (opzionale)
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
              </>
            )}

            {/* Submit */}
            <button
              onClick={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              {...pressStyle}
              style={{
                ...btnPrimary,
                width: '100%', padding: '0.9rem', fontSize: '1.05rem',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '...' : mode === 'login' ? '🎓 Entra!' : '🚀 Registrati!'}
            </button>

            {/* Toggle mode */}
            <p style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.gray }}>
              {mode === 'login' ? 'Non hai un account? ' : 'Hai già un account? '}
              <span
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null) }}
                style={{ color: COLORS.purple, fontWeight: 700, cursor: 'pointer' }}
              >
                {mode === 'login' ? 'Registrati' : 'Accedi'}
              </span>
            </p>

            {mode === 'login' && (
              <p
                onClick={handleResetPassword}
                style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.grayLight, cursor: 'pointer' }}
              >
                Password dimenticata?
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
