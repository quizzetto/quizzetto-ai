const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_QUIZ = import.meta.env.VITE_EMAILJS_TEMPLATE_QUIZ
const TEMPLATE_WEEKLY = import.meta.env.VITE_EMAILJS_TEMPLATE_WEEKLY

const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send'

async function sendEmail(templateId, params) {
  if (!PUBLIC_KEY || !SERVICE_ID) return
  try {
    await fetch(EMAILJS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: templateId,
        user_id: PUBLIC_KEY,
        template_params: params,
      })
    })
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

export async function sendQuizReport({ parentEmail, childName, topic, correct, total, percentage, timerMode }) {
  if (!TEMPLATE_QUIZ) return
  
  let resultMessage = ''
  if (percentage >= 80) resultMessage = '🌟 Ottimo lavoro! Continua così!'
  else if (percentage >= 50) resultMessage = '👍 Buon risultato, ma qualche argomento va ripassato.'
  else resultMessage = '📚 Si può fare di meglio! Un po\' di ripasso e andrà benissimo!'

  await sendEmail(TEMPLATE_QUIZ, {
    parent_email: parentEmail,
    child_name: childName,
    topic: topic,
    correct: correct,
    total: total,
    percentage: percentage,
    timer_mode: timerMode === 'off' ? 'Senza tempo' : `${timerMode} per domanda`,
    result_message: resultMessage,
  })
}

export async function sendWeeklyReport({ parentEmail, childName, quizCount, avgPercentage, bestPercentage, details }) {
  if (!TEMPLATE_WEEKLY) return

  await sendEmail(TEMPLATE_WEEKLY, {
    parent_email: parentEmail,
    child_name: childName,
    quiz_count: quizCount,
    avg_percentage: avgPercentage,
    best_percentage: bestPercentage,
    details: details || 'Nessun dettaglio aggiuntivo.',
  })
}
