# 🎓 AI Study Assistant: Intelligence for Your Learning

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Endee](https://img.shields.io/badge/Endee_DB-Vector_Storage-orange?style=for-the-badge)](https://github.com/endee-io/endee)

**AI Study Assistant** is a cutting-edge, privacy-focused educational tool designed to help students and researchers interact with their documents like never before. Leveraging **Retrieval-Augmented Generation (RAG)**, it allows you to chat with your PDFs, generate instant quizzes, and get deep insights—all powered by local embeddings and high-performance vector search.

---

## ✨ Key Features

- 📑 **Smart PDF Processing**: Upload complex documents and let the AI extract, chunk, and embed them automatically.
- 💬 **Contextual Chat (RAG)**: Ask questions about your study materials and get answers strictly grounded in your specific documents.
- 📝 **AI Quiz Generation**: Effortlessly generate multiple-choice questions (MCQs) from any part of your text to test your knowledge.
- 🧠 **Hybrid LLM Support**: Use **Ollama** for 100% local privacy or **Google Gemini** for state-of-the-art reasoning.
- ⚡ **High-Performance Vector Search**: Powered by **Endee**, a C++ optimized vector database for instant document retrieval.
- 🎨 **Modern Dark UI**: A sleek, premium dashboard built with React and Tailwind CSS for a distraction-free study experience.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) (Optional, if using local LLM)

### 1. Installation & Setup
Clone the repository and run the automated setup script to install dependencies for both client and server:

```bash
npm run setup
```

### 2. Configure Environment
Create or edit `server/.env`:

```env
PORT=5000
LLM_PROVIDER=gemini # Choose 'gemini' or 'ollama'
GEMINI_API_KEY=your_api_key_here
OLLAMA_MODEL=llama3.2
ENDEE_DB_PATH=./endee-db
```

### 3. Launch the Application

Open two terminal windows/tabs:

**Start the Backend:**
```bash
npm run dev:server
```

**Start the Frontend:**
```bash
npm run dev:client
```

Visit `http://localhost:5173` to start studying!

---

## 📖 How It Works: The RAG Pipeline

1. **Ingestion**: Documents are split into semantic chunks.
2. **Embedding**: Each chunk is transformed into a 384-dimensional vector using the `Xenova/all-MiniLM-L6-v2` model (running locally).
3. **Storage**: Vectors are stored in a high-speed **Endee** collection.
4. **Retrieval**: When you ask a question, the system finds the most relevant document chunks based on semantic similarity.
5. **Generation**: The context is fed to the LLM (Gemini/Ollama) to generate a precise response.

---

## 🛠️ Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Blazing fast development and optimized production build. |
| **Styling** | Tailwind CSS | Utility-first CSS for a custom, premium aesthetic. |
| **Backend** | Express (Node.js) | Robust API handling and service coordination. |
| **Vector DB** | Endee | High-performance C++ vector engine. |
| **LLM** | Gemini / Ollama | Flexible choice between local-first and API-powered AI. |
| **Embeddings** | HuggingFace | Local execution of transformer models for data privacy. |

---

## 📂 Project Structure

```text
├── client/           # React frontend application (Vite)
├── server/           # Node.js backend & API services
│   ├── routes/       # API endpoint definitions
│   ├── services/     # core logic: embedding, LLM, DB
│   └── uploads/      # Temporary storage for processed PDFs
├── docs/             # Technical documentation
└── package.json      # Workspace orchestration
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **Apache License 2.0**. See `LICENSE` for more information.

---

<p align="center">Built with ❤️ for learners everywhere.</p>

