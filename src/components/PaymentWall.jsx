import { COLORS, FONTS, btnPrimary, pressStyle, card } from '../lib/styles'

export default function PaymentWall({ onBack }) {
  const paypalEmail = import.meta.env.VITE_PAYPAL_EMAIL || ''
  const price = '3.00'

  // PayPal.me link or button
  const paypalLink = paypalEmail 
    ? `https://www.paypal.me/${paypalEmail}/${price}EUR`
    : '#'

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎓</div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.3rem' }}>
        Ti è piaciuto Quizzetto?
      </h2>
      <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.9rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
        Le tue sessioni gratuite sono terminate!<br/>
        Continua a imparare con l'abbonamento.
      </p>

      <div style={{
        padding: '1.25rem',
        borderRadius: '20px',
        background: COLORS.bgPurple,
        border: `2px solid rgba(108,92,231,0.15)`,
        marginBottom: '1.5rem',
      }}>
        <p style={{ fontFamily: FONTS.heading, fontSize: '2rem', color: COLORS.purple, margin: '0 0 0.2rem' }}>
          3€<span style={{ fontSize: '1rem', color: COLORS.gray }}>/mese</span>
        </p>
        <div style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.gray, lineHeight: 1.8 }}>
          ✅ Quiz illimitati su tutte le materie<br/>
          ✅ Modalità sfida a tempo<br/>
          ✅ Salva e ripeti i quiz<br/>
          ✅ Report via email per i genitori<br/>
          ✅ Nuovi contenuti ogni mese
        </div>
      </div>

      <a
        href={paypalLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          width: '100%',
          padding: '0.95rem',
          background: 'linear-gradient(135deg, #0070ba, #00457C)',
          color: 'white',
          border: 'none',
          borderRadius: '14px',
          fontFamily: FONTS.heading,
          fontSize: '1.05rem',
          cursor: 'pointer',
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0,112,186,0.3)',
          marginBottom: '0.75rem',
        }}
      >
        💳 Paga con PayPal
      </a>

      <p style={{ fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.grayLight, marginBottom: '1rem', lineHeight: 1.4 }}>
        Dopo il pagamento, il tuo account verrà attivato.<br/>
        Per assistenza scrivi a {paypalEmail}
      </p>

      <button onClick={onBack} {...pressStyle}
        style={{ ...btnPrimary, width: '100%', padding: '0.8rem', fontSize: '0.9rem', background: COLORS.grayBorder, color: COLORS.gray, boxShadow: 'none' }}>
        ← Torna indietro
      </button>
    </div>
  )
}
