import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../server/.env") });

async function listAllModels() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Using key:", key.slice(0, 10) + "...");
  
  // Try v1 first
  try {
    console.log("\n--- Checking v1 ---");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      console.log("v1 models:", data.models.map(m => m.name));
    } else {
      console.log("v1 response:", data);
    }
  } catch (e) {
    console.error("v1 error:", e.message);
  }

  // Try v1beta
  try {
    console.log("\n--- Checking v1beta ---");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      console.log("v1beta models:", data.models.map(m => m.name));
    } else {
      console.log("v1beta response:", data);
    }
  } catch (e) {
    console.error("v1beta error:", e.message);
  }
}

listAllModels();
