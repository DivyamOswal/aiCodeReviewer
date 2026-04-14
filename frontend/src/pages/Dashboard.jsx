import { useEffect, useState, useRef, useCallback } from "react";
import { fetchDashboard } from "../api/dashboard";
import { analyzeGithub, generateTests } from "../api/github";
import { useNavigate } from "react-router-dom";
import Result from "../components/Result";

/* ── DASHBOARD ───────────────────────────────────────────────── */
export default function Dashboard() {
  const [data,       setData]       = useState(null);
  const [repoUrl,    setRepoUrl]    = useState("");
  const [analysis,   setAnalysis]   = useState(null);
  const [reportId,   setReportId]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [activeView, setActiveView] = useState("home");
  const [mounted,    setMounted]    = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard()
      .then((res) => {
        setData(res.data);
        setTimeout(() => setMounted(true), 50);
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  /* DOWNLOAD PDF */
  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !reportId) throw new Error();
      const res  = await fetch(`http://localhost:5000/api/report/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: "AI-Code-Audit.pdf" }).click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  /* GENERATE REPORT */
  const generateReport = async () => {
    if (!repoUrl.startsWith("https://github.com/")) return setError("Enter a valid GitHub URL");
    try {
      setLoading(true);
      setError("");
      const res = await analyzeGithub({ repoUrl });
      setReportId(res.data.reportId);
      const a = res.data.analysis || {};
      setAnalysis({
        summary:          a.summary          ?? "",
        architecture:     a.architecture     ?? [],
        bugs:             a.bugs             ?? [],
        securityIssues:   a.securityIssues   ?? [],
        futureRoadmap:    a.futureRoadmap     ?? [],
        toolsAndPackages: a.toolsAndPackages  ?? [],
        scores:           a.scores           ?? {},
        grade:            a.grade            ?? "N/A",
        finalVerdict:     a.finalVerdict      ?? "",
        _sourceCode:      a._sourceCode       ?? "",
      });
      setActiveView("result");
      fetchDashboard().then((r) => setData(r.data)).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const openResult = (report) => {
    setAnalysis({
      summary:          report.summary          ?? "",
      architecture:     report.architecture     ?? [],
      bugs:             report.bugs             ?? [],
      securityIssues:   report.securityIssues   ?? [],
      futureRoadmap:    report.futureRoadmap     ?? [],
      toolsAndPackages: report.toolsAndPackages  ?? [],
      scores:           report.scores           ?? {},
      grade:            report.grade            ?? "N/A",
      finalVerdict:     report.finalVerdict      ?? "",
      _sourceCode:      report._sourceCode       ?? "",
    });
    setReportId(report._id);
    setActiveView("result");
  };

  /* LOADING SCREEN */
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center gap-4 animate-[fadeUp_0.5s_ease_both]">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const avgQuality = data.recentReports?.length
    ? Math.round(data.recentReports.reduce((s, r) => s + (r.scores?.codeQuality ?? 0), 0) / data.recentReports.length)
    : data.stats?.avgScore ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">

      {/* ── TOP BAR ─────────────────────────────── */}
      <div className="bg-gray-900/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold transition-opacity duration-200">📊 Dashboard</h1>
        {activeView === "result" && (
          <button
            onClick={() => setActiveView("home")}
            className="text-sm text-gray-400 hover:text-white transition-all duration-200
              flex items-center gap-1 hover:-translate-x-0.5"
          >
            ← Back
          </button>
        )}
      </div>

      {/* ── RESULT VIEW ─────────────────────────── */}
      {activeView === "result" && analysis && (
        <div className="animate-[fadeUp_0.35s_ease_both]">
          <Result data={analysis} onDownload={downloadPDF} generateTestsFn={generateTests} />
        </div>
      )}

      {/* ── HOME VIEW ───────────────────────────── */}
      {activeView === "home" && (
        <div
          className={`p-6 md:p-8 space-y-8
            transition-all duration-500 ease-out
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🔍", title: "Total Scans",      value: data.stats?.totalScans ?? 0,         sub: "repos analysed",     color: "indigo", delay: "0ms"   },
              { icon: "⭐", title: "Avg Code Quality",  value: `${avgQuality}%`,                    sub: "across all reports", color: "purple", delay: "80ms"  },
              { icon: "🛡️", title: "DevOps Score",     value: `${data.stats?.devopsScore ?? 0}%`,  sub: "CI/CD & infra",      color: "teal",   delay: "160ms" },
            ].map((s) => (
              <div
                key={s.title}
                className={`transition-all duration-500 ease-out
                  ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: s.delay }}
              >
                <StatCard {...s} />
              </div>
            ))}
          </div>

          {/* ANALYZER */}
          <div
            className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg
              transition-all duration-500 ease-out
              ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: "240ms" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔗</span>
              <h2 className="text-xl font-semibold">Analyze GitHub Repository</h2>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Paste any public GitHub URL to get an instant AI-powered audit + test generation
            </p>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                className="flex-1 p-3 rounded-xl bg-black/60 border border-gray-700 text-white
                  placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500
                  transition-all duration-200 focus:border-indigo-500/50"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !loading && generateReport()}
              />
              <button
                onClick={generateReport}
                disabled={loading}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                  ${loading
                    ? "bg-gray-700 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                  }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analysing…
                  </span>
                ) : "Generate Report"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2
                animate-[fadeUp_0.25s_ease_both]">
                ⚠️ {error}
              </p>
            )}

            {/* Feature chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["📊 Architecture", "🐛 Bugs", "🔐 Security", "🧪 Tests", "🗺 Roadmap"].map((f, i) => (
                <span
                  key={f}
                  className={`px-2.5 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-gray-400
                    transition-all duration-300 hover:bg-white/10 hover:text-gray-200 hover:-translate-y-0.5 cursor-default
                    ${mounted ? "opacity-100" : "opacity-0"}`}
                  style={{ transitionDelay: `${300 + i * 40}ms` }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* RECENT REPORTS */}
          {data.recentReports?.length > 0 && (
            <div
              className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg
                transition-all duration-500 ease-out
                ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: "320ms" }}
            >
              <h2 className="text-lg font-semibold mb-4">🕒 Recent Reports</h2>
              <div className="space-y-3">
                {data.recentReports.map((report, i) => (
                  <div
                    key={report._id ?? i}
                    className={`transition-all duration-400 ease-out
                      ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                    style={{ transitionDelay: `${380 + i * 60}ms` }}
                  >
                    <ReportRow report={report} onView={() => openResult(report)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLOBAL KEYFRAMES */}
      <style>{`
        @keyframes fadeUp {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── STAT CARD ──────────────────────────────── */
function StatCard({ icon, title, value, sub, color }) {
  const colors = {
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    teal:   "from-teal-500/20   to-teal-500/5   border-teal-500/30",
  };
  const textColors = { indigo: "text-indigo-400", purple: "text-purple-400", teal: "text-teal-400" };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 backdrop-blur-xl
      transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-white/20 cursor-default`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  );
}

/* ── REPORT ROW ─────────────────────────────── */
function ReportRow({ report, onView }) {
  const grade = report.grade ?? "N/A";
  const gradeColor = {
    A: "text-green-400 bg-green-500/10",
    B: "text-blue-400  bg-blue-500/10",
    C: "text-yellow-400 bg-yellow-500/10",
    D: "text-orange-400 bg-orange-500/10",
    F: "text-red-400   bg-red-500/10",
  }[grade[0]] ?? "text-gray-400 bg-gray-500/10";

  const avg = report.scores
    ? Math.round((report.scores.codeQuality + report.scores.security +
        report.scores.performance + report.scores.maintainability) / 4)
    : 0;

  const repoName = report.repoUrl?.replace("https://github.com/", "") ?? "Unknown repo";
  const date = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl
      bg-white/5 hover:bg-white/10
      border border-white/5 hover:border-white/10
      transition-all duration-250 group
      hover:shadow-md hover:-translate-y-px">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg shrink-0 ${gradeColor}`}>{grade}</span>
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">{repoName}</p>
          <p className="text-xs text-gray-500">{date} · avg score {avg}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {report.scores && (
          <div className="hidden md:flex gap-1 items-end h-6">
            {[report.scores.codeQuality, report.scores.security,
              report.scores.performance, report.scores.maintainability].map((v, i) => (
              <div
                key={i}
                className="w-1.5 bg-indigo-500 rounded-sm opacity-70 transition-all duration-300 group-hover:opacity-100"
                style={{ height: `${Math.max(20, v)}%` }}
              />
            ))}
          </div>
        )}
        <button
          onClick={onView}
          className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500/20 text-indigo-300
            hover:bg-indigo-500/40 transition-all duration-200
            opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0"
        >
          View →
        </button>
      </div>
    </div>
  );
}