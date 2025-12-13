# 🎨 Sora Image Generator - API & Web Manager

## Novità versione 2.0

✅ **API REST** per aggiornare il playbook
✅ **Interfaccia Web** per gestire prompts, variabili e parametri
✅ **Validazione completa** dei dati

## 🚀 Avvio

### 1. Avvia il server API

```bash
npm run server
```

Il server partirà su http://localhost:3000

### 2. Apri l'interfaccia web

Apri il browser e vai su: http://localhost:3000

### 3. Avvia il generatore Sora (in un altro terminale)

```bash
npm start
```

## 📡 API Endpoints

### GET /api/playbook

Recupera il playbook corrente

```bash
curl http://localhost:3000/api/playbook
```

### POST /api/playbook

Aggiorna il playbook (con validazione)

```bash
curl -X POST http://localhost:3000/api/playbook \
  -H "Content-Type: application/json" \
  -d @playbook.json
```

### POST /api/playbook/validate

Valida il playbook senza salvarlo

```bash
curl -X POST http://localhost:3000/api/playbook/validate \
  -H "Content-Type: application/json" \
  -d @playbook.json
```

## 🎨 Interfaccia Web

L'interfaccia web permette di:

### 📝 Prompts

- Aggiungere/rimuovere prompt
- Modificare il testo con variabili `{{nome}}`
- Configurare il numero di retry per ogni prompt

### 🔧 Variabili

- Aggiungere/rimuovere variabili personalizzate
- Modificare il nome della variabile
- Aggiungere/rimuovere valori per ogni variabile

### ⚙️ Parametri

- `waitMin`: Tempo minimo di attesa (in minuti)
- `waitMax`: Tempo massimo di attesa (in minuti)

## 📋 Validazione

Il sistema valida:

- ✅ Prompts devono essere un array con `text` (stringa) e `retries` (numero positivo)
- ✅ Vars devono essere un oggetto con array di stringhe come valori
- ✅ Params devono avere `waitMin` e `waitMax` (numeri positivi)
- ✅ `waitMin` non può essere maggiore di `waitMax`

## 🛠️ Tecnologie

- **Backend**: Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Automation**: Puppeteer

## 📖 Esempio Playbook

```json
{
  "prompts": [
    {
      "text": "Un paesaggio futuristico su {{location}} con {{feature}}.",
      "retries": 3
    }
  ],
  "vars": {
    "location": ["Marte", "una foresta tropicale"],
    "feature": ["vegetazione aliena", "robot volanti"]
  },
  "params": {
    "waitMin": 7,
    "waitMax": 10
  }
}
```

## 🔒 Sicurezza

L'API include validazione completa per prevenire:

- Dati malformati
- Valori non validi
- Strutture incorrette

## 📝 License

MIT
