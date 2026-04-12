/**
 * Lists available Gemini models via the REST API
 * (genAI.listModels() does not exist in @google/generative-ai SDK — use REST instead)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ No GEMINI_API_KEY found in .env");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log("📋 Fetching available Gemini models...\n");

  const data = await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error("Failed to parse response")); }
      });
    }).on("error", reject);
  });

  if (data.error) {
    console.error("❌ API Error:", data.error.message);
    if (data.error.code === 400 || data.error.code === 401) {
      console.error("   Your API key may be invalid. Get a new one: https://aistudio.google.com/apikey");
    }
    return;
  }

  const models = (data.models || []).filter(m =>
    m.supportedGenerationMethods?.includes("generateContent")
  );

  console.log(`Found ${models.length} models supporting generateContent:\n`);
  for (const m of models) {
    console.log(`  ✅ ${m.name.replace("models/", "")}`);
  }

  console.log("\n💡 Set the model in server/.env:");
  console.log("   GEMINI_MODEL=gemini-2.0-flash");
}

listModels().catch(console.error);
