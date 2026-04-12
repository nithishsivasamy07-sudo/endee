import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, ".env") });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    console.error("❌ No GEMINI_API_KEY found in .env");
    console.error("   Get a free key at: https://aistudio.google.com/apikey");
    return;
  }

  console.log(`\n🧪 Testing Gemini API`);
  console.log(`   API Key: ${apiKey.slice(0, 10)}...`);
  console.log(`   Model:   ${modelName}\n`);

  // NOTE: genAI.listModels() does NOT exist in @google/generative-ai SDK v0.24.
  // To list available models via REST, run:
  //   curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("Gemini Response:", response.text());
    console.log("✅ Success! Your API key and model are working correctly.");
  } catch (error) {
    console.error("❌ Gemini Connection Failed:", error.message);

    if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
      console.error("\nTIP: Your API key is invalid or expired.");
      console.error("     Get a fresh key at: https://aistudio.google.com/apikey");
      console.error("     Then update GEMINI_API_KEY in server/.env");
    } else if (error.message.includes("404") || error.message.includes("not found")) {
      console.error(`\nTIP: Model "${modelName}" was not found for this API key.`);
      console.error("     Try: GEMINI_MODEL=gemini-2.0-flash or GEMINI_MODEL=gemini-2.0-flash-lite");
    } else if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
      console.error("\nTIP: API quota exceeded. Your current key is exhausted.");
      console.error("     Generate a new key at: https://aistudio.google.com/apikey");
      console.error("     Then update GEMINI_API_KEY in server/.env");
    }
  }
}

testGemini();
