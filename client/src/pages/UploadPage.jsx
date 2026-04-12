import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, Trash2, CheckCircle, AlertCircle,
  Clock, Database, ChevronRight, Loader2, File, FileType
} from "lucide-react";
import { uploadDocument, listDocuments, deleteDocument } from "../utils/api";

function FileIcon({ name }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  const colors = { pdf: "text-red-400", txt: "text-blue-400", docx: "text-indigo-400", md: "text-green-400" };
  return <FileType size={18} className={colors[ext] || "text-gray-400"} />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatTime(ms) {
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null); // {type, message, doc}
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const fileRef = useRef();

  const loadDocuments = useCallback(async () => {
    try {
      const res = await listDocuments();
      setDocuments(res.data.documents || []);
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const allowed = [".pdf", ".txt", ".docx", ".md"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setStatus({ type: "error", message: `Unsupported file type: ${ext}. Use PDF, TXT, DOCX, or MD.` });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus({ type: "error", message: "File too large. Max size is 50MB." });
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await uploadDocument(form, (p) => setProgress(p));
      const doc = res.data.document;
      setStatus({ type: "success", message: `Successfully processed "${doc.name}"`, doc });
      loadDocuments();
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [loadDocuments]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This will remove all its vectors from Endee DB.`)) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Document <span className="gradient-text">Upload</span>
        </h1>
        <p className="text-gray-400">
          Upload your study material. It will be chunked, embedded, and stored in Endee vector DB for RAG-powered Q&A.
        </p>
      </div>

      {/* Pipeline diagram */}
      <div className="glass-card p-4 mb-6 flex items-center gap-2 text-xs text-gray-500 overflow-x-auto">
        {["Upload File", "Extract Text", "Chunk (800 chars)", "Embed (384-dim)", "Store in Endee"].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-gray-300 font-medium">
              {step}
            </div>
            {i < arr.length - 1 && <ChevronRight size={14} className="text-brand-600" />}
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 mb-6
          ${dragging
            ? "border-brand-500 bg-brand-600/10 scale-[1.01]"
            : "border-white/10 hover:border-brand-600/40 hover:bg-surface-2"
          }
          ${uploading ? "pointer-events-none opacity-75" : ""}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.docx,.md"
          onChange={(e) => processFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="space-y-4">
            <Loader2 size={40} className="mx-auto text-brand-400 animate-spin" />
            <p className="text-gray-300 font-medium">Processing document...</p>
            <div className="max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading & embedding</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full progress-shimmer rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Generating embeddings with HuggingFace MiniLM...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center">
              <Upload size={28} className="text-brand-400" />
            </div>
            <p className="text-lg font-medium text-gray-200 mb-1">
              Drop your study material here
            </p>
            <p className="text-gray-500 text-sm mb-4">or click to browse</p>
            <div className="flex items-center justify-center gap-3">
              {["PDF", "TXT", "DOCX", "MD"].map((t) => (
                <span key={t} className="tag tag-blue">{t}</span>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">Max 50MB</p>
          </>
        )}
      </div>

      {/* Status message */}
      {status && (
        <div className={`
          flex items-start gap-3 p-4 rounded-xl mb-6 border animate-slide-up
          ${status.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
          }
        `}>
          {status.type === "success"
            ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
            : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className="font-medium">{status.message}</p>
            {status.doc && (
              <p className="text-xs mt-1 opacity-75">
                {status.doc.chunkCount} chunks · {formatBytes(status.doc.size)} · processed in {formatTime(status.doc.processingTimeMs)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Documents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white flex items-center gap-2">
            <Database size={18} className="text-brand-400" />
            Indexed Documents
          </h2>
          <span className="tag tag-blue">{documents.length} documents</span>
        </div>

        {loadingDocs ? (
          <div className="glass-card p-8 text-center">
            <Loader2 size={24} className="mx-auto text-brand-400 animate-spin mb-2" />
            <p className="text-gray-500 text-sm">Loading from Endee DB...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <FileText size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400 font-medium">No documents yet</p>
            <p className="text-gray-600 text-sm mt-1">Upload a file to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="glass-card-hover p-4 flex items-center gap-4 animate-slide-up">
                <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <FileIcon name={doc.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{formatBytes(doc.size)}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{doc.chunkCount} chunks</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag tag-green">Indexed</span>
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    disabled={deletingId === doc.id}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {deletingId === doc.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
