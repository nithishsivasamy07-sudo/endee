import { useState, useEffect } from "react";
import {
  BookOpen, Loader2, RefreshCw, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Download, List, AlignLeft, FileText
} from "lucide-react";
import { generateQuiz, listDocuments } from "../utils/api";

const QUIZ_TYPES = [
  { id: "mcq", label: "Multiple Choice", icon: List, color: "tag-blue", desc: "4 options, 1 correct" },
  { id: "short", label: "Short Answer", icon: AlignLeft, color: "tag-green", desc: "2–3 sentence answers" },
  { id: "long", label: "Long Answer", icon: FileText, color: "tag-purple", desc: "Detailed essay-style" },
];

function MCQCard({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const optLetters = ["A", "B", "C", "D"];
  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-start gap-3 mb-4">
        <span className="tag tag-blue flex-shrink-0">Q{index + 1}</span>
        <p className="text-gray-200 font-medium leading-relaxed">{q.question}</p>
      </div>
      <div className="space-y-2 mb-4">
        {optLetters.map((letter) => {
          if (!q.options?.[letter]) return null;
          const isCorrect = q.answer?.startsWith(letter);
          const isSelected = selected === letter;
          let style = "border-white/10 bg-surface-3 hover:border-brand-500/30 hover:bg-surface-4 text-gray-300";
          if (revealed) {
            if (isCorrect) style = "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
            else if (isSelected && !isCorrect) style = "border-red-500/50 bg-red-500/10 text-red-300";
            else style = "border-white/5 bg-surface-2/50 text-gray-500";
          } else if (isSelected) {
            style = "border-brand-500/50 bg-brand-600/15 text-brand-300";
          }
          return (
            <button
              key={letter}
              onClick={() => !revealed && setSelected(letter)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm text-left transition-all duration-150 ${style}`}
            >
              <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs font-mono flex-shrink-0">
                {letter}
              </span>
              <span>{q.options[letter]}</span>
              {revealed && isCorrect && <CheckCircle size={14} className="ml-auto text-emerald-400" />}
              {revealed && isSelected && !isCorrect && <XCircle size={14} className="ml-auto text-red-400" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
        >
          {revealed ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {revealed ? "Hide" : "Show"} answer
        </button>
        {revealed && q.explanation && (
          <p className="text-xs text-gray-500 flex-1">{q.explanation}</p>
        )}
      </div>
    </div>
  );
}

function TextCard({ q, index, type }) {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-start gap-3 mb-3">
        <span className={`tag flex-shrink-0 ${type === "short" ? "tag-green" : "tag-purple"}`}>
          Q{index + 1}
        </span>
        <p className="text-gray-200 font-medium leading-relaxed">{q.question}</p>
      </div>
      <button
        onClick={() => setShowAnswer(!showAnswer)}
        className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 mb-2"
      >
        {showAnswer ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {showAnswer ? "Hide" : "Show"} answer
      </button>
      {showAnswer && (
        <div className="mt-2 p-4 bg-surface-3/60 rounded-xl border border-white/5 animate-fade-in">
          <p className="text-gray-300 text-sm leading-relaxed">{q.answer}</p>
          {q.keyPoints && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500 font-medium mb-1">Key Points:</p>
              <p className="text-xs text-gray-400">{q.keyPoints}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  const [quizType, setQuizType] = useState("mcq");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    listDocuments()
      .then((r) => setDocuments(r.data.documents || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setQuestions(null);
    try {
      const res = await generateQuiz(topic, quizType, count, selectedDoc || undefined);
      setQuestions(res.data.questions);
      setMeta({ topic: res.data.topic, count: res.data.questionCount, time: res.data.processingTimeMs });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadQuiz = () => {
    if (!questions) return;
    let text = `AI Study Assistant - Quiz\n`;
    text += `Topic: ${meta?.topic || "General"} | Type: ${quizType.toUpperCase()} | Questions: ${questions.length}\n`;
    text += "=".repeat(60) + "\n\n";
    questions.forEach((q, i) => {
      text += `Q${i + 1}: ${q.question}\n`;
      if (q.options) {
        Object.entries(q.options).forEach(([k, v]) => { text += `  ${k}) ${v}\n`; });
        text += `ANSWER: ${q.answer}\n`;
        if (q.explanation) text += `EXPLANATION: ${q.explanation}\n`;
      } else {
        text += `ANSWER: ${q.answer}\n`;
      }
      text += "\n";
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `quiz-${quizType}-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Quiz <span className="gradient-text">Generator</span>
        </h1>
        <p className="text-gray-400">Generate exam-ready questions from your study material using AI.</p>
      </div>

      {/* Config Panel */}
      <div className="glass-card p-6 mb-6 space-y-5">
        {/* Quiz Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Question Type</label>
          <div className="grid grid-cols-3 gap-3">
            {QUIZ_TYPES.map(({ id, label, icon: Icon, color, desc }) => (
              <button
                key={id}
                onClick={() => setQuizType(id)}
                className={`
                  p-4 rounded-xl border text-left transition-all duration-150
                  ${quizType === id
                    ? "border-brand-500/50 bg-brand-600/15"
                    : "border-white/10 bg-surface-3 hover:border-white/20 hover:bg-surface-4"
                  }
                `}
              >
                <Icon size={20} className={quizType === id ? "text-brand-400" : "text-gray-500"} />
                <p className={`font-medium text-sm mt-2 ${quizType === id ? "text-white" : "text-gray-300"}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Topic */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Topic <span className="text-gray-600 font-normal">(optional — leave blank for general)</span>
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, World War 2, Newton's Laws..."
              className="input-field"
            />
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Questions: {count}</label>
            <input
              type="range" min="1" max="10" value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full accent-brand-500 mt-1"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1</span><span>10</span>
            </div>
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
              <option value="">All uploaded documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || documents.length === 0}
          className="btn-primary w-full justify-center py-3"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
          {loading ? "Generating questions..." : "Generate Quiz"}
        </button>

        {documents.length === 0 && (
          <p className="text-center text-sm text-yellow-400/70">⚠️ Upload documents first to generate a quiz</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 mb-6">
          <XCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {questions && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-semibold text-white">Generated Quiz</h2>
              <span className="tag tag-green">{questions.length} questions</span>
              {meta?.time && <span className="text-xs text-gray-600">{(meta.time / 1000).toFixed(1)}s</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerate} className="btn-secondary text-sm py-2 px-3">
                <RefreshCw size={14} /> Regenerate
              </button>
              <button onClick={downloadQuiz} className="btn-secondary text-sm py-2 px-3">
                <Download size={14} /> Download
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) =>
              q.type === "mcq"
                ? <MCQCard key={i} q={q} index={i} />
                : <TextCard key={i} q={q} index={i} type={q.type} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
