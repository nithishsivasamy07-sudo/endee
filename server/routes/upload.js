/**
 * Upload Route
 * POST /api/upload - Upload and process a document
 * GET /api/documents - List all uploaded documents
 * DELETE /api/documents/:id - Delete a document
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { extractText, chunkText, estimateTokens } from "../utils/documentProcessor.js";
import { embedBatch } from "../services/embeddingService.js";
import { getEndeeDB } from "../services/endeeService.js";

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "./uploads";
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
  ];
  const allowedExts = [".pdf", ".txt", ".docx", ".md"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported file type. Please upload PDF, TXT, DOCX, or MD files."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * POST /api/upload
 * Upload a document and process it into the Endee vector store
 */
router.post("/", upload.single("file"), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileInfo = {
    id: uuidv4(),
    originalName: req.file.originalname,
    fileName: req.file.filename,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
  };

  try {
    // Step 1: Extract text from document
    console.log(`[Upload] Processing: ${fileInfo.originalName}`);
    res.writeHead && console.log("[Upload] Step 1: Extracting text...");

    const text = await extractText(fileInfo.filePath, fileInfo.mimeType);
    console.log(`[Upload] Extracted ${text.length} characters`);

    // Step 2: Chunk the text
    console.log("[Upload] Step 2: Chunking text...");
    const chunks = chunkText(text);
    console.log(`[Upload] Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings for all chunks
    console.log("[Upload] Step 3: Generating embeddings...");
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(chunkTexts);
    console.log(`[Upload] Generated ${embeddings.length} embeddings`);

    // Step 4: Store in Endee vector database
    console.log("[Upload] Step 4: Storing in Endee vector database...");
    const db = await getEndeeDB();
    const collection = db.collection("documents");

    const docsToStore = chunks.map((chunk, i) => ({
      id: `${fileInfo.id}-chunk-${i}`,
      embedding: embeddings[i],
      text: chunk.text,
      metadata: {
        documentId: fileInfo.id,
        documentName: fileInfo.originalName,
        chunkIndex: chunk.index,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        wordCount: chunk.wordCount,
        estimatedTokens: estimateTokens(chunk.text),
        uploadedAt: fileInfo.uploadedAt,
      },
    }));

    await collection.addMany(docsToStore);

    // Step 5: Save document metadata
    const metaCollection = db.collection("document_meta");
    await metaCollection.add({
      id: fileInfo.id,
      embedding: embeddings[0], // Use first chunk embedding as doc representation
      text: text.slice(0, 500), // First 500 chars as preview
      metadata: {
        ...fileInfo,
        chunkCount: chunks.length,
        totalChars: text.length,
        estimatedTokens: estimateTokens(text),
        processingTimeMs: Date.now() - startTime,
      },
    });

    const processingTime = Date.now() - startTime;
    console.log(`[Upload] Done! Processing took ${processingTime}ms`);

    res.json({
      success: true,
      document: {
        id: fileInfo.id,
        name: fileInfo.originalName,
        size: fileInfo.size,
        chunkCount: chunks.length,
        totalChars: text.length,
        estimatedTokens: estimateTokens(text),
        processingTimeMs: processingTime,
        uploadedAt: fileInfo.uploadedAt,
      },
    });
  } catch (error) {
    console.error("[Upload] Error:", error);

    // Clean up uploaded file on error
    try {
      await fs.unlink(fileInfo.filePath);
    } catch {}

    res.status(500).json({
      error: error.message || "Failed to process document",
      details:
        process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/documents
 * List all uploaded documents
 */
router.get("/documents", async (req, res) => {
  try {
    const db = await getEndeeDB();
    const metaCollection = db.collection("document_meta");
    const docs = metaCollection.list();

    const documents = docs.map((doc) => ({
      id: doc.id,
      name: doc.metadata.originalName,
      size: doc.metadata.size,
      chunkCount: doc.metadata.chunkCount,
      totalChars: doc.metadata.totalChars,
      uploadedAt: doc.metadata.uploadedAt,
      processingTimeMs: doc.metadata.processingTimeMs,
    }));

    // Sort by upload date, newest first
    documents.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ documents });
  } catch (error) {
    console.error("[Documents] Error:", error);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document and all its chunks from Endee
 */
router.delete("/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getEndeeDB();

    // Remove all chunks for this document
    const docCollection = db.collection("documents");
    const deleted = await docCollection.deleteWhere({ documentId: id });

    // Remove document metadata
    const metaCollection = db.collection("document_meta");
    await metaCollection.delete(id);

    res.json({
      success: true,
      message: `Document deleted. Removed ${deleted} chunks from vector store.`,
    });
  } catch (error) {
    console.error("[Delete] Error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
