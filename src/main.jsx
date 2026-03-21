import React from 'react'
import ReactDOM from 'react-dom/client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import App from './components/App'
import ResetPassword from './components/ResetPassword'

function Root() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordReset, setIsPasswordReset] = useState(false)

  useEffect(() => {
    // Check if this is a password reset flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    if (type === 'recovery') {
      setIsPasswordReset(true)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true)
      }
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  const handlePasswordResetDone = () => {
    setIsPasswordReset(false)
    // Clean URL hash
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', margin: '0 auto 1rem', borderRadius: '50%', border: '4px solid #eee', borderTopColor: '#6c5ce7', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: "'Fredoka', sans-serif", color: '#6c5ce7', fontSize: '1rem' }}>Caricamento...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  // Show password reset screen
  if (isPasswordReset && session) {
    return <ResetPassword onDone={handlePasswordResetDone} />
  }

  if (!session) return <Auth />
  if (!profile) return <Auth />

  return <App user={session.user} profile={profile} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
