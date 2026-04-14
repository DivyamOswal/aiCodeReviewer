import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { generateTests } from "../api/github";
import Result from "./Result";

const API = "http://localhost:5000";

export default function History() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null); // full report for Result view
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("date"); // "date" | "grade" | "score"
  const [filterGrade,setFilterGrade]= useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API}/api/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setReports(res.data.reports || []))
      .catch(() => alert("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = async (id, e) => {
    e?.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/report/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url, download: "AI-Code-Audit.pdf",
      }).click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  // ── Filter + sort ─────────────────────────────
  const filtered = useMemo(() => {
    let list = [...reports];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.repoUrl?.toLowerCase().includes(q) || r.summary?.toLowerCase().includes(q)
      );
    }

    if (filterGrade !== "all") {
      list = list.filter((r) => (r.grade ?? "N/A")[0] === filterGrade);
    }

    list.sort((a, b) => {
      if (sortBy === "grade") return (a.grade ?? "Z").localeCompare(b.grade ?? "Z");
      if (sortBy === "score") {
        const avg = (r) => r.scores
          ? (r.scores.codeQuality + r.scores.security + r.scores.performance + r.scores.maintainability) / 4
          : 0;
        return avg(b) - avg(a);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return list;
  }, [reports, search, sortBy, filterGrade]);

  // ── Full report view ─────────────────────────
  if (selected) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Back to History
          </button>
          <span className="text-xs text-gray-500 truncate max-w-xs">
            {selected.repoUrl}
          </span>
        </div>
        <Result
          data={selected}
          onDownload={(e) => downloadPDF(selected._id, e)}
          generateTestsFn={generateTests}
        />
      </div>
    );
  }

  // ── Main history view ─────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 md:p-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold"> Report History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {reports.length} report{reports.length !== 1 ? "s" : ""} · click any card to view the full audit
          </p>
        </div>

        {/* Summary pills */}
        {reports.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {["A","B","C","D","F"].map((g) => {
              const count = reports.filter((r) => (r.grade ?? "N/A")[0] === g).length;
              if (!count) return null;
              return (
                <span key={g} className={`px-3 py-1 text-xs rounded-full font-semibold ${gradeStyle(g).badge}`}>
                  {g} · {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      {reports.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by repo or summary…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Grade filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All grades</option>
            {["A","B","C","D","F"].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Sort: Newest</option>
            <option value="score">Sort: Score</option>
            <option value="grade">Sort: Grade</option>
          </select>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center gap-4 mt-24">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading reports…</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && reports.length === 0 && (
        <div className="flex flex-col items-center gap-4 mt-24 text-center">
          <span className="text-6xl">📭</span>
          <p className="text-xl font-semibold text-gray-300">No reports yet</p>
          <p className="text-gray-500 text-sm">Analyse a GitHub repository to see your first report here.</p>
        </div>
      )}

      {/* NO RESULTS AFTER FILTER */}
      {!loading && reports.length > 0 && filtered.length === 0 && (
        <div className="text-center mt-16 text-gray-500">
          No reports match your search.{" "}
          <button onClick={() => { setSearch(""); setFilterGrade("all"); }} className="text-indigo-400 hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((r) => (
          <ReportCard
            key={r._id}
            report={r}
            onView={() => setSelected({
              ...r,
              _sourceCode: r._sourceCode ?? "",
            })}
            onDownload={(e) => downloadPDF(r._id, e)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Report Card
// ─────────────────────────────────────────────
function ReportCard({ report: r, onView, onDownload }) {
  const grade  = r.grade ?? "N/A";
  const styles = gradeStyle(grade[0]);
  const avg    = r.scores
    ? Math.round((r.scores.codeQuality + r.scores.security +
        r.scores.performance + r.scores.maintainability) / 4)
    : 0;

  const repoName = r.repoUrl?.replace("https://github.com/", "") ?? "Unknown";
  const date     = r.createdAt
    ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div
      onClick={onView}
      className="group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10
        rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:border-white/20 hover:bg-white/8
        transition-all duration-200"
    >
      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">github.com /</p>
          <h2 className="text-base font-semibold text-white truncate">{repoName}</h2>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${styles.badge}`}>
            {grade}
          </span>
          <span className="text-xs text-gray-500">{date}</span>
        </div>
      </div>

      {/* SUMMARY */}
      <p className="text-sm text-gray-400 line-clamp-2 mb-4">
        {r.summary || "No summary available"}
      </p>

      {/* SCORE BARS */}
      <div className="space-y-2 mb-4">
        {[
          ["Code Quality",    r.scores?.codeQuality],
          ["Security",        r.scores?.security],
          ["Performance",     r.scores?.performance],
          ["Maintainability", r.scores?.maintainability],
        ].map(([label, val]) => (
          <ScoreBar key={label} label={label} value={val} />
        ))}
      </div>

      {/* TAGS */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {r.toolsAndPackages?.slice(0, 5).map((t, i) => (
          <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 text-indigo-400">
            {t}
          </span>
        ))}
        {(r.toolsAndPackages?.length ?? 0) > 5 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-gray-500">
            +{r.toolsAndPackages.length - 5} more
          </span>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Avg score</span>
          <span className={`text-sm font-bold ${styles.text}`}>{avg}%</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10
              text-gray-400 hover:text-white transition"
          >
            ⬇ PDF
          </button>
          <button
            onClick={onView}
            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500/20 text-indigo-300
              hover:bg-indigo-500/40 transition opacity-0 group-hover:opacity-100"
          >
            View Report →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Score Bar
// ─────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const val = typeof value === "number" ? value : 0;
  const color = val >= 75 ? "from-green-400 to-emerald-500"
              : val >= 50 ? "from-yellow-400 to-orange-400"
              :             "from-red-400 to-rose-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-gray-300">{val || "N/A"}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${val}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Grade styles
// ─────────────────────────────────────────────
function gradeStyle(letter) {
  const map = {
    A: { badge: "bg-green-500/20  text-green-400",  text: "text-green-400"  },
    B: { badge: "bg-blue-500/20   text-blue-400",   text: "text-blue-400"   },
    C: { badge: "bg-yellow-500/20 text-yellow-400", text: "text-yellow-400" },
    D: { badge: "bg-orange-500/20 text-orange-400", text: "text-orange-400" },
    F: { badge: "bg-red-500/20    text-red-400",    text: "text-red-400"    },
  };
  return map[letter] ?? { badge: "bg-gray-500/20 text-gray-400", text: "text-gray-400" };
}