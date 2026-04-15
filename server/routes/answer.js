/**
 * Answer Generation Route
 * POST /api/generate-answer
 */

import express from "express";
import { embedText } from "../services/embeddingService.js";
import { getEndeeDB } from "../services/endeeService.js";
import { generateAnswer } from "../services/llmService.js";

const router = express.Router();

/**
 * POST /api/generate-answer
 * Generate a structured answer for exam preparation
 * 
 * Body:
 * - question: string
 * - answerType: "bullet" | "paragraph" | "exam"
 * - documentId: string (optional)
 */
router.post("/", async (req, res) => {
  const { question, answerType = "exam", documentId } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: "Question cannot be empty" });
  }

  if (!["bullet", "paragraph", "exam"].includes(answerType)) {
    return res.status(400).json({
      error: "Invalid answerType. Must be 'bullet', 'paragraph', or 'exam'",
    });
  }

  const startTime = Date.now();

  try {
    const db = await getEndeeDB();
    const collection = db.collection("documents");

    if (collection.count() === 0) {
      return res.status(400).json({
        error: "No documents found. Please upload study material first.",
      });
    }

    // Embed the question and search for relevant context
    const questionEmbedding = await embedText(question);
    const filter = documentId ? { documentId } : null;
    const relevantChunks = await collection.search(questionEmbedding, 6, filter);

    if (relevantChunks.length === 0) {
      return res.status(400).json({
        error: "No relevant content found for this question.",
      });
    }

    console.log(
      `[Answer] Generating ${answerType} answer for: "${question.slice(0, 60)}..."`
    );

    // Generate structured answer
    const answer = await generateAnswer(question, relevantChunks, answerType);

    res.json({
      success: true,
      question,
      answerType,
      answer,
      sources: relevantChunks.slice(0, 4).map((c) => ({
        documentName: c.metadata?.documentName || "Document",
        chunkIndex: c.metadata?.chunkIndex,
        score: Math.round((c.score || 0) * 100) / 100,
        preview: (c.text || "").slice(0, 150) + "...",
      })),
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Answer] Error:", error);

    if (error.message.includes("Ollama")) {
      return res.status(503).json({
        error: error.message,
        hint: "Make sure Ollama is running: ollama serve",
      });
    }

    res.status(500).json({
      error: error.message || "Failed to generate answer",
    });
  }
});

export default router;
