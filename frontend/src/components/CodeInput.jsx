import { useState } from "react";
import { analyzeCode } from "../api/analyze";

export default function CodeInput({ setResult, model }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const res = await analyzeCode(code, model);
    setResult(res.data.analysis);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <textarea
        className="w-full h-64 p-4 font-mono border rounded"
        placeholder="Paste your code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? "Analyzing..." : "Analyze Code"}
      </button>
    </div>
  );
}
