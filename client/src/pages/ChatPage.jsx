import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Trash2, Bot, User, BookOpen, Loader2,
  ChevronDown, FileText, Zap, RotateCcw, Copy, Check
} from "lucide-react";
import { sendChat, clearChatHistory, listDocuments } from "../utils/api";
import { v4 as uuidv4 } from "uuid";

// Simple markdown-like renderer
function RenderMessage({ text }) {
  const lines = text.split("\n");
  return (
    <div className="ai-response space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-semibold text-white mt-2">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="font-semibold text-white mt-2">{line.slice(3)}</h3>;
        if (line.startsWith("• ") || line.startsWith("- ")) return (
          <div key={i} className="flex gap-2">
            <span className="text-brand-400 mt-1 flex-shrink-0">•</span>
            <span>{line.replace(/^[•\-]\s*/, "")}</span>
          </div>
        );
        if (/^\d+\./.test(line)) return (
          <div key={i} className="flex gap-2">
            <span className="text-brand-400 font-mono text-sm mt-0.5 flex-shrink-0">{line.match(/^\d+/)[0]}.</span>
            <span>{line.replace(/^\d+\.\s*/, "")}</span>
          </div>
        );
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        // Bold inline
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <BookOpen size={12} />
        {sources.length} source{sources.length > 1 ? "s" : ""} retrieved
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="bg-surface-3/50 rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={12} className="text-brand-400" />
                <span className="text-xs font-medium text-gray-300">{src.documentName}</span>
                <span className="ml-auto text-xs text-emerald-400 font-mono">{(src.score * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{src.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ msg, isLast }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 group animate-slide-up ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`
        w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1
        ${isUser ? "bg-brand-600" : "bg-surface-3 border border-white/10"}
      `}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-brand-400" />}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`
          relative px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? "bg-brand-600/25 border border-brand-500/20 text-gray-100 rounded-tr-sm"
            : "bg-surface-2 border border-white/8 rounded-tl-sm"
          }
        `}>
          {isUser
            ? <p className="text-gray-100">{msg.content}</p>
            : <RenderMessage text={msg.content} />
          }

          {!isUser && (
            <button
              onClick={copy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-200"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>

        {msg.sources && <SourcesPanel sources={msg.sources} />}

        <span className="text-xs text-gray-600 mt-1.5 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {msg.processingTimeMs && (
            <span className="ml-2 text-gray-700">· {(msg.processingTimeMs / 1000).toFixed(1)}s</span>
          )}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-brand-400" />
      </div>
      <div className="bg-surface-2 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div className="flex gap-1.5 items-center">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Summarize the main topics in this document",
  "Explain the key concepts covered",
  "What are the most important points to remember?",
  "Give me a 5-mark answer on the main subject",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    listDocuments()
      .then((r) => setDocuments(r.data.documents || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: uuidv4(), role: "user", content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat(query, sessionId, selectedDoc || undefined);
      const { answer, sources, processingTimeMs } = res.data;
      setMessages((prev) => [...prev, {
        id: uuidv4(), role: "assistant", content: answer,
        timestamp: new Date().toISOString(),
        sources, processingTimeMs,
      }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        id: uuidv4(), role: "assistant",
        content: `❌ Error: ${e.message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, sessionId, selectedDoc]);

  const handleClear = async () => {
    if (!confirm("Clear this chat session?")) return;
    await clearChatHistory(sessionId).catch(() => {});
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-surface-1/80 backdrop-blur-sm px-6 py-3 flex items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-white">RAG Chat</h1>
          <p className="text-xs text-gray-500">Ask questions about your uploaded documents</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {documents.length > 0 && (
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="text-sm bg-surface-2 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-brand-500/50"
            >
              <option value="">All documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {messages.length > 0 && (
            <button onClick={handleClear} className="btn-secondary py-2 px-3 text-sm">
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center mb-4">
              <Zap size={28} className="text-brand-400" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-2">Ask Anything</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-8">
              Your questions are answered using RAG — semantic search over your documents + Gemini LLM generation.
            </p>
            {documents.length === 0 && (
              <p className="text-yellow-400/80 text-sm mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                ⚠️ Upload documents first to enable RAG-powered answers
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="glass-card-hover p-3 text-sm text-left text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={msg.id} msg={msg} isLast={i === messages.length - 1} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 bg-surface-1/80 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder="Ask about your study material... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="input-field resize-none min-h-[48px] max-h-32"
            style={{ height: "auto" }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 h-12 w-12 p-0 justify-center"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          Powered by Endee Vector DB · HuggingFace MiniLM · Google Gemini
        </p>
      </div>
    </div>
  );
}
