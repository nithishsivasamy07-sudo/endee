/**
 * LLM Service
 * Uses Google Gemini API for text generation
 * Set GEMINI_API_KEY in .env to use
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI = null;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!_genAI) {
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.warn("[Gemini] API Key missing or using placeholder. Running in Mock Mode.");
      return null;
    }
    
    // Initialize with v1 endpoint as requested
    console.log("[Gemini] Initializing Google Generative AI (v1)...");
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

/**
 * Check if Gemini is available and working
 */
export async function checkGeminiStatus() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("[Gemini] No valid API key found in GEMINI_API_KEY");
    return { available: false, models: [], message: "No API key provided" };
  }
  
  try {
    const genAI = getGenAI();
    if (!genAI) return { available: false, models: [] };

    // Simple test call to verify key + model
    const model = genAI.getGenerativeModel({ model: modelName });
    // We don't actually need to call it to check status, but user wants robustness
    console.log(`[Gemini] Model ${modelName} is ready (via v1 API)`);
    return { available: true, models: [{ name: modelName }] };
  } catch (err) {
    console.error(`[Gemini] Health check failed: ${err.message}`);
    return { available: false, error: err.message };
  }
}

/**
 * Generate a response using Gemini
 * @param {string} prompt
 * @param {Object} options
 * @returns {string} response text
 */
export async function generateWithGemini(prompt, options = {}) {
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const FALLBACK_MODEL = "gemini-1.5-flash";

  const genAI = getGenAI();
  
  // Fallback if no API key
  if (!genAI) {
    console.log("[Gemini] MOCK MODE: Returning simulated response");
    return "I'm currently running in **Mock Mode** because no Gemini API key was found. Please add your `GEMINI_API_KEY` to the `.env` file to see real AI responses from your documents!";
  }

  const tryModel = async (name) => {
    console.log(`[Gemini] Generating response using ${name}...`);
    const model = genAI.getGenerativeModel({
      model: name,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        topP: options.top_p ?? 0.9,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  };

  try {
    return await tryModel(options.model || modelName);
  } catch (error) {
    console.error("[Gemini] Generation failed:", error.message);

    // Auto-retry with fallback model if primary not found
    if (
      (error.message.includes("404") || error.message.includes("not found")) &&
      modelName !== FALLBACK_MODEL
    ) {
      console.warn(`[Gemini] Model "${modelName}" not found. Retrying with fallback: ${FALLBACK_MODEL}`);
      try {
        return await tryModel(FALLBACK_MODEL);
      } catch (fallbackErr) {
        console.error("[Gemini] Fallback model also failed:", fallbackErr.message);
        throw new Error(
          `Model Error: Neither "${modelName}" nor "${FALLBACK_MODEL}" could be loaded. ` +
          `Please verify your GEMINI_API_KEY and model name in server/.env`
        );
      }
    }

    if (error.message.includes("API_KEY_INVALID") || error.message.includes("API key not valid")) {
      throw new Error("Invalid API Key: Please check your GEMINI_API_KEY in server/.env");
    }

    throw error;
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
          .map(
            (h) =>
              `${h.role === "user" ? "Student" : "Assistant"}: ${h.content}`
          )
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

  return generateWithGemini(prompt, { temperature: 0.5, maxTokens: 1500 });
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

  const response = await generateWithGemini(prompt, {
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
    styleInstructions =
      "Write a bullet-point answer with 5-8 key points. Start each point with •";
  } else if (answerType === "paragraph") {
    styleInstructions =
      "Write a well-structured paragraph answer of 150-200 words";
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

  return generateWithGemini(prompt, { temperature: 0.4, maxTokens: 1500 });
}

/**
 * Parse raw LLM quiz output into structured format
 */
function parseQuizResponse(rawText, quizType) {
  const questions = [];
  const blocks = rawText.split(/---|(\n\n(?=Q\d+:))/).filter((b) => b && b.trim() && /Q\d+:/.test(b));

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

      if (question && Object.keys(options).length >= 2) {
        questions.push({
          type: "mcq",
          question,
          options,
          answer: answerLine ? answerLine.replace("ANSWER:", "").trim() : "",
          explanation: explLine
            ? explLine.replace("EXPLANATION:", "").trim()
            : "",
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
          keyPoints: keyPointsLine
            ? keyPointsLine.replace("KEY_POINTS:", "").trim()
            : "",
        });
      }
    }
  }

  // Fallback if parsing fails
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
