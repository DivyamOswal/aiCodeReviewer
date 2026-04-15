// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useCallback, createContext, useContext } from "react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import History from "./components/History";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Result from "./components/Result";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import {
  analyzeCode,
  generateTests,
  fetchRepoContents,
} from "./api/analyze";

// ─────────────────────────────────────────────
//  Auth Context — single source of truth
// ─────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = useCallback((newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
  }, []);

  const isAuth = !!token;

  return (
    <AuthContext.Provider value={{ token, isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
//  /analyze page
// ─────────────────────────────────────────────
function AnalyzePage() {
  const [inputMode, setInputMode] = useState("paste");
  const [codeInput, setCodeInput] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [sourceCode, setSourceCode] = useState("");

  const handleAnalyse = async () => {
    setError(null);
    setAuditData(null);
    setSourceCode("");

    const isUrl = inputMode === "url";
    const value = isUrl ? repoUrl.trim() : codeInput.trim();

    if (!value) {
      setError(isUrl ? "Please enter a GitHub URL." : "Please paste some code.");
      return;
    }

    setLoading(true);
    try {
      let code = value;
      if (isUrl) {
        code = await fetchRepoContents(value, githubToken.trim() || "");
      }

      const { auditResult, sourceCode: src } = await analyzeCode(code);
      setSourceCode(src);
      setAuditData(auditResult);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleAnalyse();
    }
  };

  const handleDownload = () => {
    if (!auditData) return;
    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url,
      download: "audit-report.json",
    }).click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setAuditData(null);
    setSourceCode("");
    setError(null);
    setCodeInput("");
    setRepoUrl("");
  };

  if (auditData) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center gap-4">
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← New Analysis
          </button>
          {inputMode === "url" && repoUrl && (
            <span className="text-xs text-gray-500 truncate max-w-xs">
              {repoUrl}
            </span>
          )}
        </div>
        <Result
          data={auditData}
          sourceCode={sourceCode}
          onDownload={handleDownload}
          generateTestsFn={generateTests}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🔍 CodeAudit AI
        </h1>
        <p className="text-gray-400 text-sm">
          Powered by Groq · Instant analysis + test generation
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {["paste", "url"].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setInputMode(mode);
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200
                ${
                  inputMode === mode
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
            >
              {mode === "paste" ? "📋 Paste Code" : "🔗 GitHub URL"}
            </button>
          ))}
        </div>

        {/* Paste mode */}
        {inputMode === "paste" && (
          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={12}
            placeholder="Paste your JavaScript / TypeScript / Python / Shell source code here… (Ctrl+Enter to analyse)"
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl p-4
              text-gray-200 text-sm font-mono placeholder-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        )}

        {/* URL mode */}
        {inputMode === "url" && (
          <div className="space-y-3">
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3
                text-gray-200 text-sm placeholder-gray-600
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="space-y-1">
              <input
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                type="password"
                placeholder="GitHub token (required for private repos)"
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-2.5
                  text-gray-200 text-sm placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 pl-1">
                Leave empty for public repos. For private repos, create a token
                at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  github.com/settings/tokens
                </a>{" "}
                with{" "}
                <code className="text-xs bg-white/10 px-1 rounded">repo</code>{" "}
                scope.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 whitespace-pre-line">
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all hover:scale-[1.02] active:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {inputMode === "url"
                ? "Fetching & analysing repo…"
                : "Analysing code…"}
            </span>
          ) : (
            "🔍 Analyse Code"
          )}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
        {[
          "📊 Architecture Review",
          "🐛 Bug Detection",
          "🔐 Security Audit",
          "🧪 Test Generation",
          "🗺 Roadmap",
          "⬇ JSON Export",
        ].map((f) => (
          <span
            key={f}
            className="px-3 py-1 rounded-full border border-white/10 bg-white/5"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Layout
// ─────────────────────────────────────────────
function Layout() {
  const location = useLocation();
  const { isAuth } = useAuth();

  const hideNavbar = ["/login", "/register"];
  const showNav = !hideNavbar.includes(location.pathname);

  return (
    <>
      {showNav && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={isAuth ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuth ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}