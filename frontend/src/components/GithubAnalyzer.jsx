import { useState } from "react";
import { analyzeGithub } from "../api/github";

export default function GithubAnalyzer({ setData }) {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!repo.startsWith("https://github.com/")) {
      return setError("Please enter a valid GitHub repository URL");
    }

    try {
      setError("");
      setLoading(true);

      const res = await analyzeGithub({ repoUrl: repo });

      // analysis text / object returned from backend
      setData(res.data.analysis);
    } catch (err) {
      setError(
        err.response?.data?.error || "GitHub analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-3">
        Analyze GitHub Repository
      </h2>

      <input
        className="w-full p-3 border rounded"
        placeholder="https://github.com/username/repository"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
      />

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      <button
        onClick={analyze}
        disabled={loading}
        className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-60"
      >
        {loading ? "Analyzing..." : "Generate Report"}
      </button>
    </div>
  );
}
