# Avvio dell'applicazione

L'applicazione è composta dal backend AgnoOS e dall'interfaccia web sviluppata con Next.js.

## Prerequisiti

- Docker Desktop
- Node.js e npm
- Python e uv
- Agno e le relative dipendenze

## Impostare le variabili d'ambiente

Nel file `.env` inserire le seguenti variabili:
- `GOOGLE_API_KEY`: chiave API per accedere ai modelli Google Gemini.
- `AUTH_SECRET`: segreto utilizzato per firmare e proteggere le sessioni di autenticazione.
- `INTERNAL_API_TOKEN`: token per autenticare le comunicazioni interne tra i servizi.

E in `.env.local` inserire:
- `PYTHON_AGENT_URL`: URL del servizio FastAPI che gestisce l'agente Python (http://localhost:8000).
- `INTERNAL_API_TOKEN`: deve coincidere con il valore definito nel file `.env`.

## Avviare l'immagine Docker

Avviare l'immagine Docker per la sandbox di simulazione:

```bash
docker build -t paper-code-sandbox .
```

## Avviare FastApi

Creare il virtual environment e installare le dipendenze con uv:

```bash
uv venv
uv pip install -r requirements.txt
```

Avviare il server FastApi:

```bash
python main.py
```

Lascia il processo in esecuzione (che sarà disponibile a http://localhost:8000).

## Avviare l'app Next.js

In una nuova finestra del terminale, installa le dipendenze e avvia il server:

```bash
npm install
```

```bash
npm run dev
```

L'applicazione sarà disponibile all'indirizzo http://localhost:3000.

### Nota 
Alcuni paper di esempio che possono essere utilizzati per la simulazione di codice Python:
- Direct Preference Optimization: Your Language Model is Secretly a Reward Model
- Token-level Direct Preference Optimization
- NEORL: NeuroEvolution Optimization with Reinforcement Learning
