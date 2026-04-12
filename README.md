# 🎓 StudySense AI — Intelligent RAG Study Assistant

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/Endee_VectorDB-8A2BE2?style=for-the-badge" alt="Endee">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

> **Submission for:** SDE / AI / ML Intern Role · Built within 24 Hours
> ⭐ [Star the Endee Repository](https://github.com/endee-io/endee) · 🍴 [Fork It](https://github.com/endee-io/endee/fork)

---

**StudySense AI** transforms your static study materials into interactive learning experiences. Upload any PDF or DOCX and instantly chat with your documents, generate custom quizzes, and get structured exam-ready answers — all grounded in the context of your original material with zero hallucinations.

---

## ✨ Features
| Feature | Details |
| :--- | :--- |
| 🔍 **Semantic Search** | Queries embedded with `all-MiniLM-L6-v2` matched against document chunks in **Endee Vector DB**. |
| 🤖 **Gemini AI Reasoning** | Dynamic context injection into Gemini 2.5 for evidence-based ranking and explanations. |
| 📥 **Browser Upload** | Drag-and-drop PDF/DOCX indexing directly from the UI with real-time processing logs. |
| 📝 **Smart Quiz Engine** | Automatic generation of MCQ, Short Answer, and Long Answer quizzes from study content. |
| 📖 **Exam Answer Gen** | Structured academic outputs (bullet points, introduction/conclusion) tailored for exam prep. |
| 🧠 **Local Embeddings** | Privacy-first vectorization using local HuggingFace models — no data leakage, no cost. |
| 🎨 **Professional UI** | Modern, dark-mode React interface with micro-animations and intuitive navigation. |

---

## 🏗️ Architecture
```text
┌─────────────────────────────────────────────────────────────┐
│                      React 18 Dashboard UI                  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────┐  │
│  │  Upload  │  │   Chat   │  │    Quiz     │  │  Answers │  │
│  └──────────┘  └────┬─────┘  └─────┬───────┘  └──────────┘  │
└─────────────────────│──────────────│────────────────────────┘
                      │              │
             ┌────────▼──────────────▼──────────────┐
             │            llmService.js             │
             │       (RAG pipeline & prompts)       │
             └────────────────┬─────────────────────┘
                              │  embed query
             ┌────────────────▼─────────────────────┐
             │       Endee Vector DB (local)        │
             │  collection: "documents"             │
             │  metric: cosine similarity           │
             │  dim: 384 (all-MiniLM-L6-v2)         │
             └────────────────┬─────────────────────┘
                              │  top-k context
             ┌────────────────▼─────────────────────┐
             │          Google Gemini API           │
             │  model: gemini-2.5-flash             │
             │  mode: context-grounded              │
             └──────────────────────────────────────┘
```

### Document Ingestion Pipeline
**PDF / DOCX file**
       │
       ▼
**extractText()**          ← `pdf-parse` (PDF) or `mammoth` (DOCX)
       │
       ▼
**chunkText()**            ← Recursive character splitting with overlap
       │
       ▼
**SentenceTransformer**    ← `all-MiniLM-L6-v2` (384-dim, local, free)
       │
       ▼
**EndeeDB.insert()**       ← metadata = {documentName, chunkIndex, id}

---

## 📁 Project Structure
```text
ai-study-assistant/
│
├── client/                     # 🏠 React + Vite UI
│   ├── src/
│   │   ├── pages/              # Upload, Chat, Quiz, Answer pages
│   │   ├── utils/              # API interceptors (Axios)
│   │   └── App.jsx             # Main routing & state
│   └── dist/                   # Production build (served by backend)
│
├── server/                     # 🚀 Node.js + Express Backend
│   ├── routes/                 # API multi-page routing
│   │   ├── upload.js           # File parse → embed → vector DB
│   │   ├── chat.js             # Semantic search + Gemini ranking
│   │   └── quiz.js / answer.js # Specialized AI generation
│   ├── services/
│   │   ├── llmService.js       # Core logic (RAG pipeline) 
│   │   ├── endeeService.js     # Endee DB init & query wrappers
│   │   └── embeddingService.js # Local model load & vector generation
│   ├── endee-db/               # Persistent Vector Store (auto-created)
│   ├── uploads/                # Temporary file buffer
│   └── package.json            # Backend dependencies
│
├── README.md                   # Documentation
└── .gitignore                  # Source control protection
```

---

## ⚡ Quickstart

### Prerequisites
- **Node.js 18+** installed.
- A **Google Gemini API Key** → [aistudio.google.com](https://aistudio.google.com/apikey)

### 1 — Clone & Global Setup
```bash
git clone https://github.com/yourname/ai-study-assistant.git
cd ai-study-assistant

# Sync and install all dependencies (Unified command)
npm run setup
```

### 2 — Configure API Key
Navigate to the `server/` directory and create a `.env` file:
```env
# server/.env
PORT=5000
GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
ENDEE_DB_PATH=./endee-db
```

### 3 — Launch the Application
**Option A: Unified Single-Host Mode (Recommended)**
This builds the frontend and runs everything on a single port.
```bash
cd client && npm run build
cd ../server && npm start
```
Open **[http://localhost:5000](http://localhost:5000)** 🎉

**Option B: Developer Mode (Split Terminal)**
- Terminal 1: `cd server && npm run dev`
- Terminal 2: `cd client && npm run dev`

---

## 🗄️ Endee Vector DB Integration
StudySense AI uses **Endee** as a high-performance local persistent vector database.

### Collection Schema
- **Collection Name**: `documents`
- **Distance Metric**: `cosine`
- **Embedding Dimension**: `384` (`all-MiniLM-L6-v2`)

### Metadata Schema
| Field | Value |
| :--- | :--- |
| `documentName` | Name of the source file (e.g., "Biology_Notes.pdf") |
| `chunkIndex` | Position of the text fragment within the document |
| `id` | Unique UUID for the vector record |

### How Retrieval Works
1. Query vectorization via `@xenova/transformers` (running on CPU).
2. Endee performs **semantic similarity search** on the local index.
3. Top-K relevant text chunks are extracted and formatted into a context block.
4. The system automatically handles **model fallback** (Gemini 2.5 Flash → Lite) if quota limits are reached.

---

## 🖥️ Pages Reference
- **🏠 Dashboard**: System health tracking for Endee DB and Gemini connectivity.
- **📂 Upload**: Immediate file parsing with real-time status notifications.
- **💬 Chat**: Full-context AI assistant with document highlighting.
- **📝 Quiz**: Custom exam generator (MCQ, Short, Long) with instant grading.
- **📖 Answers**: Topic-specific structured response generator for exam preparation.

---

## 🛠️ CLI Reference
```bash
# Verify Gemini Connection
cd server && node test_gemini.js

# List Available Models (via REST API)
cd server && node check_models.js

# Clean Start (optional)
# Delete server/endee-db directory to reset all vectors
```

---

## ⚖️ Configuration Reference
All values should be configured in `server/.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | (required) | Google AI Studio Key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary reasoning model |
| `PORT` | `5000` | Local server port |
| `ENDEE_DB_PATH` | `./endee-db` | Directory for vector store persistence |
| `MAX_CHUNK_SIZE` | `800` | Maximum characters per document fragment |
| `CHUNK_OVERLAP` | `100` | Character overlap between adjacent chunks |
| `TOP_K_RESULTS` | `5` | Relevant chunks retrieved per query |

---

## 🗺️ Roadmap
- [ ] **Multi-Document Support**: Query across multiple files simultaneously.
- [ ] **PDF Export**: Save your AI-generated quizzes and exam responses as styled PDFs.
- [ ] **Flashcard Integration**: One-click export of study notes to Anki/Quizlet.
- [ ] **Image-to-Context**: Reasoning across diagrams and charts using Gemini Vision.

---

<p align="center">Made with ❤️ for the Endee Internship Evaluation · Built within 24 Hours</p>
