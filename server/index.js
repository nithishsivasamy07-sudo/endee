/**
 * AI Study Assistant - Main Server
 * 
 * Production-ready Express.js backend with:
 * - RAG pipeline (Retrieve → Augment → Generate)
 * - Endee vector database
 * - HuggingFace embeddings (local, free)
 * - Google Gemini LLM
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import quizRouter from "./routes/quiz.js";
import answerRouter from "./routes/answer.js";

// Import services for startup checks
import { getEndeeDB } from "./services/endeeService.js";
import { warmupEmbedder } from "./services/embeddingService.js";
import { checkOllama as checkGemini } from "./services/llmService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend static files
const clientPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientPath));

// ─── Request Logging ───────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────

app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/generate-quiz", quizRouter);
app.use("/api/generate-answer", answerRouter);

// Health check + system status
app.get("/api/health", async (req, res) => {
  try {
    const db = await getEndeeDB();
    const stats = db.getStats();
    const gemini = await checkGemini();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        server: "running",
        endeeDB: {
          status: "connected",
          path: process.env.ENDEE_DB_PATH || "./endee-db",
          ...stats,
        },
        gemini: {
          status: gemini.available ? "connected" : "disconnected",
          models: gemini.models.map((m) => m.name),
          activeModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          provider: "Google Gemini",
        },
        embeddings: {
          status: "ready",
          model: "Xenova/all-MiniLM-L6-v2",
          dimensions: 384,
          provider: "HuggingFace (local)",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// ─── Error Handler ─────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[Server Error]", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum size is 50MB." });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Catch-all route to serve the React app for any other request
app.use("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// ─── Server Startup ────────────────────────────────────────────────────────

async function startServer() {
  try {
    console.log("\n🚀 AI Study Assistant Server Starting...\n");

    // Initialize Endee vector database
    console.log("📦 Initializing Endee vector database...");
    const db = await getEndeeDB();
    const stats = db.getStats();
    console.log(
      `   ✅ Endee DB ready (${stats.collections} collections, ${stats.totalDocuments} vectors)\n`
    );

    // Warm up embedding model
    console.log("🧠 Loading HuggingFace embedding model...");
    console.log("   (First load downloads ~25MB model - please wait)\n");
    warmupEmbedder().catch((e) =>
      console.warn("   ⚠️  Embedding warmup failed (will retry on first use):", e.message)
    );

    // Check Gemini
    console.log("✨ Checking Gemini LLM...");
    const gemini = await checkGemini();
    if (!gemini.available) {
      console.log("   ⚠️  Gemini not connected. Add your GEMINI_API_KEY to server/.env");
      console.log("   Get a free key at: https://aistudio.google.com/apikey\n");
    } else {
      console.log(`   ✅ Gemini connected (model: ${gemini.models.map(m=>m.name).join(", ")})\n`);
    }

    app.listen(PORT, () => {
      console.log("─".repeat(50));
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log("─".repeat(50) + "\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
