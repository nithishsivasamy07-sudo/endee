/**
 * Embedding Service
 * Uses @xenova/transformers for FREE local HuggingFace embeddings
 * Model: Xenova/all-MiniLM-L6-v2 (384-dimensional embeddings)
 * No API key required - runs entirely locally
 */

import { pipeline } from "@xenova/transformers";

let _embedder = null;
let _isLoading = false;
let _loadPromise = null;

/**
 * Initialize the embedding model (lazy load)
 * Downloads model on first use, then caches in memory
 */
async function getEmbedder() {
  if (_embedder) return _embedder;

  if (_isLoading) {
    return _loadPromise;
  }

  _isLoading = true;
  console.log("[Embeddings] Loading model: Xenova/all-MiniLM-L6-v2...");

  _loadPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true, // Use quantized model for faster loading
  }).then((model) => {
    _embedder = model;
    _isLoading = false;
    console.log("[Embeddings] Model loaded successfully (384 dimensions)");
    return model;
  });

  return _loadPromise;
}

/**
 * Generate embedding for a single text
 * @param {string} text
 * @returns {number[]} 384-dimensional embedding vector
 */
export async function embedText(text) {
  try {
    const embedder = await getEmbedder();
    const output = await embedder(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  } catch (error) {
    throw new Error(`[Embeddings] Failed to embed text: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts
 * @returns {number[][]} Array of embedding vectors
 */
export async function embedBatch(texts) {
  try {
    const embedder = await getEmbedder();
    const embeddings = [];

    // Process in batches of 32 to avoid memory issues
    const BATCH_SIZE = 32;
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          const output = await embedder(text, {
            pooling: "mean",
            normalize: true,
          });
          return Array.from(output.data);
        })
      );
      embeddings.push(...batchEmbeddings);
      console.log(
        `[Embeddings] Processed ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}`
      );
    }

    return embeddings;
  } catch (error) {
    throw new Error(`[Embeddings] Batch embedding failed: ${error.message}`);
  }
}

/**
 * Warm up the model on server start
 */
export async function warmupEmbedder() {
  try {
    await getEmbedder();
    await embedText("warmup");
    console.log("[Embeddings] Warmup complete");
  } catch (error) {
    console.warn("[Embeddings] Warmup failed (non-fatal):", error.message);
  }
}
