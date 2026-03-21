# 🎓 QUIZZETTO AI - Guida alla Pubblicazione

## Passo 1: Prepara la chiave API Anthropic

1. Vai su https://console.anthropic.com
2. Nel menu a sinistra clicca **"API Keys"**
3. Clicca **"Create Key"**
4. Dai un nome tipo "quizzetto-ai"
5. **COPIA la chiave** (inizia con `sk-ant-...`) e salvala in un posto sicuro
6. Vai su **"Billing"** nel menu a sinistra
7. Aggiungi una carta e carica **10€ di credito** per iniziare

## Passo 2: Carica il progetto su GitHub

1. Vai su https://github.com
2. Clicca il **"+"** in alto a destra → **"New repository"**
3. Repository name: `quizzetto-ai`
4. Lascia **Public** (Vercel ne ha bisogno nel piano gratuito)
5. Clicca **"Create repository"**
6. Nella pagina che appare, clicca **"uploading an existing file"**
7. **Trascina TUTTI i file e le cartelle** del progetto nella pagina
   (la cartella `src`, il file `package.json`, `index.html`, `vite.config.js`, `.gitignore`, `.env.example`, e la cartella `public`)
8. Scrivi "Initial commit" nel campo del messaggio
9. Clicca **"Commit changes"**

## Passo 3: Pubblica su Vercel

1. Vai su https://vercel.com
2. Clicca **"Add New..."** → **"Project"**
3. Vedrai la lista dei tuoi repository GitHub
4. Clicca **"Import"** accanto a `quizzetto-ai`
5. **IMPORTANTE - Environment Variables**: Prima di cliccare Deploy, scorri in basso e clicca **"Environment Variables"**
6. Aggiungi queste variabili una per una:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://hnwogiwuujpkvqvwgvab.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhud29naXd1dWpwa3ZxdndndmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDM5NTUsImV4cCI6MjA4OTY3OTk1NX0.9NoVreus4uUIKrhKhMjo5ePFTv18586U7yrF6ppzpAY` |
   | `VITE_ANTHROPIC_API_KEY` | La chiave che hai copiato al Passo 1 |
   | `VITE_PAYPAL_EMAIL` | Il tuo username PayPal o email PayPal |

7. Clicca **"Deploy"**
8. Aspetta 1-2 minuti... e l'app è online! 🎉
9. Vercel ti dà un link tipo `quizzetto-ai.vercel.app`

## Passo 4: Configura Supabase per accettare il tuo dominio

1. Vai su https://supabase.com → il tuo progetto quizzetto-ai
2. Nel menu a sinistra: **Authentication** → **URL Configuration**
3. In **"Site URL"** inserisci: `https://quizzetto-ai.vercel.app` (il link che Vercel ti ha dato)
4. In **"Redirect URLs"** aggiungi: `https://quizzetto-ai.vercel.app/**`
5. Clicca **"Save"**

## Passo 5: Testa l'app!

1. Apri il link Vercel nel browser
2. Accedi con l'email e password che hai creato su Supabase
3. Dovresti vedere il pannello admin (icona ⚙️)
4. Vai nel pannello admin e:
   - Aggiungi le materie (Storia, Geografia, Scienze, ecc.)
   - Aggiungi i contenuti dei libri
5. Torna alla home e prova a fare un quiz!

## Come aggiornare l'app in futuro

1. Vai su GitHub → il tuo repository quizzetto-ai
2. Naviga fino al file da modificare
3. Clicca l'icona della matita (Edit)
4. Fai le modifiche
5. Clicca "Commit changes"
6. Vercel si aggiorna automaticamente in 30 secondi!

## Risoluzione problemi comuni

**"Non riesco ad accedere"**
- Verifica che la Site URL su Supabase corrisponda esattamente al link Vercel

**"Il quiz non si genera"**
- Verifica la chiave API Anthropic nelle Environment Variables di Vercel
- Verifica di avere credito su console.anthropic.com

**"Errore dopo il deploy"**
- Su Vercel, vai in "Deployments" e controlla i log di build per errori
