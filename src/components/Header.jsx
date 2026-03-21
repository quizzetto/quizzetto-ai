import { FONTS } from '../lib/styles'

export default function Header({ subtitle }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#6c5ce7,#a29bfe,#fd79a8)',
      padding: '1.2rem 1rem 1rem',
      textAlign: 'center',
      borderRadius: '0 0 28px 28px',
      boxShadow: '0 4px 20px rgba(108,92,231,0.25)',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <svg width="44" height="44" viewBox="0 0 80 80">
          <rect x="10" y="25" width="60" height="50" rx="8" fill="rgba(255,255,255,0.3)"/>
          <rect x="14" y="29" width="52" height="42" rx="5" fill="rgba(255,255,255,0.5)"/>
          <rect x="18" y="33" width="44" height="34" rx="3" fill="rgba(255,255,255,0.9)"/>
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
        <h1 style={{
          fontFamily: FONTS.heading,
          fontSize: '1.5rem',
          color: 'white',
          margin: 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          Quizzetto AI
        </h1>
      </div>
      <p style={{
        fontFamily: FONTS.body,
        color: 'rgba(255,255,255,0.9)',
        fontSize: '0.78rem',
        margin: '0.2rem 0 0',
      }}>
        {subtitle || 'Hai studiato davvero tutto? Scopriamolo insieme!'}
      </p>
    </div>
  )
}
