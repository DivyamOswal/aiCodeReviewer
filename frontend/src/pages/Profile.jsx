// frontend/src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "../api/axios";

export default function Profile() {
  const navigate    = useNavigate();
  const { token, logout } = useAuth();

  const [user,    setUser]    = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = () => {
    if (!token) { navigate("/login"); return; }

    setLoading(true);
    setError(null);

    // ── Decode JWT as immediate fallback (no network needed) ──
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        name:  payload.name  ?? "",
        email: payload.email ?? "",
        role:  payload.role  ?? "user",
      });
    } catch { /* ignore */ }

    // ── Try /auth/me for full user data (name, createdAt, etc.) ──
    const mePromise = axios.get("/auth/me")
      .then((res) => {
        const u = res.data.user ?? res.data;
        setUser(u);
      })
      .catch(() => {
        // JWT decode already set a fallback — just continue
      });

    // ── Load reports ──
    const reportsPromise = axios.get("/report")
      .then((res) => setReports(res.data.reports ?? []))
      .catch(() => setReports([]));

    Promise.all([mePromise, reportsPromise]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  if (loading && !user) return <LoadingScreen />;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white gap-4">
      <p className="text-red-400">⚠️ {error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition text-sm">
        Retry
      </button>
    </div>
  );

  const totalScans = reports.length;
  const avgScore   = totalScans
    ? Math.round(reports.reduce((s, r) =>
        s + (((r.scores?.codeQuality ?? 0) + (r.scores?.security ?? 0) +
               (r.scores?.performance ?? 0) + (r.scores?.maintainability ?? 0)) / 4), 0
      ) / totalScans)
    : 0;

  const bestReport = [...reports].sort((a, b) => {
    const avg = (r) => ((r.scores?.codeQuality ?? 0) + (r.scores?.security ?? 0) +
      (r.scores?.performance ?? 0) + (r.scores?.maintainability ?? 0)) / 4;
    return avg(b) - avg(a);
  })[0];

  const gradeCounts = reports.reduce((acc, r) => {
    const g = (r.grade ?? "N/A")[0];
    acc[g]  = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  const name = user?.name || user?.email || "User";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── HERO ─────────────────────────────── */}
        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
              flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
              {initials}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{name}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{user?.email ?? ""}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                {joinDate && <Pill icon="📅" text={`Joined ${joinDate}`} />}
                <Pill icon="🔍" text={`${totalScans} scan${totalScans !== 1 ? "s" : ""}`} />
                {user?.role && <Pill icon="🏷️" text={user.role} />}
              </div>
            </div>

            <button
              onClick={() => navigate("/settings")}
              className="shrink-0 px-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10
                hover:bg-white/10 transition flex items-center gap-2"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* ── STATS ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="🔍" label="Total Scans"   value={totalScans}          color="indigo" />
          <StatCard icon="⭐" label="Avg Score"     value={`${avgScore}%`}       color="purple" />
          <StatCard icon="🏆" label="Best Grade"    value={bestReport?.grade ?? "—"} color="teal" />
          <StatCard icon="🛡️" label="A-Grade Repos" value={gradeCounts["A"] ?? 0} color="green" />
        </div>

        {/* ── GRADE BREAKDOWN ──────────────────── */}
        {totalScans > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Grade Breakdown</h2>
            <div className="space-y-3">
              {["A","B","C","D","F"].map((g) => {
                const count = gradeCounts[g] ?? 0;
                const pct   = totalScans ? Math.round((count / totalScans) * 100) : 0;
                const style = gradeStyle(g);
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className={`w-8 text-sm font-bold ${style.text}`}>{g}</span>
                    <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${style.bar} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {count} repo{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RECENT ACTIVITY ──────────────────── */}
        {reports.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <button onClick={() => navigate("/history")} className="text-xs text-indigo-400 hover:underline">
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {reports.slice(0, 5).map((r, i) => {
                const avg   = Math.round(((r.scores?.codeQuality ?? 0) + (r.scores?.security ?? 0) +
                  (r.scores?.performance ?? 0) + (r.scores?.maintainability ?? 0)) / 4);
                const style = gradeStyle((r.grade ?? "N/A")[0]);
                const name  = r.repoUrl?.replace("https://github.com/", "") ?? "Unknown";
                const date  = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "";
                return (
                  <div key={r._id ?? i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${style.badge}`}>
                      {r.grade ?? "N/A"}
                    </span>
                    <span className="flex-1 text-sm text-gray-300 truncate">{name}</span>
                    <span className="text-xs text-gray-600">{date}</span>
                    <span className="text-xs font-medium text-gray-400">{avg}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────── */}
        {totalScans === 0 && !loading && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🔭</p>
            <p className="text-lg font-medium text-gray-400">No scans yet</p>
            <p className="text-sm mt-1">Analyse a GitHub repo to see your profile stats.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition text-sm"
            >
              Start analysing →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ icon, text }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-gray-400">
      {icon} {text}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    indigo: "from-indigo-500/20 to-transparent border-indigo-500/20 text-indigo-400",
    purple: "from-purple-500/20 to-transparent border-purple-500/20 text-purple-400",
    teal:   "from-teal-500/20   to-transparent border-teal-500/20   text-teal-400",
    green:  "from-green-500/20  to-transparent border-green-500/20  text-green-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 backdrop-blur-xl`}>
      <p className="text-xl mb-1">{icon}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function gradeStyle(letter) {
  const map = {
    A: { badge: "bg-green-500/20  text-green-400",  text: "text-green-400",  bar: "bg-green-500"  },
    B: { badge: "bg-blue-500/20   text-blue-400",   text: "text-blue-400",   bar: "bg-blue-500"   },
    C: { badge: "bg-yellow-500/20 text-yellow-400", text: "text-yellow-400", bar: "bg-yellow-500" },
    D: { badge: "bg-orange-500/20 text-orange-400", text: "text-orange-400", bar: "bg-orange-500" },
    F: { badge: "bg-red-500/20    text-red-400",    text: "text-red-400",    bar: "bg-red-500"    },
  };
  return map[letter] ?? { badge: "bg-gray-500/20 text-gray-400", text: "text-gray-400", bar: "bg-gray-500" };
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading profile…</p>
      </div>
    </div>
  );
}