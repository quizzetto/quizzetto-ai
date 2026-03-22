const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

function countWords(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function getProposedCountForSinglePage(text) {
  const words = countWords(text)
  if (words < 50) return 3
  if (words < 150) return 5
  if (words < 300) return 8
  return 10
}

// Accepts either a single text string or an array of page texts
function getProposedCountFromTexts(texts) {
  if (!texts) return 10
  const textArray = Array.isArray(texts) ? texts : [texts]
  return textArray.reduce((sum, t) => sum + getProposedCountForSinglePage(t), 0)
}

function getQuestionsCountFromTexts(texts) {
  // Pool generato: doppio delle domande proposte
  return getProposedCountFromTexts(texts) * 2
}

// Legacy fixed count (for photo uploads where we don't have text yet)
function getQuestionsCount(pageCount) {
  return 20 + Math.max(0, (pageCount - 1) * 10)
}

function shuffleOptions(quiz) {
  quiz.questions = quiz.questions.map(q => {
    // Create array of indices [0,1,2,3] and shuffle
    const indices = [0, 1, 2, 3]
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    // Rearrange options and update correct index
    const newOptions = indices.map(i => q.options[i])
    const newCorrect = indices.indexOf(q.correct)
    return { ...q, options: newOptions, correct: newCorrect }
  })
  return quiz
}

export function getProposedCount(pageCount, texts) {
  if (texts) return getProposedCountFromTexts(texts)
  return 10 + Math.max(0, (pageCount - 1) * 5)
}

function getDifficultyDistribution(total) {
  const easy = Math.round(total * 0.3)
  const hard = Math.round(total * 0.3)
  const medium = total - easy - hard
  return { easy, medium, hard }
}

export function pickRandomQuestions(allQuestions, count = 10) {
  if (allQuestions.length <= count) return [...allQuestions]
  
  // Shuffle using Fisher-Yates
  const shuffled = [...allQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Pick 'count' questions, trying to maintain difficulty balance
  const easy = shuffled.filter(q => q.difficulty === 'facile')
  const medium = shuffled.filter(q => q.difficulty === 'media')
  const hard = shuffled.filter(q => q.difficulty === 'difficile')
  
  const picked = []
  const easyCount = Math.round(count * 0.3)
  const hardCount = Math.round(count * 0.3)
  const mediumCount = count - easyCount - hardCount
  
  picked.push(...easy.slice(0, easyCount))
  picked.push(...medium.slice(0, mediumCount))
  picked.push(...hard.slice(0, hardCount))
  
  // Fill remaining if any category was short
  while (picked.length < count) {
    const remaining = shuffled.filter(q => !picked.includes(q))
    if (remaining.length === 0) break
    picked.push(remaining[0])
  }
  
  // Re-assign IDs in order
  return picked.map((q, i) => ({ ...q, id: i + 1 }))
}

export async function generateQuizFromText(contentText, topic, pageCount, apiKey, pageTexts) {
  const totalQuestions = pageTexts ? getQuestionsCountFromTexts(pageTexts) : getQuestionsCount(pageCount)
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
      max_tokens: 8000,
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
- Molte domande devono testare lo stesso concetto ma formulato in modo diverso
- Usa un linguaggio semplice e adatto ai bambini
- Ogni domanda deve avere una spiegazione chiara della risposta corretta
- Varia il più possibile la formulazione delle domande

REGOLE IMPORTANTI PER LE RISPOSTE:
- TUTTE e 4 le opzioni devono avere una lunghezza SIMILE (stesso numero di parole circa)
- Le risposte sbagliate devono essere PLAUSIBILI e credibili, non ovviamente errate
- Le risposte sbagliate devono riguardare lo stesso argomento della domanda
- NON mettere mai la risposta corretta sempre più lunga o più dettagliata delle altre
- Mescola la posizione della risposta corretta (a volte A, a volte B, C o D)
- Le risposte sbagliate devono sembrare vere a chi non ha studiato bene
- Evita risposte assurde o chiaramente impossibili
- Per le domande difficili, usa risposte sbagliate che contengono elementi parzialmente veri

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
  return shuffleOptions(JSON.parse(text.replace(/```json|```/g, '').trim()))
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
      max_tokens: 8000,
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
- Molte domande devono testare lo stesso concetto ma formulato in modo diverso
- Usa un linguaggio semplice e adatto ai bambini
- Ogni domanda deve avere una spiegazione chiara della risposta corretta
- Varia il più possibile la formulazione delle domande

REGOLE IMPORTANTI PER LE RISPOSTE:
- TUTTE e 4 le opzioni devono avere una lunghezza SIMILE (stesso numero di parole circa)
- Le risposte sbagliate devono essere PLAUSIBILI e credibili, non ovviamente errate
- Le risposte sbagliate devono riguardare lo stesso argomento della domanda
- NON mettere mai la risposta corretta sempre più lunga o più dettagliata delle altre
- Mescola la posizione della risposta corretta (a volte A, a volte B, C o D)
- Le risposte sbagliate devono sembrare vere a chi non ha studiato bene
- Evita risposte assurde o chiaramente impossibili
- Per le domande difficili, usa risposte sbagliate che contengono elementi parzialmente veri

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

  const data2 = await response.json()
  const text2 = data2.content.filter(i => i.type === 'text').map(i => i.text).join('')
  return shuffleOptions(JSON.parse(text2.replace(/```json|```/g, '').trim()))
}
