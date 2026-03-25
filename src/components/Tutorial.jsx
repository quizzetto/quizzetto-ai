import { useState } from 'react'
import { COLORS, FONTS, btnPrimary, btnPink, pressStyle } from '../lib/styles'

const tutorialSteps = [
  {
    emoji: '👋',
    title: 'Benvenuto su Quizzetto AI!',
    description: 'Quizzetto ti aiuta a verificare quello che hai studiato con quiz divertenti e intelligenti!',
    target: 'tutti',
  },
  {
    emoji: '📖',
    title: 'Scegli la materia',
    description: 'Dalla home tocca "Quiz dalle pagine del libro" e scegli la materia su cui vuoi metterti alla prova: Storia, Geografia, Scienze e tante altre!',
    target: 'bambino',
  },
  {
    emoji: '📗',
    title: 'Scegli il libro',
    description: 'Se per la tua materia ci sono più libri diversi (ad esempio per sezioni diverse), potrai scegliere quale libro usare.',
    target: 'bambino',
  },
  {
    emoji: '📸',
    title: 'Seleziona le pagine',
    description: 'Vedrai le pagine del tuo libro. Tocca quelle che hai studiato per selezionarle — puoi sceglierne fino a 5 per ogni quiz!',
    target: 'bambino',
  },
  {
    emoji: '🚀',
    title: 'Crea il Quiz!',
    description: 'Tocca il pulsante "Crea il Quiz" e Quizzetto preparerà delle domande proprio sugli argomenti che hai studiato. Più pagine scegli, più domande avrai!',
    target: 'bambino',
  },
  {
    emoji: '⏱️',
    title: 'Scegli la modalità',
    description: 'Vuoi rispondere con calma o preferisci una sfida a tempo? Scegli tra 30, 20 o 10 secondi per domanda!',
    target: 'bambino',
  },
  {
    emoji: '✅',
    title: 'Rispondi alle domande',
    description: 'Leggi bene la domanda e tocca la risposta che pensi sia giusta. Dopo ogni risposta vedrai la spiegazione!',
    target: 'bambino',
  },
  {
    emoji: '📊',
    title: 'Guarda i risultati',
    description: 'Alla fine del quiz vedrai il tuo punteggio e quali argomenti devi ripassare. Puoi anche ripetere solo le domande sbagliate!',
    target: 'bambino',
  },
  {
    emoji: '💾',
    title: 'Salva e rifai',
    description: 'Puoi salvare i quiz per rifarli quando vuoi. Ogni volta le domande saranno diverse, così non ti annoi mai! I quiz salvati non consumano le pagine giornaliere.',
    target: 'bambino',
  },
  {
    emoji: '📄',
    title: 'Pagine giornaliere',
    description: 'Ogni giorno hai a disposizione 20 pagine per creare nuovi quiz. Puoi usarle come vuoi: tanti quiz da 1 pagina o pochi quiz da più pagine. Si ricaricano ogni giorno!',
    target: 'bambino',
  },
  {
    emoji: '📷',
    title: 'Quiz da foto',
    description: 'Vuoi fare un quiz su pagine che non sono ancora caricate? Scatta una foto delle pagine del libro e Quizzetto creerà le domande! Anche le foto usano le pagine giornaliere.',
    target: 'bambino',
  },
  {
    emoji: '👤',
    title: 'Il tuo profilo',
    description: 'Tocca l\'icona 👤 nella home per modificare il nome, la classe e la sezione. Importante: aggiorna la classe quando passi all\'anno successivo per vedere i libri giusti!',
    target: 'genitore',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Informazioni per i genitori',
    description: 'I quiz dalle pagine del libro hanno 10 sessioni gratuite, i quiz da foto 3 sessioni gratuite. Dopo è possibile attivare l\'abbonamento a soli 2€/mese per quiz illimitati su tutte le materie.',
    target: 'genitore',
  },
  {
    emoji: '📧',
    title: 'Notifiche per i genitori',
    description: 'Nel profilo puoi attivare le email con i risultati dopo ogni quiz e il riepilogo settimanale dei progressi della domenica mattina.',
    target: 'genitore',
  },
  {
    emoji: '✉️',
    title: 'Hai suggerimenti?',
    description: 'Se hai idee per migliorare Quizzetto, hai riscontrato un problema o vuoi semplicemente dirci qualcosa, tocca il pulsante "Contatta lo sviluppatore" nella home!',
    target: 'tutti',
  },
  {
    emoji: '🎓',
    title: 'Tutto pronto!',
    description: 'Hai studiato davvero tutto? Scopriamolo insieme! Buono studio!',
    target: 'tutti',
  },
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const current = tutorialSteps[step]
  const isLast = step === tutorialSteps.length - 1
  const isFirst = step === 0

  const targetColors = {
    bambino: { bg: COLORS.bgPurple, border: 'rgba(108,92,231,0.15)', color: COLORS.purple, label: '👧 Per te' },
    genitore: { bg: COLORS.bgGreen, border: 'rgba(0,184,148,0.15)', color: COLORS.green, label: '👨‍👩‍👧 Per i genitori' },
    tutti: { bg: 'rgba(253,203,110,0.08)', border: 'rgba(253,203,110,0.15)', color: '#e67e22', label: '' },
  }
  const targetStyle = targetColors[current.target]

  return (
    <div>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
        {tutorialSteps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? '20px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: i === step ? COLORS.purple : i < step ? COLORS.purpleLight : COLORS.grayBorder,
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Step content */}
      <div style={{ textAlign: 'center', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: 1 }}>{current.emoji}</div>
        
        {current.target !== 'tutti' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{
              fontFamily: FONTS.body, fontSize: '0.72rem', fontWeight: 600,
              padding: '0.2rem 0.6rem', borderRadius: '10px',
              background: targetStyle.bg, color: targetStyle.color,
              border: `1px solid ${targetStyle.border}`,
            }}>
              {targetStyle.label}
            </span>
          </div>
        )}

        <h3 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.75rem', lineHeight: 1.3 }}>
          {current.title}
        </h3>
        <p style={{ fontFamily: FONTS.body, fontSize: '0.95rem', color: COLORS.gray, lineHeight: 1.6, margin: '0 auto', maxWidth: '320px' }}>
          {current.description}
        </p>
      </div>

      {/* Step counter */}
      <p style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.grayLight, marginBottom: '1rem' }}>
        {step + 1} di {tutorialSteps.length}
      </p>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isFirst && (
          <button onClick={() => setStep(s => s - 1)} {...pressStyle}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '14px', border: `2px solid ${COLORS.grayBorder}`,
              background: 'white', fontFamily: FONTS.heading, fontSize: '0.95rem', color: COLORS.gray,
              cursor: 'pointer', transition: 'transform 0.2s ease',
            }}>
            ← Indietro
          </button>
        )}
        
        {isLast ? (
          <button onClick={onClose} {...pressStyle}
            style={{ ...btnPink, flex: 2, padding: '0.8rem', fontSize: '1rem' }}>
            🎓 Inizia a giocare!
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)} {...pressStyle}
            style={{ ...btnPrimary, flex: isFirst ? 1 : 2, padding: '0.8rem', fontSize: '0.95rem' }}>
            Avanti →
          </button>
        )}
      </div>

      {/* Skip button */}
      {!isLast && (
        <button onClick={onClose}
          style={{ display: 'block', margin: '0.75rem auto 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.grayLight }}>
          Salta il tutorial
        </button>
      )}
    </div>
  )
}
