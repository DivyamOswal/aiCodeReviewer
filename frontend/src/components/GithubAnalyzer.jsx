import { useState } from "react";
import { analyzeGithub, generateTests } from "../api/github";
import Result from "./Result";

export default function GithubAnalyzer({ setData }) {
  const [repo,      setRepo]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [analysis,  setAnalysis]  = useState(null); // ← owns the result locally

  const analyze = async () => {
    if (!repo.startsWith("https://github.com/")) {
      return setError("Enter a valid GitHub repo URL");
    }

    try {
      setError("");
      setLoading(true);
      setAnalysis(null);

      const res = await analyzeGithub({ repoUrl: repo });
      const data = res.data.analysis;

      // Keep parent in sync if setData was passed (for History, Dashboard, etc.)
      if (setData) setData(data);

      // Store locally so we can pass generateTestsFn to Result
      setAnalysis(data);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setError("");
    setRepo("");
    if (setData) setData(null);
  };

  // ── Results view ──────────────────────────────
  if (analysis) {
    return (
      <div>
        {/* Back bar */}
        <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center gap-4">
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← New Analysis
          </button>
          <span className="text-xs text-gray-500 truncate max-w-xs">{repo}</span>
        </div>

        {/*
          analysis._sourceCode  → set by githubController.js, read by Result internally
          generateTestsFn       → calls POST /api/github/generate-tests
        */}
        <Result
          data={analysis}
          generateTestsFn={generateTests}
          onDownload={() => {
            const blob = new Blob([JSON.stringify(analysis, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            Object.assign(document.createElement("a"), {
              href: url, download: "audit-report.json",
            }).click();
            URL.revokeObjectURL(url);
          }}
        />
      </div>
    );
  }

  // ── Input view ────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-white">
            GitHub Repository Analyzer
          </h2>
          <p className="text-gray-400 text-sm">
            Analyze any public repo with AI insights ⚡
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            className="w-full p-4 pr-12 rounded-xl bg-black text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            placeholder="https://github.com/username/repository"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            🔗
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-5">
          <span className="text-gray-500 text-xs">
            Supports public repositories only
          </span>

          <button
            onClick={analyze}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium text-white transition-all duration-300
              ${loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 hover:shadow-lg"
              }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </div>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>

        {/* Tip */}
        <div className="mt-6 text-xs text-gray-600 border-t border-gray-800 pt-3">
          💡 Tip: Try popular repos like{" "}
          <span className="text-indigo-400">
            https://github.com/facebook/react
          </span>
        </div>
      </div>
    </div>
  );
}