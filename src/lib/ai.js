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

function getPoolCountForSinglePage(text) {
  return getProposedCountForSinglePage(text) * 5
}

function getProposedCountFromTexts(texts) {
  if (!texts) return 10
  const textArray = Array.isArray(texts) ? texts : [texts]
  return textArray.reduce((sum, t) => sum + getProposedCountForSinglePage(t), 0)
}

function getQuestionsCount(pageCount) {
  return 20 + Math.max(0, (pageCount - 1) * 10)
}

export function getProposedCount(pageCount, texts) {
  if (texts) return getProposedCountFromTexts(texts)
  return 10 + Math.max(0, (pageCount - 1) * 5)
}

export function getProposedCountFromPool(questionsArrays) {
  const totalPool = questionsArrays.reduce((sum, qs) => sum + (qs?.length || 0), 0)
  return Math.max(3, Math.round(totalPool / 5))
}

function getDifficultyDistribution(total) {
  const easy = Math.round(total * 0.3)
  const hard = Math.round(total * 0.3)
  const medium = total - easy - hard
  return { easy, medium, hard }
}

function shuffleSingleOptions(q) {
  const indices = [0, 1, 2, 3]
  for (let k = indices.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [indices[k], indices[j]] = [indices[j], indices[k]]
  }
  const newOptions = indices.map(idx => q.options[idx])
  const newCorrect = indices.indexOf(q.correct)
  return { ...q, options: newOptions, correct: newCorrect }
}

function shuffleOptions(quiz) {
  quiz.questions = quiz.questions.map(q => shuffleSingleOptions(q))
  return quiz
}

export function pickRandomQuestions(allQuestions, count = 10) {
  if (!allQuestions || allQuestions.length === 0) return []
  
  const shuffled = [...allQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  if (shuffled.length <= count) {
    return shuffled.map((q, i) => shuffleSingleOptions({ ...q, id: i + 1 }))
  }
  
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
  
  while (picked.length < count) {
    const remaining = shuffled.filter(q => !picked.includes(q))
    if (remaining.length === 0) break
    picked.push(remaining[0])
  }
  
  return picked.map((q, i) => shuffleSingleOptions({ ...q, id: i + 1 }))
}

const QUIZ_RULES = `
REGOLE:
- Ogni domanda deve avere 4 opzioni (A, B, C, D) di cui solo 1 corretta
- Distribuisci le difficoltà: 30% facili (comprensione base), 40% medie, 30% difficili (ragionamento)
- Usa un linguaggio semplice e adatto ai bambini delle elementari
- Ogni domanda deve avere una spiegazione chiara della risposta corretta
- Varia il più possibile la formulazione delle domande
- Basa le domande ESCLUSIVAMENTE sugli argomenti e le informazioni del testo, NON fare domande su immagini, foto, illustrazioni, grafici o mappe
- Ignora completamente le descrizioni tra parentesi quadre [...] che si riferiscono a elementi visivi
- NON citare MAI frasi del libro testualmente nelle domande o nelle risposte
- Riformula SEMPRE i concetti con parole tue, come farebbe un insegnante
- NON fare riferimento a "il libro", "la pagina", "il testo" nelle domande — formula le domande come domande di conoscenza generali sull'argomento
- Aggiungi 1-2 domande di logica/ragionamento collegata all'argomento (es: "Se... allora cosa succederebbe?")
- NON creare MAI domande che contengono già la risposta nel testo della domanda (es: "Quanti sono i 5 continenti?" è VIETATO perché il numero è già nella domanda)
- NON creare domande banali o ovvie — ogni domanda deve richiedere di aver studiato l'argomento per rispondere correttamente

REGOLE IMPORTANTI PER LE RISPOSTE:
- TUTTE e 4 le opzioni devono avere una lunghezza SIMILE (stesso numero di parole circa)
- Le risposte sbagliate devono essere PLAUSIBILI e credibili, non ovviamente errate
- Le risposte sbagliate devono riguardare lo stesso argomento della domanda
- NON mettere mai la risposta corretta sempre più lunga o più dettagliata delle altre
- Mescola la posizione della risposta corretta (a volte A, a volte B, C o D)
- Le risposte sbagliate devono sembrare vere a chi non ha studiato bene
- Evita risposte assurde o chiaramente impossibili
- Per le domande difficili, usa risposte sbagliate che contengono elementi parzialmente veri
- OGNI opzione deve avere lo STESSO numero di parole della risposta corretta (differenza massima 2 parole). Questo è FONDAMENTALE.`

const QUIZ_JSON_FORMAT = `
Rispondi SOLO con un JSON valido (senza markdown, senza backtick) con questa struttura:
{
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

// ─── PRE-GENERATE questions for a single page (admin upload) ───
export async function generateQuestionsForPage(extractedText, apiKey) {
  const poolSize = getPoolCountForSinglePage(extractedText)
  
  // Split into batches of max 15 questions per call to avoid truncation
  const batchSize = 15
  const batches = Math.ceil(poolSize / batchSize)
  let allQuestions = []
  
  for (let b = 0; b < batches; b++) {
    const batchCount = Math.min(batchSize, poolSize - (b * batchSize))
    const batchNum = b + 1
    
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

Ecco il contenuto di una pagina di un libro scolastico:

${extractedText}

Genera esattamente ${batchCount} domande a risposta multipla su questo contenuto.
${batches > 1 ? `Questo è il blocco ${batchNum} di ${batches}. Genera domande DIVERSE dai blocchi precedenti, coprendo aspetti diversi dell'argomento.` : ''}
Le domande devono coprire gli argomenti presenti e testare la conoscenza in modi diversi.
Ogni concetto deve essere verificato da domande formulate in modo differente.
${QUIZ_RULES}
${QUIZ_JSON_FORMAT}`
        }]
      })
    })

    const data = await response.json()
    const text = data.content.filter(i => i.type === 'text').map(i => i.text).join('')
    
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      const questions = parsed.questions || []
      // Re-number IDs
      const numbered = questions.map((q, i) => ({ ...q, id: allQuestions.length + i + 1 }))
      allQuestions.push(...numbered)
    } catch (e) {
      console.error('JSON parse error in batch', batchNum, e)
    }
    
    // Small delay between batches
    if (b < batches - 1) await new Promise(r => setTimeout(r, 300))
  }
  
  return allQuestions
}

// ─── Extract text from image (admin upload) ───
export async function extractTextFromImage(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Errore lettura'))
    reader.readAsDataURL(file)
  })
  const content = file.type === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } }
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
      messages: [{ role: 'user', content: [content, { type: 'text', text: 'Estrai TUTTO il testo presente in questa pagina di un libro scolastico. Trascrivi fedelmente mantenendo la struttura. NON aggiungere commenti. Se ci sono immagini/grafici, descrivi brevemente tra parentesi quadre. Rispondi SOLO con il testo estratto.' }] }]
    })
  })
  const data = await response.json()
  return data.content.filter(i => i.type === 'text').map(i => i.text).join('')
}

// ─── GENERATE quiz from photo images (photo quiz, uses API live) ───
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
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `Sei un insegnante simpatico e paziente per bambini delle elementari (6-11 anni).

Guarda attentamente le immagini di queste pagine di un libro scolastico e genera un quiz basato sul contenuto testuale.

Genera esattamente ${totalQuestions} domande a risposta multipla.
${QUIZ_RULES}

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
  return shuffleOptions(JSON.parse(text.replace(/```json|```/g, '').trim()))
}
