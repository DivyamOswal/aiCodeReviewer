import { useEffect, useState, useRef, useCallback } from "react";
import { fetchDashboard } from "../api/dashboard";
import { analyzeGithub, generateTests } from "../api/github";
import { useNavigate } from "react-router-dom";
import Result from "../components/Result";
import { usePreferences } from "../context/PreferencesContext";
import { gsap, useGSAP } from "../lib/gsap";
import { useAuth } from "../App";
import { Search } from "lucide-react";
import { getReport } from "../api/report";

/* =========================================================
   CODEVERITY DASHBOARD – Token-based only
========================================================= */

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [statsKey, setStatsKey] = useState(0);
  const [repoUrl, setRepoUrl] = useState(""); // input field value
  const [analysis, setAnalysis] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("home");
  const [mounted, setMounted] = useState(false);


  const [currentRepoUrl, setCurrentRepoUrl] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

  const mainContainerRef = useRef(null);
  const statsContainerRef = useRef(null);
  const analyzerRef = useRef(null);
  const recentReportsRef = useRef(null);
  const emptyStateRef = useRef(null);

  const { compact } = usePreferences();

  const loadDashboard = useCallback(
    () =>
      fetchDashboard()
        .then((res) => {
          setData(res.data);
          setStatsKey((k) => k + 1);
          setTimeout(() => setMounted(true), 50);
        })
        .catch(() => {
          localStorage.removeItem("token");
          navigate("/login");
        }),
    [navigate, logout]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useGSAP(
    () => {
      if (activeView !== "home" || !mounted || !data) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.5 } });

        if (mainContainerRef.current) {
          gsap.set(mainContainerRef.current, { opacity: 0, y: 15 });
        }
        const statsChildren = statsContainerRef.current?.children;
        if (statsChildren?.length) {
          gsap.set(statsChildren, { opacity: 0, y: 10 });
        }
        if (analyzerRef.current) {
          gsap.set(analyzerRef.current, { opacity: 0, y: 12 });
        }

        gsap.set(".report-row", { opacity: 0, y: 8 });
        gsap.set(".empty-state", { opacity: 0, y: 8 });

        if (mainContainerRef.current) {
          tl.to(mainContainerRef.current, { opacity: 1, y: 0, duration: 0.6 });
        }

        if (statsChildren?.length) {
          tl.to(
            statsChildren,
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.08,
              clearProps: "opacity",
            },
            "-=0.2"
          );
        }

        if (analyzerRef.current) {
          tl.to(analyzerRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.15");
        }

        tl.to(
          ".report-row",
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.05,
            clearProps: "opacity",
          },
          "-=0.1"
        );

        tl.to(
          ".empty-state",
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            clearProps: "opacity",
          },
          "-=0.1"
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (mainContainerRef.current) {
          gsap.set(mainContainerRef.current, { opacity: 1, y: 0, clearProps: "all" });
        }
        const statsChildren = statsContainerRef.current?.children;
        if (statsChildren?.length) {
          gsap.set(statsChildren, { opacity: 1, y: 0, clearProps: "all" });
        }
        if (analyzerRef.current) {
          gsap.set(analyzerRef.current, { opacity: 1, y: 0, clearProps: "all" });
        }
        gsap.set(".report-row", { opacity: 1, y: 0, clearProps: "all" });
        gsap.set(".empty-state", { opacity: 1, y: 0, clearProps: "all" });
      });

      return () => mm.revert();
    },
    {
      scope: mainContainerRef,
      dependencies: [mounted, activeView],
    }
  );

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !reportId) throw new Error();
      const res = await fetch(
        `http://localhost:5000/api/report/${reportId}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: "AI-Code-Audit.pdf",
      }).click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  const generateReport = async () => {
    if (!repoUrl.startsWith("https://github.com/")) {
      return setError("Enter a valid GitHub URL");
    }
    try {
      setLoading(true);
      setError("");
      const res = await analyzeGithub({ repoUrl });
      setReportId(res.data.reportId);
      const a = res.data.analysis || {};
      setAnalysis({
        summary: a.summary ?? "",
        architecture: a.architecture ?? [],
        bugs: a.bugs ?? [],
        securityIssues: a.securityIssues ?? [],
        futureRoadmap: a.futureRoadmap ?? [],
        toolsAndPackages: a.toolsAndPackages ?? [],
        scores: a.scores ?? {},
        grade: a.grade ?? "N/A",
        finalVerdict: a.finalVerdict ?? "",
        _sourceCode: a._sourceCode ?? "",
        repoUrl: repoUrl, // 👈 include repoUrl in analysis
      });
      setCurrentRepoUrl(repoUrl); // 👈 store for Auto‑Fix
      setActiveView("result");
      loadDashboard();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Analysis failed";

      if (errorMsg === "Insufficient tokens") {
        setError(
          `${errorMsg}. <a href="/pricing" style="color: var(--accent); text-decoration: underline; font-weight: 500;">Upgrade your plan</a>`
        );
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const openResult = async (report) => {
  try {
    // If report already has enhanced fields, use it directly
    if (report.healthScore || report.securityVulnerabilities?.length) {
      setAnalysis({
        summary: report.summary ?? "",
        architecture: report.architecture ?? [],
        bugs: report.bugs ?? [],
        securityIssues: report.securityIssues ?? [],
        futureRoadmap: report.futureRoadmap ?? [],
        toolsAndPackages: report.toolsAndPackages ?? [],
        scores: report.scores ?? {},
        grade: report.grade ?? "N/A",
        finalVerdict: report.finalVerdict ?? "",
        _sourceCode: report._sourceCode ?? "",
        repoUrl: report.repoUrl || "",
        healthScore: report.healthScore,
        securityVulnerabilities: report.securityVulnerabilities,
        dependencyVulnerabilities: report.dependencyVulnerabilities,
        secrets: report.secrets,
        techDebt: report.techDebt,
        architectureGraph: report.architectureGraph,
        tokensUsed: report.tokensUsed,
        tokensRemaining: report.tokensRemaining,
      });
      setReportId(report._id);
      setCurrentRepoUrl(report.repoUrl || "");
      setActiveView("result");
      return;
    }

    // Otherwise fetch the full report
    const res = await getReport(report._id);
    const full = res.data.report;
    setAnalysis({
      summary: full.summary ?? "",
      architecture: full.architecture ?? [],
      bugs: full.bugs ?? [],
      securityIssues: full.securityIssues ?? [],
      futureRoadmap: full.futureRoadmap ?? [],
      toolsAndPackages: full.toolsAndPackages ?? [],
      scores: full.scores ?? {},
      grade: full.grade ?? "N/A",
      finalVerdict: full.finalVerdict ?? "",
      _sourceCode: full._sourceCode ?? "",
      repoUrl: full.repoUrl || "",
      healthScore: full.healthScore,
      securityVulnerabilities: full.securityVulnerabilities,
      dependencyVulnerabilities: full.dependencyVulnerabilities,
      secrets: full.secrets,
      techDebt: full.techDebt,
      architectureGraph: full.architectureGraph,
      tokensUsed: full.tokensUsed,
      tokensRemaining: full.tokensRemaining,
    });
    setReportId(full._id);
    setCurrentRepoUrl(full.repoUrl || "");
    setActiveView("result");
  } catch (err) {
    console.error("Failed to load full report:", err);
    alert("Could not load report details.");
  }
};

  if (!data) {
    return <LoadingScreen />;
  }

  const avgQuality = data.recentReports?.length
    ? Math.round(
        data.recentReports.reduce((s, r) => s + (r.scores?.codeQuality ?? 0), 0) /
          data.recentReports.length
      )
    : data.stats?.avgScore ?? 0;

  const stats = [
    {
      label: "Total scans",
      value: data.stats?.totalScans ?? 0,
      sub: "repositories analyzed",
      icon: "⌁",
      delay: "0ms",
    },
    {
      label: "Avg code quality",
      value: `${avgQuality}%`,
      sub: "across all reports",
      icon: "◈",
      delay: "70ms",
    },
    {
      label: "DevOps score",
      value: `${data.stats?.devopsScore ?? 0}%`,
      sub: "CI/CD & infrastructure",
      icon: "⚙",
      delay: "140ms",
    },
  ];

  const compactClasses = compact
    ? {
        mainPadding: "px-4 py-4 sm:px-4 lg:px-6",
        topPadding: "pt-14",
        headerSpacing: "gap-0.5",
        heading: "text-lg sm:text-xl",
        subHeading: "text-[10px]",
        statsGap: "gap-2",
        statCardPadding: "p-3",
        statValue: "text-xl",
        analyzerPadding: "p-4 sm:p-4",
        analyzerHeaderGap: "mb-3 gap-2",
        analyzerIconSize: "h-8 w-8",
        analyzerTitle: "text-xs sm:text-sm",
        analyzerDesc: "text-[9px] sm:text-[10px]",
        inputHeight: "h-10",
        inputPadding: "pl-7 pr-3",
        buttonPadding: "px-4 py-2 text-[10px]",
        featuresGap: "gap-1.5",
        featuresTag: "px-2 py-1 text-[9px]",
        recentHeaderPadding: "px-4 py-3",
        recentTitle: "text-xs",
        recentSub: "text-[9px]",
        reportRowPadding: "px-2 py-2",
        emptyStatePadding: "py-8 px-4",
        footerMargin: "mt-4",
        footerText: "text-[9px]",
      }
    : {
        mainPadding: "px-4 py-6 sm:px-6 lg:px-8",
        topPadding: "pt-16",
        headerSpacing: "gap-1",
        heading: "text-xl sm:text-2xl",
        subHeading: "text-xs",
        statsGap: "gap-3",
        statCardPadding: "p-4",
        statValue: "text-2xl",
        analyzerPadding: "p-5 sm:p-6",
        analyzerHeaderGap: "mb-5 gap-3",
        analyzerIconSize: "h-10 w-10",
        analyzerTitle: "text-sm sm:text-base",
        analyzerDesc: "text-[10px] sm:text-xs",
        inputHeight: "h-12",
        inputPadding: "pl-8 pr-4",
        buttonPadding: "px-6 py-3 text-xs",
        featuresGap: "gap-2",
        featuresTag: "px-2.5 py-1.5 text-[9px]",
        recentHeaderPadding: "px-5 py-4",
        recentTitle: "text-sm",
        recentSub: "text-[9px]",
        reportRowPadding: "px-3 py-3",
        emptyStatePadding: "py-12 px-6",
        footerMargin: "mt-6",
        footerText: "text-[9px]",
      };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {activeView === "result" && analysis && (
        <div className="animate-[cv-dash-fadeUp_0.3s_ease_both]">
          <Result
            data={analysis}
            onDownload={downloadPDF}
            generateTestsFn={generateTests}
            repoUrl={currentRepoUrl} // 👈 pass repoUrl for Auto‑Fix
          />
        </div>
      )}

      {activeView === "home" && (
        <main
          ref={mainContainerRef}
          className={`mx-auto w-full max-w-7xl ${compactClasses.mainPadding} ${compactClasses.topPadding}`}
        >
          <div className="space-y-5">
            {/* HEADER – Token‑only, no scan limit */}
            <div className={`flex flex-col ${compactClasses.headerSpacing}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  System online
                </span>

                {data?.user && typeof data.user.tokensRemaining === "number" && (
                  <>
                    <span className="text-[var(--text-muted)] text-[9px]">•</span>
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                      <span className="text-[var(--accent)]">⚡</span>
                      {data.user.tokensRemaining.toLocaleString()} tokens remaining
                      {data.user.totalTokensUsed > 0 && (
                        <span className="text-[var(--text-muted)]/60">
                          &nbsp;({data.user.totalTokensUsed.toLocaleString()} used)
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>

              <h2
                className={`mt-1 font-bold tracking-tight text-[var(--text-primary)] ${compactClasses.heading}`}
              >
                Repository Dashboard
              </h2>
              <p className={`text-[var(--text-muted)] ${compactClasses.subHeading}`}>
                Analyze your GitHub repositories and get AI-powered engineering insights.
              </p>
            </div>

            {/* STATS */}
            <div
              ref={statsContainerRef}
              className={`grid grid-cols-1 ${compactClasses.statsGap} sm:grid-cols-3`}
            >
              {stats.map((s) => (
                <StatCard
                  key={`${s.label}-${statsKey}`}
                  {...s}
                  compact={compact}
                  statValueClass={compactClasses.statValue}
                  statPaddingClass={compactClasses.statCardPadding}
                />
              ))}
            </div>

            {/* ANALYZER */}
            <div
              ref={analyzerRef}
              className="relative overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[0_25px_50px_-30px_var(--accent-soft-strong)]"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-soft)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[var(--accent-soft)] blur-3xl" />

              <div className={`relative ${compactClasses.analyzerPadding}`}>
                <div className={`flex items-start ${compactClasses.analyzerHeaderGap}`}>
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)] ${compactClasses.analyzerIconSize}`}
                  >
                    ⌁
                  </div>
                  <div>
                    <h2 className={`font-semibold text-[var(--text-primary)] ${compactClasses.analyzerTitle}`}>
                      Analyze a GitHub repository
                    </h2>
                    <p className={`mt-1 leading-relaxed text-[var(--text-muted)] ${compactClasses.analyzerDesc}`}>
                      Paste a public repository URL for a complete AI-powered engineering audit.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                      $
                    </span>
                    <input
                      aria-label="GitHub repository URL"
                      className={`w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/20 ${compactClasses.inputHeight} ${compactClasses.inputPadding}`}
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && !loading && generateReport()}
                    />
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    className={`shrink-0 rounded-xl font-semibold transition-all duration-200 ${
                      loading
                        ? "cursor-not-allowed bg-[var(--bg-hover)] text-[var(--text-muted)]"
                        : "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-soft-strong)] hover:bg-[var(--accent-hover)] hover:scale-[1.01] active:scale-95"
                    } ${compactClasses.buttonPadding}`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                          style={{ borderColor: "var(--accent-contrast)", borderTopColor: "transparent", opacity: 0.85 }}
                        />
                        Analyzing…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Analyze repository
                        <span>→</span>
                      </span>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] px-3 py-2.5 text-[10px] text-[var(--color-danger)] animate-[cv-dash-fadeUp-sm_0.2s_ease_both]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger-soft)]">
                      !
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: error }} />
                  </div>
                )}

                <div className={`mt-4 flex flex-wrap ${compactClasses.featuresGap}`}>
                  {[
                    { label: "Architecture", icon: "◈" },
                    { label: "Bug detection", icon: "⚡" },
                    { label: "Security", icon: "⌾" },
                    { label: "Test generation", icon: "✓" },
                    { label: "Roadmap", icon: "→" },
                  ].map((f) => (
                    <span
                      key={f.label}
                      className={`flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)] ${compactClasses.featuresTag}`}
                    >
                      <span className="text-[var(--accent)]">{f.icon}</span>
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT REPORTS */}
            {data.recentReports?.length > 0 && (
              <div ref={recentReportsRef} className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[0_20px_45px_-30px_var(--accent-soft-strong)]">
                <div
                  className={`flex items-center justify-between border-b border-[var(--border-dark)] ${compactClasses.recentHeaderPadding}`}
                >
                  <div>
                    <h2 className={`font-semibold text-[var(--text-primary)] ${compactClasses.recentTitle}`}>
                      Recent reports
                    </h2>
                    <p className={`mt-1 text-[var(--text-muted)] ${compactClasses.recentSub}`}>
                      Your latest repository analysis results
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      key={statsKey}
                      className="hidden items-center gap-1.5 text-[9px] text-[var(--color-success)] sm:flex"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                      Live
                    </span>
                    <button
                      onClick={() => navigate("/history")}
                      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-medium text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent-soft)] active:scale-[0.96] ${compact ? "px-2 py-1" : ""}`}
                    >
                      View all →
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 p-2">
                  {data.recentReports.map((report) => (
                    <div
                      key={`${report._id}-${statsKey}`}
                      className="report-row"
                    >
                      <ReportRow report={report} onView={() => openResult(report)} compact={compact} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {!data.recentReports?.length && (
              <div
                ref={emptyStateRef}
                className="empty-state rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] text-center"
              >
                <div className={`${compactClasses.emptyStatePadding}`}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] text-lg text-[var(--text-muted)]">
                    ◈
                  </div>
                  <h3 className={`font-semibold text-[var(--text-secondary)] ${compact ? "text-xs" : "text-sm"}`}>
                    No reports yet
                  </h3>
                  <p className={`mx-auto mt-1.5 max-w-sm leading-relaxed text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}>
                    Enter a public GitHub repository above to generate your first CodeVerity audit.
                  </p>
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div
              className={`flex items-center justify-center gap-2 py-3 text-[var(--text-muted)] ${compactClasses.footerText} ${compactClasses.footerMargin}`}
            >
              <span>CodeVerity</span>
              <span>•</span>
              <span>AI Repository Intelligence</span>
            </div>
          </div>
        </main>
      )}

      <style>{`
        @keyframes cv-dash-fadeUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cv-dash-fadeUp-sm {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   SUB-COMPONENTS (unchanged)
========================================================= */

function CodeVerityLogo() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg shadow-[var(--accent-soft-strong)]">
      <div className="absolute inset-[1px] rounded-[11px] bg-[var(--bg-primary)]" />
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-[var(--accent)]"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-md bg-[var(--bg-secondary)] border border-[var(--border-light)]">
        <span className="text-[6px] font-bold text-[var(--accent)]">&lt;/&gt;</span>
      </div>
      <span className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
    </div>
  );
}

function StatCard({ label, value, sub, icon, delay, compact, statValueClass, statPaddingClass }) {
  const animated = useCountUp(value, 800);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--accent)]/20 bg-[var(--bg-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-20px_var(--accent-soft-strong)] ${statPaddingClass}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--accent-soft)] blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-medium uppercase tracking-[0.12em] text-[var(--text-muted)] text-[9px]">
            {label}
          </p>
          <p className={`mt-2 font-bold tabular-nums text-[var(--text-primary)] ${statValueClass}`}>
            {animated}
          </p>
          <p className="mt-1 text-[var(--text-muted)] text-[9px]">{sub}</p>
        </div>
        <div
          className={`flex items-center justify-center rounded-lg text-sm bg-[var(--accent-soft)] text-[var(--accent)] ${
            compact ? "h-6 w-6 text-xs" : "h-8 w-8"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ReportRow({ report, onView, compact }) {
  const grade = report.grade ?? "N/A";
  const gradeColor =
    {
      A: {
        text: "text-[var(--color-success)]",
        bg: "bg-[var(--color-success-soft)]",
        border: "border-[var(--color-success)]/20",
      },
      B: {
        text: "text-[var(--color-info)]",
        bg: "bg-[var(--color-info-soft)]",
        border: "border-[var(--color-info)]/20",
      },
      C: {
        text: "text-[var(--color-warning)]",
        bg: "bg-[var(--color-warning-soft)]",
        border: "border-[var(--color-warning)]/20",
      },
      D: {
        text: "text-[var(--color-caution)]",
        bg: "bg-[var(--color-caution-soft)]",
        border: "border-[var(--color-caution)]/20",
      },
      F: {
        text: "text-[var(--color-danger)]",
        bg: "bg-[var(--color-danger-soft)]",
        border: "border-[var(--color-danger)]/20",
      },
    }[grade[0]] ?? {
      text: "text-[var(--text-secondary)]",
      bg: "bg-[var(--bg-primary)]",
      border: "border-[var(--border-light)]",
    };

  const avg = report.scores
    ? Math.round(
        (report.scores.codeQuality +
          report.scores.security +
          report.scores.performance +
          report.scores.maintainability) /
          4
      )
    : 0;

  const repoName = report.repoUrl?.replace("https://github.com/", "") ?? "Unknown repo";
  const date = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  const rowPadding = compact ? "px-2 py-2" : "px-3 py-3";
  const gradeSize = compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";
  const repoFontSize = compact ? "text-[10px]" : "text-[11px]";
  const dateFontSize = "text-[9px]";
  const scoreBadgePadding = compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[9px]";
  const viewButtonPadding = compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[9px]";

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border border-transparent transition-all duration-150 hover:border-[var(--border-light)] hover:bg-[var(--bg-primary)] ${rowPadding}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg border font-bold ${gradeColor.text} ${gradeColor.bg} ${gradeColor.border} ${gradeSize}`}
      >
        {grade}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] ${repoFontSize}`}>
          {repoName}
        </p>
        <p className={`mt-0.5 text-[var(--text-muted)] ${dateFontSize}`}>
          {date} · average score {avg}%
        </p>
      </div>

      {report.scores && (
        <div className="hidden h-7 items-end gap-1 md:flex">
          {[
            report.scores.codeQuality,
            report.scores.security,
            report.scores.performance,
            report.scores.maintainability,
          ].map((v, i) => (
            <div
              key={i}
              className="w-1.5 rounded-sm bg-[var(--accent)]/50 transition-all duration-200 group-hover:bg-[var(--accent)]"
              style={{ height: `${Math.max(20, v)}%` }}
            />
          ))}
        </div>
      )}

      <div
        className={`hidden rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] sm:block ${scoreBadgePadding}`}
      >
        {avg}%
      </div>

      <button
        onClick={onView}
        className={`rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] font-medium text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] active:scale-[0.96] ${viewButtonPadding}`}
      >
        View →
      </button>
    </div>
  );
}

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const raw = String(target).replace("%", "");
    const num = parseFloat(raw) || 0;
    const isPct = String(target).includes("%");
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(num * eased);
      setValue(isPct ? `${current}%` : current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4">
        <CodeVerityLogo />
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-light)] border-t-[var(--accent)]" />
        <p className="font-mono text-[10px] text-[var(--text-muted)]">loading dashboard…</p>
      </div>
    </div>
  );
}