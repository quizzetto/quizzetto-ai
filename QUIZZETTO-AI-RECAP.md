# Quizzetto AI — Riepilogo Progetto Completo
## Aggiornato al 25 Marzo 2026

---

## Identità progetto
- **Nome:** Quizzetto AI
- **Tagline:** "Hai studiato davvero tutto? Scopriamolo insieme!"
- **Target:** bambini scuola primaria 6-11 anni
- **Mascotte:** libricino con occhiali e tocco da laureato
- **Colori:** viola (#6c5ce7), rosa (#fd79a8), verde (#00b894)
- **Sviluppatore:** N.B.
- **URL:** https://quizzetto-ai.vercel.app/

---

## Stack tecnologico
- **Frontend:** React + Vite (PWA con manifest.json, display: standalone)
- **Hosting:** Vercel — auto-deploy da GitHub
- **Database + Auth:** Supabase — https://hnwogiwuujpkvqvwgvab.supabase.co
- **AI:** Anthropic API (modello claude-haiku-4-5-20251001)
- **Pagamenti:** PayPal manuale (PayPal.me, attivazione admin)
- **Email:** EmailJS (report quiz + riepilogo settimanale)

---

## Account
- **Email dedicata:** quizzetto.nb@gmail.com
- **GitHub:** repository `quizzetto-ai` (public)
- **Vercel:** collegato a GitHub, auto-deploy
- **Supabase:** collegato a GitHub
- **Anthropic API:** console.anthropic.com
- **EmailJS:** emailjs.com (piano gratuito, 200 email/mese)

---

## Variabili d'ambiente Vercel
```
VITE_SUPABASE_URL=https://hnwogiwuujpkvqvwgvab.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_PAYPAL_EMAIL=(username PayPal.me)
VITE_CONTACT_EMAIL=quizzetto.nb@gmail.com
VITE_EMAILJS_PUBLIC_KEY=S7K1MhhdohcqvCDiL
VITE_EMAILJS_SERVICE_ID=service_0k7by4k
VITE_EMAILJS_TEMPLATE_QUIZ=template_8uko78a
VITE_EMAILJS_TEMPLATE_WEEKLY=template_t21k86p
```

---

## Struttura file progetto
```
quizzetto-ai/
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
├── public/
│   ├── manifest.json          ← PWA config (standalone)
│   ├── icon-192.png           ← Icona PWA piccola
│   └── icon-512.png           ← Icona PWA grande
└── src/
    ├── main.jsx               ← gestisce auth + password reset flow
    ├── lib/
    │   ├── supabase.js        ← client Supabase
    │   ├── ai.js              ← generazione quiz, estrazione testo, pool domande
    │   ├── email.js           ← invio email report (EmailJS)
    │   └── styles.js          ← COLORS, FONTS, stili condivisi
    └── components/
        ├── Header.jsx         ← header con logo/titolo
        ├── Auth.jsx           ← login/registrazione + messaggio conferma email
        ├── ResetPassword.jsx  ← schermata cambio password
        ├── App.jsx            ← orchestratore principale, tutte le fasi
        ├── AdminPanel.jsx     ← pannello admin completo
        ├── PhotoUpload.jsx    ← upload foto per quiz da foto
        ├── QuizPlay.jsx       ← quiz interattivo con timer
        ├── QuizResults.jsx    ← risultati con grafico circolare
        ├── TimerSetup.jsx     ← scelta modalità timer
        ├── PaymentWall.jsx    ← muro pagamento PayPal (1,50€)
        ├── ProfileSettings.jsx ← profilo utente (nome, classe, sezione, notifiche)
        └── Tutorial.jsx       ← tutorial interattivo (16 schermate)
```

---

## Database Supabase — Tabelle

### profiles
- id, email, child_name, school_year, section
- is_admin, is_active, is_free_access
- has_paid, paid_until
- free_sessions_used (max 10 per quiz pagine), free_photo_used (max 3 per quiz foto)
- daily_pages_used, max_daily_pages (20), daily_quiz_count, daily_quiz_date
- notify_after_quiz, notify_weekly
- created_at

### subjects
- id, name, icon (emoji)

### pages
- id, subject_id, school_year, section, page_number, book_title
- questions (JSONB — pool pre-generato 5x)
- image_url (NULL — immagini cancellate dopo migrazione)
- extracted_text (NULL — testo cancellato dopo migrazione)

### quizzes
- id, user_id, subject_id, topic, questions (JSONB)
- source_type ('pages' | 'photo'), page_start, page_end

### quiz_results
- id, quiz_id (nullable), user_id, answers, correct_count, total_count
- percentage, timer_mode, completed_at

### settings
- key (TEXT PK), value (TEXT)
- Chiave 'page_display': non più usata (era per miniature/numeri)

### Storage bucket "pages"
- Pubblico, ma immagini cancellate dopo migrazione

---

## RLS (Row Level Security) — Attiva
- **profiles:** lettura pubblica, update per owner o admin, insert per owner, delete per admin
- **pages:** lettura pubblica, insert/update/delete solo admin
- **subjects:** lettura pubblica, insert/delete solo admin
- **quizzes:** lettura/insert per owner, lettura/delete per admin
- **quiz_results:** lettura/insert per owner, lettura/delete per admin
- **settings:** lettura pubblica, gestione admin
- Admin UUID: 282b2005-f9eb-4dcc-9391-671742a4bed2

---

## Modello di business

### Abbonamento: 1,50€/mese
- Quiz dalle pagine precaricate: 10 sessioni gratuite, poi abbonamento
- Quiz da foto: 3 sessioni gratuite, poi abbonamento
- Chi ha pagato: tutto illimitato
- Pagamento via PayPal.me, attivazione manuale da admin
- Scadenza: stesso giorno del mese successivo (gestisce febbraio)
- Admin può +1 mese / -1 mese

### Costi operativi
- Quiz da pagine precaricate: 0€ (domande nel DB)
- Quiz da foto: ~0.01€ per foto (Haiku)
- Caricamento nuovi libri: ~0.026€/pagina con pool 5x (una tantum)
- Hosting Vercel + Supabase: gratuito
- EmailJS: gratuito (200 email/mese)

---

## Flusso principale

### Upload pagine (admin)
1. Admin seleziona materia, classe, sezione, titolo libro
2. Seleziona/trascina più immagini (ordinate per nome file)
3. Per ogni pagina: estrae testo (AI) → genera pool 5x domande (AI) → salva solo domande nel DB
4. Nessuna immagine e nessun testo conservato (sicurezza copyright)
5. Barra di progresso con fase corrente
6. Check duplicati con opzione sovrascrittura

### Quiz dalle pagine (bambino — zero API)
1. Sceglie materia → selettore libro (se più sezioni) → carosello numeri pagina
2. Seleziona max 5 pagine → vede conteggio domande
3. Domande pescate dal pool pre-generato nel DB (istantaneo)
4. Le risposte vengono mescolate ogni volta (Fisher-Yates)
5. Quiz con/senza timer (30s/20s/10s)
6. Risultati con spiegazioni e opzione "ripeti solo sbagliate"

### Quiz da foto (bambino — usa API)
1. Scatta/carica foto delle pagine
2. AI genera domande al volo
3. Conta come sessione foto (3 gratuite)
4. Salva risultati nel DB

---

## Prompt AI — Regole chiave
- Domande basate SOLO sul testo, no riferimenti a immagini/grafici
- NO citazioni testuali dal libro, riformulare sempre
- NO domande auto-rispondenti (es: "Quanti sono i 5 continenti?")
- NO riferimenti a "il libro", "la pagina", "il testo"
- 1-2 domande di logica/ragionamento per sessione
- Risposte tutte della stessa lunghezza (differenza max 2 parole)
- Risposte sbagliate plausibili e credibili
- Posizione risposta corretta mescolata (A/B/C/D)
- Difficoltà: 30% facile, 40% media, 30% difficile

---

## Pannello Admin
- **Pagine:** upload multiplo, modifica in blocco classe/sezione/titolo, griglia con conteggio domande
- **Materie:** aggiungi/elimina con icone emoji
- **Utenti:** lista con stats (quiz tot, quiz oggi, foto tot, foto gratis), registrazione, ultima sessione, modifica nome/classe/sezione, attiva/disattiva, pagamento +1m/-1m, elimina con doppia conferma, alert scadenza 5gg
- **Impostazioni:** migrazione pagine esistenti con barra progresso, invio riepilogo settimanale manuale

---

## Email (EmailJS)
- **Report dopo quiz:** automatico se attivato nel profilo, con punteggio e messaggio incoraggiante
- **Riepilogo settimanale:** manuale da admin, invia a tutti con notifica attiva, include quiz count, media, miglior risultato, dettagli

---

## Tutorial (16 schermate)
1. Benvenuto
2. Scegli la materia
3. Scegli il libro
4. Seleziona le pagine (max 5)
5. Crea il Quiz
6. Scegli la modalità tempo
7. Rispondi alle domande
8. Guarda i risultati
9. Salva e rifai
10. Pagine giornaliere (20/giorno)
11. Quiz da foto
12. Il tuo profilo
13. Informazioni genitori (1,50€/mese + spiegazione AI)
14. Notifiche email
15. Contatta lo sviluppatore
16. Tutto pronto!

---

## Funzionalità PENDING (da implementare in futuro)
- Area insegnante (carica documenti, riceve report classe)
- Notifiche email automatiche (cron job per riepilogo domenicale)
- PayPal automatico con rinnovo
- Dashboard progressi per genitori
- Contatore costi stimati nell'admin
- Riduzione pool da 5x a 3x per risparmiare (opzionale)
- Play Store / PWA icone avanzate
