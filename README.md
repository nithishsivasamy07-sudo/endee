# 🎓 StudySense AI: Intelligent Study Assistant

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Endee VectorDB](https://img.shields.io/badge/Endee_VectorDB-8A2BE2?style=for-the-badge)](https://github.com/nithishsivasamy07-sudo/endee)

StudySense AI transforms static PDFs and DOCX files into dynamic, interactive learning environments. Using a sophisticated **RAG (Retrieval-Augmented Generation)** pipeline, it allows students to talk to their notes, generate exam-ready answers, and test themselves with AI-powered quizzes.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| 🧠 **Intelligent RAG** | Uses `all-MiniLM-L6-v2` for local embeddings and Gemini 1.5 for context-aware reasoning. |
| 📁 **Universal Upload** | Seamlessly parse and index PDF/DOCX files with real-time feedback. |
| 💬 **Semantic Chat** | Chat with your documents. No hallucinations, only evidence-based answers. |
| 📝 **Exam Generator** | Generate MCQ, Short, and Long answer quizzes tailored to your content. |
| 🎨 **Premium UI** | A sleek, dark-mode professional dashboard built with React and Tailwind CSS. |

---

## 🏗️ Project Architecture

StudySense AI operates on a modern full-stack architecture designed for performance and privacy.

```text
ai-study-assistant/
├── client/                 # 🏠 React Frontend (Vite)
│   ├── src/
│   │   ├── pages/          # Upload, Chat, Quiz, Answer views
│   │   ├── components/     # UI Building blocks (Sidebar, Status Dots)
│   │   └── App.jsx         # Routing and Main Layout
├── server/                 # 🚀 Node.js Backend (Express)
│   ├── routes/             # API Endpoints (Chat, Quiz, Upload)
│   ├── services/           # Core AI Logic (RAG, Embeddings, DB)
│   └── endee-db/           # Persistent local vector store
├── .gitattributes          # GitHub language & config
├── .gitignore              # Environment & Dependency protection
└── package.json            # Monorepo management scripts
```

### The RAG Pipeline
1. **Ingestion**: PDFs/DOCX are parsed and split into overlapping chunks to preserve context.
2. **Embedding**: Chunks are vectorized locally using `all-MiniLM-L6-v2`.
3. **Retrieval**: User queries are vectorized and matched against the **Endee Vector DB** using cosine similarity.
4. **Generation**: Top-K context chunks are injected into **Gemini 1.5 Flash** to generate grounded responses.

---

## 🛠️ Quick Start

### 1. Unified Setup
```bash
# Clone the repository
git clone https://github.com/your-username/ai-study-assistant.git
cd ai-study-assistant

# Install all dependencies (Root, Client, and Server)
npm install && npm run install-all
```

### 2. Configuration
Create a `.env` file in the `server/` directory:
```env
GEMINI_API_KEY=your_api_key_here
PORT=5000
ENDEE_DB_PATH=./endee-db
```

### 3. Run Development
```bash
# Start both client and server simultaneously
npm run dev
```
Visit http://localhost:5173 (Client) or http://localhost:5000 (Unified).

---

## 🗺️ Roadmap
- [ ] **Multi-Document Support**: Query across multiple files simultaneously.
- [ ] **PDF Export**: Save your AI-generated quizzes and exam responses as styled PDFs.
- [ ] **Flashcard Integration**: One-click export of study notes to Anki/Quizlet.
- [ ] **Image-to-Context**: Reasoning across diagrams and charts using Gemini Vision.

---

<p align="center">Made with ❤️ for the Endee Internship Evaluation · Built with React, Node, and Gemini AI</p>
