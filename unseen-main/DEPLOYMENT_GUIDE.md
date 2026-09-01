# 🚀 Guida Deployment Vercel - UNSEEN

## ⚠️ IMPORTANTE - Problema Risolto

Le credenziali Supabase erano hardcoded nel codice. Questo causava errori su Vercel perché:
- ❌ Le chiavi pubbliche venivano esposte nel bundle JavaScript
- ❌ Se le env variables non erano impostate, il deploy falliva
- ❌ Security risk: chiunque poteva accedere al database

**✅ Soluzione applicata:**
- Rimosso il fallback hardcoded da `src/supabaseClient.ts`
- Ora l'app richiede le variabili di ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Aggiunto controllo che lancia un errore chiaro se le variabili mancano

---

## 📋 STEP-BY-STEP: Configurare Vercel

### **1️⃣ Preparare le Credenziali Supabase**

1. Vai su [app.supabase.com](https://app.supabase.com)
2. Apri il tuo progetto
3. In basso a sinistra: **Project Settings** → **API**
4. Copia questi valori:
   - 📌 **Project URL** → `VITE_SUPABASE_URL`
   - 📌 **Anon public key** → `VITE_SUPABASE_ANON_KEY` (quella con "sb_publishable_")

---

### **2️⃣ Configurare Vercel Dashboard**

1. Vai su [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto "unseen" o "art-duel-arena"
3. Clicca su **Settings** (in alto a destra della pagina)
4. Nel menu sinistro: **Environment Variables**
5. Aggiungi 2 nuove variabili:

   ```
   Nome: VITE_SUPABASE_URL
   Valore: https://mpqphroecgfwonclmkyb.supabase.co
   Scope: Production, Preview, Development
   [Salva]
   ```

   ```
   Nome: VITE_SUPABASE_ANON_KEY
   Valore: sb_publishable_BWGWu1l2rJqnj0g4DbGR2w_5CwDsEUa
   Scope: Production, Preview, Development
   [Salva]
   ```

6. Verifica che appaia la lista:
   ```
   ✓ VITE_SUPABASE_URL
   ✓ VITE_SUPABASE_ANON_KEY
   ```

---

### **3️⃣ Configurare CORS in Supabase**

1. Vai su [app.supabase.com](https://app.supabase.com) → Tuo Progetto
2. **Authentication** → **URL Configuration**
3. Aggiungi il dominio Vercel in **Redirect URLs**:
   ```
   https://unseen.vercel.app
   https://*.vercel.app
   ```
4. Salva

---

### **4️⃣ Effettuare il Deploy**

1. Fai il push su GitHub:
   ```bash
   git add .
   git commit -m "Fix: Remove hardcoded Supabase credentials and require env vars"
   git push origin main
   ```

2. Vercel farà il deploy automaticamente
3. Controlla il build log: **Deployments** → clicca sull'ultimo deploy
4. Se tutto è OK, vedrai: **✓ Build successful**

---

## 🧪 Test Locale PRIMA di Push

```bash
# 1. Crea file .env.local (basato su .env.example)
cp .env.example .env.local

# 2. Modifica .env.local con le tue credenziali Supabase
# VITE_SUPABASE_URL=https://mpqphroecgfwonclmkyb.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_...

# 3. Installa dipendenze (se non fatto)
npm install

# 4. Avvia il server dev
npm run dev

# 5. Testa l'app in http://localhost:8080

# 6. Build di produzione (stesso processo di Vercel)
npm run build

# 7. Preview del build
npm run preview
```

**Se vedi errore:**
```
Error: Missing required Supabase environment variables...
```

→ Le env variables non sono impostate. Controlla `.env.local`

---

## ✅ Checklist Prima di Each Deploy

- [ ] Le credenziali Supabase sono impostate in Vercel Dashboard
- [ ] File `.env.local` non è committato (è in `.gitignore`)
- [ ] Build locale funziona: `npm run build && npm run preview`
- [ ] CORS configurato in Supabase per il dominio Vercel
- [ ] Commit il codice con messaggi chiari
- [ ] Push su GitHub
- [ ] Vercel deploy automaticamente
- [ ] Verifica il deploy log per errori

---

## 🐛 Troubleshooting

### **"Build failed on Vercel"**
```
Error: Missing required Supabase environment variables
```
→ **Soluzione**: Verifica Environment Variables in Vercel Dashboard

### **"Cannot connect to Supabase"**
→ **Soluzione**: Controlla CORS in Supabase (vedi step 3)

### **"Auth redirect loop"**
→ **Soluzione**: Verifica Redirect URLs in Supabase Authentication settings

### **"Pagina 404 quando accedo a `/auth`, `/admin`, etc."**
→ **Normale**: Vercel è configurato per fare rewrite a `/` per SPA routing
→ React Router gestisce le rotte client-side ✅

---

## 📚 Link Utili

- 🔗 [Vercel Dashboard](https://vercel.com/dashboard)
- 🔗 [Supabase Console](https://app.supabase.com)
- 🔗 [Vite Build Configuration](https://vitejs.dev/config/)
- 🔗 [React Router Documentation](https://reactrouter.com/)

---

## 🎯 Prossimi Step Consigliati

1. ✅ **Aggiorna README.md** con istruzioni per il setup
2. 🎯 **Configura GitHub Actions** per tests automatici
3. 🎯 **Abilita TypeScript strict mode** per migliore type safety
4. 🎯 **Aggiungi favicon personalizzato**
5. 🎯 **Setup monitoring** (Vercel Analytics)

---

**Questions?** Controlla i log di Vercel: **Deployments** → clicca il deploy → **Logs**
