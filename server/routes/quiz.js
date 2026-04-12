/**
 * Quiz Generation Route
 * POST /api/generate-quiz
 */

import express from "express";
import { embedText } from "../services/embeddingService.js";
import { getEndeeDB } from "../services/endeeService.js";
import { generateQuiz } from "../services/llmService.js";

const router = express.Router();

/**
 * POST /api/generate-quiz
 * Generate quiz questions from document content
 * 
 * Body:
 * - topic: string (optional, specific topic to focus on)
 * - quizType: "mcq" | "short" | "long"
 * - count: number (1-10)
 * - documentId: string (optional, filter by document)
 */
router.post("/", async (req, res) => {
  const {
    topic,
    quizType = "mcq",
    count = 5,
    documentId,
  } = req.body;

  if (!["mcq", "short", "long"].includes(quizType)) {
    return res.status(400).json({
      error: "Invalid quizType. Must be 'mcq', 'short', or 'long'",
    });
  }

  const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 10);
  const startTime = Date.now();

  try {
    const db = await getEndeeDB();
    const collection = db.collection("documents");

    // Check if there are any documents
    const totalDocs = collection.count();
    if (totalDocs === 0) {
      return res.status(400).json({
        error: "No documents found. Please upload study material first.",
      });
    }

    // Get relevant chunks based on topic or random sample
    let contextChunks;
    if (topic && topic.trim()) {
      console.log(`[Quiz] Searching for topic: "${topic}"`);
      const topicEmbedding = await embedText(topic);
      const filter = documentId ? { documentId } : null;
      contextChunks = await collection.search(topicEmbedding, 8, filter);
    } else {
      // Get a broad sample of chunks from the document
      const allChunks = collection.list(documentId ? { documentId } : null);
      // Shuffle and take a sample
      const shuffled = allChunks.sort(() => Math.random() - 0.5);
      contextChunks = shuffled.slice(0, 8);
    }

    if (contextChunks.length === 0) {
      return res.status(400).json({
        error: "No relevant content found. Try a different topic or document.",
      });
    }

    console.log(
      `[Quiz] Generating ${questionCount} ${quizType} questions from ${contextChunks.length} chunks`
    );

    // Generate questions using LLM
    const questions = await generateQuiz(contextChunks, quizType, questionCount);

    res.json({
      success: true,
      quizType,
      topic: topic || "General",
      questions,
      questionCount: questions.length,
      sources: contextChunks.slice(0, 3).map((c) => ({
        documentName: c.metadata?.documentName || "Document",
        preview: (c.text || "").slice(0, 100) + "...",
      })),
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Quiz] Error:", error);

    if (error.message.includes("Gemini") || error.message.includes("API Key") || error.message.includes("Model")) {
      return res.status(503).json({
        error: error.message,
        hint: "Check your Gemini API key and model name in server/.env. Get a key at https://aistudio.google.com/apikey",
      });
    }

    res.status(500).json({
      error: error.message || "Failed to generate quiz",
    });
  }
});

export default router;
