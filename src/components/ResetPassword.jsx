import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FONTS, btnPrimary, pressStyle, card } from '../lib/styles'
import Header from './Header'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    setError(null)
    
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri')
      return
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      setError('Errore nel cambio password. Riprova!')
    } else {
      setSuccess(true)
      setTimeout(() => {
        onDone()
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header subtitle="Reimposta password" />
      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '0 1rem 2rem' }}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.3rem' }}>
              Nuova password
            </h2>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.85rem', margin: 0 }}>
              Scegli una nuova password per il tuo account
            </p>
          </div>

          {error && (
            <div style={{ background: COLORS.bgRed, border: '1px solid rgba(255,107,107,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1rem', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.orange }}>
              {error}
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontFamily: FONTS.heading, fontSize: '1.1rem', color: COLORS.green, marginBottom: '0.3rem' }}>
                Password cambiata!
              </p>
              <p style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.grayLight }}>
                Stai per essere reindirizzato...
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
                  Nuova password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`,
                    borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = COLORS.purple}
                  onBlur={e => e.target.style.borderColor = COLORS.grayBorder}
                />
              </div>

              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: '0.35rem' }}>
                  Conferma password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${COLORS.grayBorder}`,
                    borderRadius: '12px', fontFamily: FONTS.body, fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = COLORS.purple}
                  onBlur={e => e.target.style.borderColor = COLORS.grayBorder}
                />
              </div>

              <button
                onClick={handleReset}
                disabled={loading}
                {...pressStyle}
                style={{
                  ...btnPrimary, width: '100%', padding: '0.9rem', fontSize: '1.05rem',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '...' : '🔑 Cambia password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
