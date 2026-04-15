import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Upload, MessageSquare, BookOpen, PenLine,
  Brain, Activity, ChevronRight, Menu, X
} from "lucide-react";
import UploadPage from "./pages/UploadPage";
import ChatPage from "./pages/ChatPage";
import QuizPage from "./pages/QuizPage";
import AnswerPage from "./pages/AnswerPage";
import { getHealth } from "./utils/api";

const NAV_ITEMS = [
  { to: "/", icon: Upload, label: "Upload", exact: true },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/quiz", icon: BookOpen, label: "Quiz" },
  { to: "/answer", icon: PenLine, label: "Answers" },
];

function StatusDot({ status }) {
  const colors = {
    ok: "bg-emerald-400",
    error: "bg-red-400",
    loading: "bg-yellow-400 animate-pulse",
  };
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status] || colors.loading}`} />
  );
}

function Sidebar({ collapsed, setCollapsed }) {
  const [health, setHealth] = useState(null);
  const location = useLocation();

  useEffect(() => {
    getHealth()
      .then((r) => setHealth(r.data))
      .catch(() => setHealth({ status: "error" }));
  }, []);

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        bg-surface-1 border-r border-white/5
        transition-all duration-300
        ${collapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display font-bold text-white leading-none">StudyAI</div>
            <div className="text-xs text-gray-500 mt-0.5">RAG Assistant</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-150 group relative
              ${isActive
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }
            `}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
            {collapsed && (
              <div className="
                absolute left-14 bg-surface-3 text-gray-200 text-xs px-2.5 py-1.5
                rounded-lg border border-white/10 whitespace-nowrap
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                shadow-lg
              ">
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status panel */}
      {!collapsed && health && (
        <div className="p-3 m-3 rounded-xl bg-surface-2 border border-white/5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">System Status</span>
            <StatusDot status={health.status === "ok" ? "ok" : "error"} />
          </div>
          {health.services && (
            <>
              <div className="flex items-center gap-2 text-gray-400">
                <StatusDot status={health.services.endeeDB ? "ok" : "error"} />
                <span>Endee DB</span>
                {health.services.endeeDB && (
                  <span className="ml-auto text-gray-600">
                    {health.services.endeeDB.totalDocuments} vecs
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <StatusDot
                  status={
                    (health.services.llm?.status === "connected" || health.services.ollama?.status === "connected") ? "ok" : "error"
                  }
                />
                <span>{health.services.llm?.provider === "gemini" ? "Gemini LLM" : "Ollama LLM"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <StatusDot status="ok" />
                <span>Embeddings</span>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main
          className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}
        >
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/answer" element={<AnswerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
