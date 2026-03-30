import { useEffect, useState } from "react";
import { fetchDashboard } from "../api/dashboard";
import { analyzeGithub } from "../api/github";
import { useNavigate } from "react-router-dom";
import Result from "../components/Result";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /* 🔐 LOAD DASHBOARD */
  useEffect(() => {
    fetchDashboard()
      .then((res) => setData(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  /* 📄 PDF DOWNLOAD */
  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !reportId) throw new Error();

      const res = await fetch(
        `http://localhost:5000/api/report/${reportId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "AI-Code-Audit.pdf";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Unauthorized or failed to download PDF");
    }
  };

  /* 🚀 GENERATE REPORT */
  const generateReport = async () => {
    if (!repoUrl.startsWith("https://github.com/")) {
      setError("Enter a valid GitHub repository URL");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await analyzeGithub({ repoUrl });
      setReportId(res.data.reportId);

      const a = res.data.analysis || {};

      setAnalysis({
        summary: a.summary ?? "No summary generated.",
        architecture: a.architecture ?? [],
        bugs: a.bugs ?? [],
        securityIssues: a.securityIssues ?? [],
        futureRoadmap: a.futureRoadmap ?? [],
        toolsAndPackages: a.toolsAndPackages ?? [],
        scores: a.scores ?? {},
        grade: a.grade ?? "N/A",
        finalVerdict: a.finalVerdict ?? "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat title="Total Scans" value={data.stats.totalScans} />
        <Stat title="Avg Score" value={`${data.stats.avgScore}%`} />
        <Stat title="DevOps Score" value={`${data.stats.devopsScore}%`} />
      </div>

      <div className="bg-white p-6 rounded shadow mb-8">
        <input
          className="w-full p-3 border rounded"
          placeholder="https://github.com/user/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          onClick={generateReport}
          disabled={loading}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Analyzing..." : "Generate Report"}
        </button>
      </div>

      {analysis && (
        <>
          <Result data={analysis} />

          <button
            onClick={downloadPDF}
            className="mt-6 bg-green-600 text-white px-6 py-2 rounded"
          >
            Download PDF Report
          </button>
        </>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <p className="text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
