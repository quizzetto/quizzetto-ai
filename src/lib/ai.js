const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

function getQuestionsCount(pageCount) {
  return 10 + Math.max(0, (pageCount - 1) * 5)
}

function getDifficultyDistribution(total) {
  const easy = Math.round(total * 0.3)
  const hard = Math.round(total * 0.3)
  const medium = total - easy - hard
  return { easy, medium, hard }
}

export async function generateQuizFromText(contentText, topic, pageCount, apiKey) {
  const totalQuestions = getQuestionsCount(pageCount)
  const dist = getDifficultyDistribution(totalQuestions)

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Sei un insegnante simpatico e paziente per bambini delle elementari (6-11 anni).

Ecco il contenuto delle pagine di un libro scolastico sull'argomento "${topic}":

${contentText}

Genera un quiz basato su questo contenuto.

REGOLE:
- Genera esattamente ${totalQuestions} domande a risposta multipla
- Ogni domanda deve avere 4 opzioni (A, B, C, D) di cui solo 1 corretta
- Le prime ${dist.easy} domande devono essere facili (comprensione base)
- Le successive ${dist.medium} domande di media difficoltà
- Le ultime ${dist.hard} domande più impegnative (richiedono ragionamento)
- Alcune domande devono testare lo stesso concetto ma formulato in modo diverso
- Usa un linguaggio semplice e adatto ai bambini
- Ogni domanda deve avere una spiegazione chiara della risposta corretta

Rispondi SOLO con un JSON valido (senza markdown, senza backtick) con questa struttura:
{
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "testo della domanda",
      "options": ["opzione A", "opzione B", "opzione C", "opzione D"],
      "correct": 0,
      "explanation": "spiegazione semplice",
      "difficulty": "facile"
    }
  ]
}

Il campo "correct" è l'indice (0-3) dell'opzione corretta.
Il campo "difficulty" può essere "facile", "media", "difficile".`
      }]
    })
  })

  const data = await response.json()
  const text = data.content.filter(i => i.type === 'text').map(i => i.text).join('')
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

export async function generateQuizFromImages(images, apiKey) {
  const imageContents = await Promise.all(
    images.map(async (file) => {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = () => reject(new Error('Errore lettura'))
        reader.readAsDataURL(file)
      })
      return {
        type: 'image',
        source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 }
      }
    })
  )

  const totalQuestions = getQuestionsCount(images.length)
  const dist = getDifficultyDistribution(totalQuestions)

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `Sei un insegnante simpatico e paziente per bambini delle elementari (6-11 anni).

Guarda attentamente le immagini di queste pagine di un libro scolastico e genera un quiz basato sul contenuto.

REGOLE:
- Genera esattamente ${totalQuestions} domande a risposta multipla
- Ogni domanda deve avere 4 opzioni (A, B, C, D) di cui solo 1 corretta
- Le prime ${dist.easy} domande devono essere facili (comprensione base)
- Le successive ${dist.medium} domande di media difficoltà  
- Le ultime ${dist.hard} domande più impegnative (richiedono ragionamento)
- Alcune domande devono testare lo stesso concetto ma formulato in modo diverso
- Usa un linguaggio semplice e adatto ai bambini
- Ogni domanda deve avere una spiegazione chiara della risposta corretta

Rispondi SOLO con un JSON valido (senza markdown, senza backtick) con questa struttura:
{
  "topic": "Argomento principale delle pagine",
  "questions": [
    {
      "id": 1,
      "question": "testo della domanda",
      "options": ["opzione A", "opzione B", "opzione C", "opzione D"],
      "correct": 0,
      "explanation": "spiegazione semplice",
      "difficulty": "facile"
    }
  ]
}

Il campo "correct" è l'indice (0-3) dell'opzione corretta.
Il campo "difficulty" può essere "facile", "media", "difficile".`
          }
        ]
      }]
    })
  })

  const data = await response.json()
  const text = data.content.filter(i => i.type === 'text').map(i => i.text).join('')
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}
