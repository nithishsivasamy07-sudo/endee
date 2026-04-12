/**
 * Endee Vector Database Service
 * 
 * Endee is a lightweight, file-based vector database that supports:
 * - Storing high-dimensional embeddings with metadata
 * - Cosine similarity search
 * - Persistent storage to disk
 * 
 * GitHub: https://github.com/endee-io/endee
 * 
 * Since Endee is a lightweight local vector DB, we implement it
 * following its core API patterns with file-based persistence.
 */

import fs from "fs/promises";
import path from "path";

class EndeeVectorDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.indexFile = path.join(dbPath, "index.json");
    this.vectorsFile = path.join(dbPath, "vectors.json");
    this.collections = {};
    this.initialized = false;
  }

  /**
   * Initialize the Endee database
   * Creates necessary directories and loads existing data
   */
  async init() {
    try {
      await fs.mkdir(this.dbPath, { recursive: true });

      // Load existing index
      try {
        const indexData = await fs.readFile(this.indexFile, "utf-8");
        this.collections = JSON.parse(indexData);
      } catch {
        this.collections = {};
        await this._persist();
      }

      this.initialized = true;
      console.log(`[Endee] Database initialized at: ${this.dbPath}`);
      console.log(
        `[Endee] Collections loaded: ${Object.keys(this.collections).length}`
      );
    } catch (error) {
      throw new Error(`[Endee] Failed to initialize database: ${error.message}`);
    }
  }

  /**
   * Create or get a collection (namespace for documents)
   */
  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = {
        name,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return new EndeeCollection(name, this);
  }

  /**
   * List all collections
   */
  listCollections() {
    return Object.keys(this.collections);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name) {
    delete this.collections[name];
    await this._persist();
    console.log(`[Endee] Collection deleted: ${name}`);
  }

  /**
   * Get database stats
   */
  getStats() {
    const stats = {
      collections: Object.keys(this.collections).length,
      totalDocuments: 0,
    };
    for (const col of Object.values(this.collections)) {
      stats.totalDocuments += (col.documents || []).length;
    }
    return stats;
  }

  /**
   * Persist the database to disk
   */
  async _persist() {
    await fs.writeFile(
      this.indexFile,
      JSON.stringify(this.collections, null, 2),
      "utf-8"
    );
  }
}

class EndeeCollection {
  constructor(name, db) {
    this.name = name;
    this.db = db;
  }

  get _data() {
    return this.db.collections[this.name];
  }

  /**
   * Add a document with its embedding to the collection
   * @param {Object} doc - { id, embedding, text, metadata }
   */
  async add(doc) {
    if (!doc.id || !doc.embedding || !doc.text) {
      throw new Error("[Endee] Document must have id, embedding, and text");
    }

    const document = {
      id: doc.id,
      embedding: doc.embedding,
      text: doc.text,
      metadata: doc.metadata || {},
      createdAt: new Date().toISOString(),
    };

    // Check for duplicate id
    const existingIdx = this._data.documents.findIndex((d) => d.id === doc.id);
    if (existingIdx >= 0) {
      this._data.documents[existingIdx] = document;
    } else {
      this._data.documents.push(document);
    }

    this._data.updatedAt = new Date().toISOString();
    await this.db._persist();
    return document;
  }

  /**
   * Add multiple documents in batch
   */
  async addMany(docs) {
    for (const doc of docs) {
      const document = {
        id: doc.id,
        embedding: doc.embedding,
        text: doc.text,
        metadata: doc.metadata || {},
        createdAt: new Date().toISOString(),
      };

      const existingIdx = this._data.documents.findIndex(
        (d) => d.id === doc.id
      );
      if (existingIdx >= 0) {
        this._data.documents[existingIdx] = document;
      } else {
        this._data.documents.push(document);
      }
    }

    this._data.updatedAt = new Date().toISOString();
    await this.db._persist();
    console.log(`[Endee] Added ${docs.length} documents to "${this.name}"`);
  }

  /**
   * Perform cosine similarity search
   * @param {number[]} queryEmbedding - The query vector
   * @param {number} topK - Number of results to return
   * @param {Object} filter - Optional metadata filter
   * @returns {Array} - Sorted results with similarity scores
   */
  async search(queryEmbedding, topK = 5, filter = null) {
    if (!this._data || this._data.documents.length === 0) {
      return [];
    }

    let documents = this._data.documents;

    // Apply metadata filter if provided
    if (filter) {
      documents = documents.filter((doc) => {
        return Object.entries(filter).every(
          ([key, value]) => doc.metadata[key] === value
        );
      });
    }

    // Compute cosine similarity for each document
    const results = documents.map((doc) => ({
      ...doc,
      score: this._cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by descending similarity score
    results.sort((a, b) => b.score - a.score);

    // Return top-k results (without embedding to save bandwidth)
    return results.slice(0, topK).map((r) => ({
      id: r.id,
      text: r.text,
      metadata: r.metadata,
      score: r.score,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get a document by ID
   */
  async get(id) {
    const doc = this._data.documents.find((d) => d.id === id);
    if (!doc) return null;
    const { embedding, ...rest } = doc;
    return rest;
  }

  /**
   * Delete a document by ID
   */
  async delete(id) {
    const idx = this._data.documents.findIndex((d) => d.id === id);
    if (idx >= 0) {
      this._data.documents.splice(idx, 1);
      await this.db._persist();
      return true;
    }
    return false;
  }

  /**
   * Delete all documents in the collection matching a filter
   */
  async deleteWhere(filter) {
    const before = this._data.documents.length;
    this._data.documents = this._data.documents.filter((doc) => {
      return !Object.entries(filter).every(
        ([key, value]) => doc.metadata[key] === value
      );
    });
    const deleted = before - this._data.documents.length;
    await this.db._persist();
    console.log(`[Endee] Deleted ${deleted} documents from "${this.name}"`);
    return deleted;
  }

  /**
   * Count documents in collection
   */
  count(filter = null) {
    if (!this._data) return 0;
    if (!filter) return this._data.documents.length;
    return this._data.documents.filter((doc) =>
      Object.entries(filter).every(([k, v]) => doc.metadata[k] === v)
    ).length;
  }

  /**
   * List all documents metadata (no embeddings)
   */
  list(filter = null) {
    if (!this._data) return [];
    let docs = this._data.documents;
    if (filter) {
      docs = docs.filter((doc) =>
        Object.entries(filter).every(([k, v]) => doc.metadata[k] === v)
      );
    }
    return docs.map(({ embedding, ...rest }) => rest);
  }

  /**
   * Cosine similarity between two vectors
   * score = dot(a,b) / (|a| * |b|)
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// Singleton instance
let _dbInstance = null;

export async function getEndeeDB() {
  if (!_dbInstance) {
    const dbPath = process.env.ENDEE_DB_PATH || "./endee-db";
    _dbInstance = new EndeeVectorDB(dbPath);
    await _dbInstance.init();
  }
  return _dbInstance;
}

export { EndeeVectorDB, EndeeCollection };
