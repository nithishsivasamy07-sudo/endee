import { useState, useEffect } from "react";
import {
  PenLine, Loader2, Copy, Check, BookOpen, List,
  AlignLeft, FileText, ChevronDown, ChevronRight, RefreshCw
} from "lucide-react";
import { generateAnswer, listDocuments } from "../utils/api";

const ANSWER_TYPES = [
  {
    id: "bullet",
    label: "Bullet Points",
    icon: List,
    color: "tag-blue",
    desc: "Key points with • bullets",
    example: "• Point 1\n• Point 2\n• Point 3",
  },
  {
    id: "paragraph",
    label: "Paragraph",
    icon: AlignLeft,
    color: "tag-green",
    desc: "Flowing paragraph (150–200 words)",
    example: "A well-structured paragraph answer...",
  },
  {
    id: "exam",
    label: "Exam Style",
    icon: FileText,
    color: "tag-purple",
    desc: "Introduction + points + conclusion",
    example: "Intro → Main points → Conclusion",
  },
];

const SAMPLE_QUESTIONS = [
  "Explain the process of photosynthesis",
  "What were the main causes of World War I?",
  "Describe the water cycle",
  "Explain Newton's three laws of motion",
  "What is machine learning and how does it work?",
];

function AnswerDisplay({ answer, answerType }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple rendering
  const lines = answer.split("\n").filter((l) => l.trim());

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <span className="tag tag-blue">Generated Answer</span>
        <button onClick={copy} className="btn-secondary text-sm py-1.5 px-3">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-gray-200">
        {lines.map((line, i) => {
          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") && !line.startsWith("**")) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-brand-400 mt-1 flex-shrink-0">•</span>
                <span>{line.replace(/^[•\-\*]\s*/, "")}</span>
              </div>
            );
          }
          if (/^\d+\./.test(line)) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-brand-400 font-mono font-medium mt-0.5 flex-shrink-0">
                  {line.match(/^\d+/)[0]}.
                </span>
                <span>{line.replace(/^\d+\.\s*/, "")}</span>
              </div>
            );
          }
          if (line.startsWith("**") && line.endsWith("**")) {
            return <p key={i} className="font-semibold text-white mt-2">{line.slice(2, -2)}</p>;
          }
          // Bold inline
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={i} className={line.startsWith("Introduction") || line.startsWith("Conclusion") ? "font-semibold text-white" : ""}>
              {parts.map((part, j) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={j} className="text-white">{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="glass-card p-4 animate-slide-up">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 w-full transition-colors"
      >
        <BookOpen size={14} className="text-brand-400" />
        <span>{sources.length} source chunks retrieved from Endee DB</span>
        {open ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="bg-surface-3/50 rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={11} className="text-brand-400" />
                <span className="text-xs font-medium text-gray-300">{src.documentName}</span>
                <span className="ml-auto text-xs text-emerald-400 font-mono">{(src.score * 100).toFixed(0)}% match</span>
              </div>
              <p className="text-xs text-gray-500">{src.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnswerPage() {
  const [question, setQuestion] = useState("");
  const [answerType, setAnswerType] = useState("exam");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    listDocuments()
      .then((r) => setDocuments(r.data.documents || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateAnswer(q, answerType, selectedDoc || undefined);
      setResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Answer <span className="gradient-text">Generator</span>
        </h1>
        <p className="text-gray-400">Get structured, exam-ready answers from your study material.</p>
      </div>

      {/* Config Panel */}
      <div className="glass-card p-6 mb-6 space-y-5">
        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Your Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question or exam question here..."
            rows={3}
            className="input-field resize-none"
          />
          {/* Sample questions */}
          <div className="flex flex-wrap gap-2 mt-2">
            {SAMPLE_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                className="text-xs text-gray-500 hover:text-brand-400 bg-surface-3 hover:bg-surface-4 border border-white/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                {q.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>

        {/* Answer Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Answer Format</label>
          <div className="grid grid-cols-3 gap-3">
            {ANSWER_TYPES.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setAnswerType(id)}
                className={`
                  p-4 rounded-xl border text-left transition-all duration-150
                  ${answerType === id
                    ? "border-brand-500/50 bg-brand-600/15"
                    : "border-white/10 bg-surface-3 hover:border-white/20 hover:bg-surface-4"
                  }
                `}
              >
                <Icon size={20} className={answerType === id ? "text-brand-400" : "text-gray-500"} />
                <p className={`font-medium text-sm mt-2 ${answerType === id ? "text-white" : "text-gray-300"}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Document filter */}
        {documents.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Source Document</label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="input-field"
            >
              <option value="">All documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !question.trim() || documents.length === 0}
          className="btn-primary w-full justify-center py-3"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <PenLine size={18} />}
          {loading ? "Generating answer..." : "Generate Answer"}
        </button>

        {documents.length === 0 && (
          <p className="text-center text-sm text-yellow-400/70">⚠️ Upload documents first</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 mb-6">
          <p className="text-sm">❌ {error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-semibold text-white">Generated Answer</h2>
              <span className="tag tag-green capitalize">{result.answerType}</span>
              {result.processingTimeMs && (
                <span className="text-xs text-gray-600">{(result.processingTimeMs / 1000).toFixed(1)}s</span>
              )}
            </div>
            <button onClick={handleGenerate} className="btn-secondary text-sm py-1.5 px-3">
              <RefreshCw size={14} /> Regenerate
            </button>
          </div>

          {/* Question echo */}
          <div className="glass-card p-4 border-l-2 border-brand-500">
            <p className="text-xs text-gray-500 font-medium mb-1">Question</p>
            <p className="text-gray-200">{result.question}</p>
          </div>

          <AnswerDisplay answer={result.answer} answerType={result.answerType} />
          <SourcesPanel sources={result.sources} />
        </div>
      )}
    </div>
  );
}
