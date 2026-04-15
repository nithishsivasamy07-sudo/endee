/**
 * Chat Route
 * POST /api/chat - RAG-based question answering
 * GET /api/chat/history - Get chat history
 * DELETE /api/chat/history - Clear chat history
 */

import express from "express";
import { embedText } from "../services/embeddingService.js";
import { getEndeeDB } from "../services/endeeService.js";
import { ragChat } from "../services/llmService.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// In-memory chat history (in production, use a database)
const chatSessions = new Map();

/**
 * POST /api/chat
 * RAG-powered chat endpoint
 * 
 * Flow:
 * 1. Embed the user's query
 * 2. Search Endee for semantically similar chunks
 * 3. Build context from top-k results
 * 4. Generate answer using LLM + context
 * 5. Return answer with source citations
 */
router.post("/", async (req, res) => {
  const { query, sessionId, documentId, topK = 5 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: "Query cannot be empty" });
  }

  const session = sessionId || uuidv4();
  const startTime = Date.now();

  try {
    // Step 1: Embed the query
    console.log(`[Chat] Query: "${query.slice(0, 80)}..."`);
    const queryEmbedding = await embedText(query);

    // Step 2: Search Endee vector database for relevant chunks
    const db = await getEndeeDB();
    const collection = db.collection("documents");

    const searchFilter = documentId ? { documentId } : null;
    const relevantChunks = await collection.search(
      queryEmbedding,
      parseInt(topK),
      searchFilter
    );

    if (relevantChunks.length === 0) {
      return res.json({
        answer:
          "I couldn't find relevant information in your uploaded documents. Please make sure you've uploaded study material first.",
        sources: [],
        sessionId: session,
        noContext: true,
      });
    }

    console.log(`[Chat] Retrieved ${relevantChunks.length} relevant chunks`);

    // Step 3: Get chat history for context
    const history = chatSessions.get(session) || [];

    // Step 4: Generate RAG response
    const answer = await ragChat(query, relevantChunks, history);

    // Step 5: Save to chat history
    const userMessage = {
      id: uuidv4(),
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };
    const assistantMessage = {
      id: uuidv4(),
      role: "assistant",
      content: answer,
      timestamp: new Date().toISOString(),
      sources: relevantChunks.map((c) => ({
        documentName: c.metadata.documentName,
        chunkIndex: c.metadata.chunkIndex,
        score: Math.round(c.score * 100) / 100,
        preview: c.text.slice(0, 150) + "...",
      })),
    };

    history.push(userMessage, assistantMessage);

    // Keep only last 20 messages to prevent memory bloat
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    chatSessions.set(session, history);

    res.json({
      answer,
      sources: assistantMessage.sources,
      sessionId: session,
      processingTimeMs: Date.now() - startTime,
      chunksRetrieved: relevantChunks.length,
    });
  } catch (error) {
    console.error("[Chat] Error:", error);

    if (error.message.includes("Ollama")) {
      return res.status(503).json({
        error: error.message,
        hint: "Make sure Ollama is running: ollama serve",
      });
    }

    res.status(500).json({
      error: error.message || "Failed to generate response",
    });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const history = chatSessions.get(sessionId) || [];
  res.json({ sessionId, messages: history });
});

/**
 * DELETE /api/chat/history/:sessionId
 * Clear chat history for a session
 */
router.delete("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  chatSessions.delete(sessionId);
  res.json({ success: true, message: "Chat history cleared" });
});

export default router;
