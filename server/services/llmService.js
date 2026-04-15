/**
 * LLM Service
 * Supports Ollama (local) and Google Gemini (cloud)
 */

import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Cache for genAI instance
let _genAI = null;

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

/**
 * Check if the configured LLM is available
 */
export async function checkLLM() {
  const provider = process.env.LLM_PROVIDER || "ollama";
  const key = process.env.GEMINI_API_KEY;

  if (provider === "gemini") {
    if (!key) {
      return { available: false, provider: "gemini", error: "Gemini API key is missing in .env" };
    }
    
    try {
      const genAI = getGenAI();
      const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro", "gemini-flash-latest"];
      let lastError = null;
      
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 }
          });
          return { available: true, provider: "gemini", model: modelName };
        } catch (e) {
          lastError = e;
          if (e.message.includes("404")) continue;
          if (e.message.includes("429")) {
            console.warn(`[Gemini Health] Quota exceeded for ${modelName}`);
            continue;
          }
          break;
        }
      }
      
      throw lastError || new Error("No working Gemini models found");
    } catch (error) {
      console.error("[Gemini Health Check] Failed:", error.message);
      return { 
        available: false, 
        provider: "gemini", 
        error: `Gemini API Error: ${error.message}` 
      };
    }
  }

  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await axios.get(`${baseUrl}/api/tags`, {
      timeout: 3000,
    });
    const models = response.data.models || [];
    return { available: true, provider: "ollama", models };
  } catch (error) {
    return { available: false, provider: "ollama", error: error.message };
  }
}

/**
 * Generate a response using Gemini with SDK
 */
