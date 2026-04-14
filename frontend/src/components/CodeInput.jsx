import { useState } from "react";
import { analyzeCode } from "../api/analyze";

export default function CodeInput({ setResult, model }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await analyzeCode(code, model);
      setResult(res.data.analysis);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6">
        
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-white">
            AI Code Reviewer
          </h1>
          <p className="text-gray-400 text-sm">
            Paste your code and get instant feedback 🚀
          </p>
        </div>

        {/* Code Input */}
        <textarea
          className="w-full h-72 p-4 rounded-xl bg-black text-green-400 font-mono text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="// Paste your code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        {/* Footer */}
        <div className="flex justify-between items-center mt-4">
          
          {/* Info */}
          <span className="text-gray-500 text-xs">
            Model: {model || "default"}
          </span>

          {/* Button */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`relative px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 
              ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105 hover:shadow-lg"
              }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </div>
            ) : (
              "Analyze Code"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}