async function generateWithGemini(prompt, options = {}) {
  const genAI = getGenAI();
  if (!genAI) throw new Error("Gemini API key not configured");
  
  const modelNameAlias = options.model || "gemini-1.5-flash";
  
  const MAX_RETRIES = 3;
  let lastError = null;

  // Try multiple models if one fails with 404 or 429 during generation
  const modelsToTry = [modelNameAlias, "gemini-2.0-flash", "gemini-pro", "gemini-flash-latest"];
  
  for (const currentModelName of modelsToTry) {
    const model = genAI.getGenerativeModel({ model: currentModelName });
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            topP: options.top_p || 0.9,
            maxOutputTokens: options.maxTokens || 2048,
          }
        });

        const response = await result.response;
        const text = response.text();
        
        if (text) return text;
        throw new Error("Empty response from Gemini");
      } catch (error) {
        lastError = error;
        const msg = error.message.toLowerCase();
        
        if (msg.includes("404")) {
          console.warn(`[Gemini] Model ${currentModelName} not found. Trying next available model...`);
          break; // Try next model in modelsToTry
        }

        if (msg.includes("429") || msg.includes("503") || msg.includes("overloaded") || msg.includes("rate limit")) {
          const waitTime = Math.pow(2, i) * 2000;
          console.warn(`[Gemini] Busy/Rate limited on ${currentModelName}. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(`[Gemini Error] ${error.message}`);
      }
    }
    // If we made it here without returning, we either broke on 404 or exhausted retries for this model
  }



  throw lastError;
}

/**
 * Generate a response from Ollama
 */
export async function generateWithOllama(prompt, options = {}) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const modelName = process.env.OLLAMA_MODEL || "llama3.2";
  
  try {
    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model: options.model || modelName,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.maxTokens || 1024,
        },
      },
      { timeout: 120000 }
    );

    return response.data.response || "";
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("Ollama is not running.");
    }
    throw new Error(`[Ollama] Generation failed: ${error.message}`);
  }
}

/**
 * Unified generate function
 */
export async function generate(prompt, options = {}) {
  const provider = process.env.LLM_PROVIDER || "ollama";
  const key = process.env.GEMINI_API_KEY;

  if (provider === "gemini" && key) {
    try {
      return await generateWithGemini(prompt, options);
    } catch (error) {
      console.error("[Gemini] Error:", error.message);
      throw error;
    }
  } else {
    return await generateWithOllama(prompt, options);
  }
}


/**
 * RAG-based chat response
 */
export async function ragChat(query, contextChunks, chatHistory = []) {
  const context = contextChunks
    .map((chunk, i) => `[Source ${i + 1}] ${chunk.text}`)
    .join("\n\n");

  const historyText =
    chatHistory.length > 0
      ? "Previous conversation:\n" +
        chatHistory
          .slice(-4)
          .map((h) => `${h.role === "user" ? "Student" : "Assistant"}: ${h.content}`)
          .join("\n") +
        "\n\n"
      : "";

  const prompt = `You are an expert AI Study Assistant helping a student understand their study material.

${historyText}Context from the student's documents:
${context}

Student's question: ${query}

Instructions:
- Answer based ONLY on the provided context
- Be clear, detailed, and educational
- Use examples when helpful
- If the context doesn't contain enough information, say so honestly
- Format your answer clearly with proper structure

Answer:`;

  return generate(prompt, { temperature: 0.5, maxTokens: 1500 });
}

/**
 * Generate quiz questions from context
 */
export async function generateQuiz(contextChunks, quizType, count = 5) {
  const context = contextChunks.map((c) => c.text).join("\n\n");

  let formatInstructions = "";
  if (quizType === "mcq") {
    formatInstructions = `Generate ${count} multiple choice questions. For each question use EXACTLY this format:

Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
ANSWER: [Correct letter]
EXPLANATION: [Brief explanation]

---`;
  } else if (quizType === "short") {
    formatInstructions = `Generate ${count} short answer questions. For each use EXACTLY this format:

Q1: [Question text]
ANSWER: [Concise answer in 2-3 sentences]

---`;
  } else if (quizType === "long") {
    formatInstructions = `Generate ${count} long answer/essay questions. For each use EXACTLY this format:

Q1: [Question text]
ANSWER: [Detailed answer in 4-6 sentences covering key points]
KEY_POINTS: [3-4 bullet points of key aspects]

---`;
  }

  const prompt = `You are an expert educator creating exam questions from study material.

Study Material:
${context}

Task: ${formatInstructions}

Generate exactly ${count} questions based on the study material above. Number them Q1, Q2, etc.`;

  const response = await generate(prompt, {
    temperature: 0.8,
    maxTokens: 2000,
  });

  return parseQuizResponse(response, quizType);
}

/**
 * Generate a structured answer for exam preparation
 */
export async function generateAnswer(query, contextChunks, answerType) {
  const context = contextChunks.map((c) => c.text).join("\n\n");

  let styleInstructions = "";
  if (answerType === "bullet") {
    styleInstructions = "Write a bullet-point answer with 5-8 key points. Start each point with •";
  } else if (answerType === "paragraph") {
    styleInstructions = "Write a well-structured paragraph answer of 150-200 words";
  } else if (answerType === "exam") {
    styleInstructions = `Write a complete exam-style answer with:
- Introduction (1-2 sentences)
- Main points (numbered, 3-5 points)
- Conclusion (1-2 sentences)
- Key terms highlighted with *asterisks*`;
  }

  const prompt = `You are an expert tutor preparing a student for exams.

Context from study material:
${context}

Question: ${query}

Answer style: ${styleInstructions}

Provide a comprehensive, accurate answer:`;

  return generate(prompt, { temperature: 0.4, maxTokens: 1500 });
}

/**
 * Parse raw LLM quiz output into structured format
 */
function parseQuizResponse(rawText, quizType) {
  const questions = [];
  const blocks = rawText.split(/---|\n\n(?=Q\d+:)/).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) continue;

    const questionLine = lines.find((l) => /^Q\d+:/.test(l));
    if (!questionLine) continue;

    const question = questionLine.replace(/^Q\d+:\s*/, "").trim();

    if (quizType === "mcq") {
      const options = {};
      for (const letter of ["A", "B", "C", "D"]) {
        const optLine = lines.find((l) => l.startsWith(`${letter})`));
        if (optLine) options[letter] = optLine.replace(`${letter})`, "").trim();
      }

      const answerLine = lines.find((l) => l.startsWith("ANSWER:"));
      const explLine = lines.find((l) => l.startsWith("EXPLANATION:"));

      if (question && Object.keys(options).length === 4) {
        questions.push({
          type: "mcq",
          question,
          options,
          answer: answerLine ? answerLine.replace("ANSWER:", "").trim() : "",
          explanation: explLine ? explLine.replace("EXPLANATION:", "").trim() : "",
        });
      }
    } else if (quizType === "short") {
      const answerLine = lines.find((l) => l.startsWith("ANSWER:"));
      if (question) {
        questions.push({
          type: "short",
          question,
          answer: answerLine ? answerLine.replace("ANSWER:", "").trim() : "",
        });
      }
    } else if (quizType === "long") {
      const answerLine = lines.find((l) => l.startsWith("ANSWER:"));
      const keyPointsLine = lines.find((l) => l.startsWith("KEY_POINTS:"));
      if (question) {
        questions.push({
          type: "long",
          question,
          answer: answerLine ? answerLine.replace("ANSWER:", "").trim() : "",
          keyPoints: keyPointsLine ? keyPointsLine.replace("KEY_POINTS:", "").trim() : "",
        });
      }
    }
  }

  if (questions.length === 0) {
    questions.push({
      type: quizType,
      question: "Generated content",
      answer: rawText,
      raw: true,
    });
  }

  return questions;
}

// Ensure backward compatibility if checkOllama was used elsewhere
export const checkOllama = checkLLM;
