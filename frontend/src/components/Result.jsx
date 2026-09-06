import { useState } from "react";
import { useAuth } from "../App"; // 👈 needed for token
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

import { generateTests as defaultGenerateTests } from "../api/github";
import { usePreferences } from "../context/PreferencesContext";

// ── Grade → color mapping (matches History.jsx's 5-tier scale) ──
function gradeAccent(grade) {
  const map = {
    A: "text-[var(--color-success)]",
    B: "text-[var(--color-info)]",
    C: "text-[var(--color-warning)]",
    D: "text-[var(--color-caution)]",
    F: "text-[var(--color-danger)]",
  };
  return map[grade?.[0]] ?? "text-[var(--text-muted)]";
}

// ── Severity → color mapping ────────────────────────────────
function severityColor(severity) {
  const map = {
    critical:
      "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/30",
    high: "bg-[var(--color-caution-soft)] text-[var(--color-caution)] border-[var(--color-caution)]/30",
    medium:
      "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
    low: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/30",
  };
  return (
    map[severity?.toLowerCase()] ??
    "bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border-light)]"
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Result({
  data,
  sourceCode: sourceCodeProp = "",
  onDownload,
  generateTestsFn,
  repoUrl: repoUrlProp = "", // 👈 repository URL for auto‑fix
  autoFixFn, // 👈 optional override for testing
}) {
  const { token } = useAuth(); // 👈 get JWT token
  const [activeTab, setActiveTab] = useState("audit");
  const [testData, setTestData] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [fixing, setFixing] = useState({}); // 👈 track which issues are being fixed

  const { compact, showScores } = usePreferences();

  if (!data) return null;

  const sourceCode = sourceCodeProp || data?._sourceCode || "";
  const doGenerateTests = generateTestsFn ?? defaultGenerateTests;

  // ---- existing fields ----
  const {
    summary = "No summary generated.",
    architecture = [],
    bugs = [],
    securityIssues = [],
    futureRoadmap = [],
    toolsAndPackages = [],
    scores = {},
    grade = "N/A",
    finalVerdict = "No verdict provided.",
    repoUrl = repoUrlProp || data?.repoUrl || "", // fallback
  } = data;

  // ---- new fields ----
  const {
    healthScore = { overall: 0, grade: "N/A", breakdown: {} },
    securityVulnerabilities = [],
    dependencyVulnerabilities = [],
    secrets = [],
    techDebt = { estimatedHours: 0, issues: [] },
    architectureGraph = { nodes: [], edges: [] },
    tokensUsed = 0,
    tokensRemaining = 0,
  } = data;

  const chartData = [
    { metric: "Code Quality", value: scores.codeQuality || 0 },
    { metric: "Security", value: scores.security || 0 },
    { metric: "Performance", value: scores.performance || 0 },
    { metric: "Maintainability", value: scores.maintainability || 0 },
  ];

  // ── Test generation ─────────────────────────────────────────
  const runGenerateTests = async () => {
    if (!sourceCode?.trim()) {
      setTestError("No source code available. Please re-run the analysis.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    try {
      const result = await doGenerateTests(sourceCode);
      setTestData(result);
    } catch (err) {
      setTestError(err.message ?? "Test generation failed.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (id === "tests" && !testData && !testLoading) {
      runGenerateTests();
    }
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ── Auto‑Fix ──────────────────────────────────────────────────
  const handleAutoFix = async (issue, type = "bug") => {
    const issueId = issue._id || issue.id || Date.now();
    setFixing((prev) => ({ ...prev, [issueId]: true }));

    try {
      // If a custom function is provided, use it (for testing)
      if (autoFixFn) {
        await autoFixFn(issue);
        setFixing((prev) => ({ ...prev, [issueId]: false }));
        return;
      }

      const repo = repoUrl || data?.repoUrl || repoUrlProp;
      if (!repo) {
        alert("Repository URL not available. Cannot create a fix PR.");
        setFixing((prev) => ({ ...prev, [issueId]: false }));
        return;
      }

      // Determine file path from various possible fields
      const filePath = issue.file || issue.location || issue.filePath || "";
      const lineNumber = issue.line || issue.lineNumber || "";
      const description =
        issue.title || issue.issue || issue.description || "Fix issue";
      const suggestedFix = issue.suggestedFix || issue.fix || "";

      const response = await fetch("/api/github/auto-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoUrl: repo,
          issueId,
          filePath,
          lineNumber,
          description,
          currentCode: sourceCode || data?._sourceCode || "",
          suggestedFix,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Fix PR created! View it here: ${result.prUrl}`);
        window.open(result.prUrl, "_blank");
      } else {
        alert(`❌ Failed to create fix: ${result.error}`);
        if (result.action === "connect_github") {
          alert(
            "Please connect your GitHub account in settings to use Auto‑Fix.",
          );
        }
      }
    } catch (err) {
      console.error("Auto‑fix error:", err);
      alert("An error occurred while creating the fix PR.");
    } finally {
      setFixing((prev) => ({ ...prev, [issueId]: false }));
    }
  };

  // ── Compact overrides ──────────────────────────────────────
  const containerPadding = compact
    ? "px-4 py-4 sm:px-5 lg:px-6"
    : "px-4 py-6 sm:px-6 lg:px-8";
  const headerMargin = compact ? "pb-3" : "pb-5";
  const headingSize = compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl";
  const gradeBoxPadding = compact ? "px-3 py-2" : "px-4 py-2.5";
  const gradeTextSize = compact ? "text-xl" : "text-2xl";
  const scoreCardGap = compact ? "gap-2" : "gap-3";
  const scoreCardPadding = compact ? "p-2.5" : "p-3.5";
  const glassCardPadding = compact ? "p-3" : "p-4";
  const glassCardHeaderPadding = compact ? "px-3 py-2" : "px-4 py-3";
  const tabPadding = compact ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-xs";
  const buttonPadding = compact
    ? "px-2 py-1 text-[10px]"
    : "px-3 py-1.5 text-[11px]";
  const testFilePadding = compact ? "px-2 py-1.5" : "px-3 py-2";
  const testFileFont = compact ? "text-[10px]" : "text-[11px]";
  const codeBlockPadding = compact ? "p-3" : "p-4";
  const codeBlockFont = compact ? "text-[10px]" : "text-[11px]";

  return (
    <div
      className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden ${containerPadding}`}
    >
      {/* Background effects now theme-driven instead of the old
          hardcoded indigo rgba(99,102,241,...) literals. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(var(--accent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[30%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-soft) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-soft) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-7xl space-y-5 relative z-10">
        {/* Corner brackets */}
        <div className="relative">
          <span className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]/50 rounded-tl-2xl z-10" />
          <span className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-[var(--accent)]/50 rounded-tr-2xl z-10" />
          <span className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-[var(--accent)]/50 rounded-bl-2xl z-10" />
          <span className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]/50 rounded-br-2xl z-10" />
        </div>

        {/* HEADER */}
        <div
          className={`flex flex-col gap-4 border-b border-[var(--border-dark)] ${headerMargin} md:flex-row md:items-center md:justify-between`}
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`flex items-center justify-center rounded-lg bg-[var(--accent)] text-sm shadow-lg shadow-[var(--accent-soft-strong)] ${compact ? "h-6 w-6" : "h-8 w-8"}`}
              >
                <span className="text-[var(--accent-contrast)]">⌘</span>
              </div>
              <span
                className={`font-semibold uppercase tracking-[0.2em] text-[var(--accent)] ${compact ? "text-[9px]" : "text-[10px]"}`}
              >
                CodeVerity
              </span>
            </div>
            <h1
              className={`font-bold tracking-tight text-[var(--text-primary)] ${headingSize}`}
            >
              AI Code Analysis Report
            </h1>
            <p
              className={`mt-1 text-xs text-[var(--text-muted)] ${compact ? "text-[10px]" : ""}`}
            >
              Detailed analysis of your GitHub repository.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[0_10px_25px_-18px_var(--accent-soft-strong)] ${gradeBoxPadding}`}
            >
              <p
                className={`font-medium uppercase tracking-wider text-[var(--text-muted)] text-[9px]`}
              >
                Final Grade
              </p>
              <div
                className={`mt-0.5 font-bold ${gradeTextSize} ${gradeAccent(grade)}`}
              >
                {grade}
              </div>
            </div>
            {onDownload && (
              <button
                onClick={onDownload}
                className={`group relative overflow-hidden rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] font-semibold text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] active:scale-[0.97] ${compact ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-xs"}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>↓</span>
                  {compact ? "PDF" : "Download Report"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SCORE CARDS */}
        <div className={`grid grid-cols-2 ${scoreCardGap} md:grid-cols-4`}>
          <ScoreCard
            label="Code Quality"
            value={scores.codeQuality}
            icon="◈"
            compact={compact}
          />
          <ScoreCard
            label="Security"
            value={scores.security}
            icon="◇"
            compact={compact}
          />
          <ScoreCard
            label="Performance"
            value={scores.performance}
            icon="↗"
            compact={compact}
          />
          <ScoreCard
            label="Maintainability"
            value={scores.maintainability}
            icon="◎"
            compact={compact}
          />
        </div>

        {/* TAB BAR */}
        <div className="flex items-center border-b border-[var(--border-dark)]">
          <div className="flex items-center gap-1">
            {[
              { id: "audit", label: "Audit Report" },
              { id: "full", label: "Full Report" },
              { id: "tests", label: "Test Cases" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex items-center gap-2 font-medium transition-colors duration-150 ${tabPadding} ${
                  activeTab === tab.id
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <span
                  className={
                    activeTab === tab.id
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  {tab.id === "audit" ? "◉" : tab.id === "full" ? "◈" : "◇"}
                </span>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--accent)]" />
                )}
              </button>
            ))}
          </div>
          {!testData && !testLoading && activeTab === "audit" && (
            <button
              onClick={() => handleTabClick("tests")}
              className={`ml-auto mb-1 flex items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] font-semibold text-[var(--accent)] transition-all duration-150 hover:bg-[var(--accent-soft-strong)] active:scale-[0.97] ${buttonPadding}`}
            >
              <span>+</span>
              {compact ? "Tests" : "Generate Tests"}
            </button>
          )}
        </div>

        {/* ===== AUDIT TAB ===== */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <GlassCard title="Executive Summary" icon="◈" compact={compact}>
              <p
                className={`leading-6 text-[var(--text-secondary)] ${compact ? "text-xs" : "text-sm"}`}
              >
                {summary}
              </p>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard
                title="Quality Score Analysis"
                icon="◎"
                compact={compact}
              >
                <div
                  style={{
                    width: "100%",
                    height: compact ? 220 : 280,
                    minHeight: compact ? 220 : 280,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={200}
                  >
                    <RadarChart data={chartData}>
                      <PolarGrid stroke="var(--border-light)" />
                      <PolarAngleAxis
                        dataKey="metric"
                        stroke="var(--text-muted)"
                        tick={{
                          fill: "var(--text-secondary)",
                          fontSize: compact ? 9 : 11,
                        }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        stroke="var(--border-light)"
                        tick={{
                          fill: "var(--text-muted)",
                          fontSize: compact ? 7 : 9,
                        }}
                      />
                      <Radar
                        dataKey="value"
                        stroke="var(--accent)"
                        fill="var(--accent)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard title="Final Verdict" icon="✓" compact={compact}>
                <div
                  className={`flex h-full items-center ${compact ? "min-h-[200px]" : "min-h-[280px]"}`}
                >
                  <div className="w-full">
                    <div
                      className={`flex items-center gap-3 ${compact ? "mb-3" : "mb-5"}`}
                    >
                      <div
                        className={`flex items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] ${compact ? "h-8 w-8" : "h-10 w-10"}`}
                      >
                        ✓
                      </div>
                      <div>
                        <p
                          className={`uppercase tracking-wider text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
                        >
                          Overall Assessment
                        </p>
                        <p
                          className={`font-semibold text-[var(--text-primary)] ${compact ? "text-xs" : "text-sm"}`}
                        >
                          Repository Analysis Complete
                        </p>
                      </div>
                    </div>
                    <p
                      className={`leading-6 text-[var(--text-secondary)] ${compact ? "text-xs" : "text-sm"}`}
                    >
                      {finalVerdict}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard title="Architecture Review" icon="⌘" compact={compact}>
              {architecture.length ? (
                <div className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}>
                  {architecture.map((a, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] transition-colors duration-150 hover:border-[var(--border-light)] ${compact ? "p-2" : "p-3"}`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`flex items-center justify-center rounded bg-[var(--accent-soft)] text-[10px] text-[var(--accent)] ${compact ? "h-4 w-4 text-[9px]" : "h-5 w-5"}`}
                        >
                          {i + 1}
                        </span>
                        <p
                          className={`font-semibold text-[var(--accent)] ${compact ? "text-[10px]" : "text-xs"}`}
                        >
                          {a.component}
                        </p>
                      </div>
                      <p
                        className={`pl-7 leading-5 text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
                      >
                        {a.recommendation || a.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  text="No architecture insights provided."
                  compact={compact}
                />
              )}
            </GlassCard>

            <GlassCard title="Identified Bugs" icon="!" compact={compact}>
              {bugs.length ? (
                <div className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}>
                  {bugs.map((b, i) => {
                    const issueId = b._id || b.id || i;
                    return (
                      <AlertCard key={i} type="error" compact={compact}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)] ${compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs"}`}
                          >
                            !
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold text-[var(--text-primary)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              {b.title}{" "}
                              <span className="text-[var(--color-danger)]">
                                ({b.impact})
                              </span>
                            </p>
                            <p
                              className={`mt-1 leading-5 text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              {b.description}
                            </p>
                            <p
                              className={`mt-2 text-[var(--accent)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              <span className="font-semibold">Fix:</span>{" "}
                              {b.suggestedFix || b.fix}
                            </p>
                            {/* 👇 AUTO-FIX BUTTON */}
                            <button
                              onClick={() => handleAutoFix(b, "bug")}
                              disabled={fixing[issueId]}
                              className={`mt-2 flex items-center gap-1 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]"}`}
                            >
                              {fixing[issueId] ? (
                                <>
                                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-white" />
                                  Fixing…
                                </>
                              ) : (
                                <>
                                  <span>⚡</span> Auto-Fix
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </AlertCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No major bugs detected." compact={compact} />
              )}
            </GlassCard>

            <GlassCard title="Security Assessment" icon="◇" compact={compact}>
              {securityIssues.length ? (
                <div className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}>
                  {securityIssues.map((s, i) => {
                    const issueId = s._id || s.id || i;
                    return (
                      <AlertCard key={i} type="warning" compact={compact}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning-soft)] text-[var(--color-warning)] ${compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs"}`}
                          >
                            !
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold text-[var(--text-primary)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              {s.issue}
                            </p>
                            {s.risk && (
                              <p
                                className={`mt-1 text-[var(--color-danger)] ${compact ? "text-[10px]" : "text-xs"}`}
                              >
                                Risk: {s.risk}
                              </p>
                            )}
                            <p
                              className={`mt-2 text-[var(--accent)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              Recommendation: {s.recommendation}
                            </p>
                            {/* 👇 AUTO-FIX BUTTON */}
                            <button
                              onClick={() => handleAutoFix(s, "security")}
                              disabled={fixing[issueId]}
                              className={`mt-2 flex items-center gap-1 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]"}`}
                            >
                              {fixing[issueId] ? (
                                <>
                                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-white" />
                                  Fixing…
                                </>
                              ) : (
                                <>
                                  <span>⚡</span> Auto-Fix
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </AlertCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  text="No critical security issues reported."
                  compact={compact}
                />
              )}
            </GlassCard>

            <GlassCard title="Future Roadmap" icon="→" compact={compact}>
              {futureRoadmap.length ? (
                <div className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}>
                  {futureRoadmap.map((f, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] ${compact ? "p-2" : "p-3"}`}
                    >
                      <div
                        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ${compact ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"}`}
                      >
                        {i + 1}
                      </div>
                      <p
                        className={`leading-5 text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
                      >
                        <b className="text-[var(--text-primary)]">
                          {f.phase || f.feature}:
                        </b>{" "}
                        {f.details || f.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No roadmap generated." compact={compact} />
              )}
            </GlassCard>

            <GlassCard title="Tools & Packages" icon="◇" compact={compact}>
              {toolsAndPackages.length ? (
                <div
                  className={`flex flex-wrap gap-2 ${compact ? "gap-1.5" : ""}`}
                >
                  {toolsAndPackages.map((t, i) => (
                    <span
                      key={i}
                      className={`rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] font-mono text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] ${compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState text="No tools info available." compact={compact} />
              )}
            </GlassCard>
          </div>
        )}

        {/* ===== FULL REPORT TAB ===== */}
        {activeTab === "full" && (
          <div className="space-y-4">
            {(tokensUsed > 0 || tokensRemaining > 0) && (
              <div
                className={`flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 ${compact ? "p-3" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent)]">⚡</span>
                  <span
                    className={`text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-sm"}`}
                  >
                    Tokens Used:{" "}
                    <strong className="text-[var(--text-primary)]">
                      {tokensUsed.toLocaleString()}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent)]">🔋</span>
                  <span
                    className={`text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-sm"}`}
                  >
                    Remaining:{" "}
                    <strong className="text-[var(--text-primary)]">
                      {tokensRemaining.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <GlassCard title="Health Score" icon="◈" compact={compact}>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                <div className="flex shrink-0 flex-col items-center">
                  <div className="relative">
                    <svg
                      width={compact ? 120 : 160}
                      height={compact ? 120 : 160}
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="var(--border-light)"
                        strokeWidth="10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="10"
                        strokeDasharray={`${(healthScore.overall / 100) * 314.16}, 314.16`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                      <text
                        x="60"
                        y="56"
                        textAnchor="middle"
                        fontSize="24"
                        fontWeight="bold"
                        fill="var(--text-primary)"
                      >
                        {healthScore.overall}
                      </text>
                      <text
                        x="60"
                        y="76"
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--text-muted)"
                      >
                        / 100
                      </text>
                    </svg>
                  </div>
                  <div
                    className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-1 font-bold ${gradeAccent(healthScore.grade)} ${compact ? "text-sm" : "text-base"}`}
                  >
                    Grade: {healthScore.grade}
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className={`grid grid-cols-2 gap-2 ${compact ? "gap-1.5" : ""}`}
                  >
                    <ScoreMini
                      label="Code Quality"
                      value={healthScore.breakdown?.codeQuality || 0}
                      compact={compact}
                    />
                    <ScoreMini
                      label="Security"
                      value={healthScore.breakdown?.security || 0}
                      compact={compact}
                    />
                    <ScoreMini
                      label="Performance"
                      value={healthScore.breakdown?.performance || 0}
                      compact={compact}
                    />
                    <ScoreMini
                      label="Maintainability"
                      value={healthScore.breakdown?.maintainability || 0}
                      compact={compact}
                    />
                  </div>
                  <p
                    className={`mt-3 text-xs text-[var(--text-muted)] ${compact ? "text-[10px]" : ""}`}
                  >
                    Health score combines code quality, security, performance,
                    and maintainability, with penalties for vulnerabilities and
                    technical debt.
                  </p>
                </div>
              </div>
            </GlassCard>

            {securityVulnerabilities.length > 0 && (
              <GlassCard
                title={`Security Vulnerabilities (${securityVulnerabilities.length})`}
                icon="◇"
                compact={compact}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-dark)]">
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Severity
                        </th>
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Title
                        </th>
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          File
                        </th>
                        <th className="pb-2 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Line
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityVulnerabilities.map((v, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border-dark)] transition-colors duration-150 last:border-none hover:bg-[var(--bg-hover)]/40"
                        >
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-block rounded border px-2 py-0.5 text-[9px] font-medium ${severityColor(v.severity)}`}
                            >
                              {v.severity}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-[var(--text-secondary)]">
                            {v.title}
                          </td>
                          <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">
                            {v.file || "—"}
                          </td>
                          <td className="py-2 font-mono text-[var(--text-muted)]">
                            {v.line || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {dependencyVulnerabilities.length > 0 && (
              <GlassCard
                title={`Dependency Vulnerabilities (${dependencyVulnerabilities.length})`}
                icon="◇"
                compact={compact}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-dark)]">
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Package
                        </th>
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Version
                        </th>
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          CVE
                        </th>
                        <th className="pb-2 pr-4 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Severity
                        </th>
                        <th className="pb-2 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          Fixed In
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dependencyVulnerabilities.map((v, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border-dark)] transition-colors duration-150 last:border-none hover:bg-[var(--bg-hover)]/40"
                        >
                          <td className="py-2 pr-4 font-mono text-[var(--text-secondary)]">
                            {v.package}
                          </td>
                          <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">
                            {v.version}
                          </td>
                          <td className="py-2 pr-4 font-mono text-[var(--accent)]">
                            {v.cve}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-block rounded border px-2 py-0.5 text-[9px] font-medium ${severityColor(v.severity)}`}
                            >
                              {v.severity}
                            </span>
                          </td>
                          <td className="py-2 font-mono text-[var(--text-muted)]">
                            {v.fixedIn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* ===== SECRETS (filtered) ===== */}
            {(() => {
              // Filter out likely false positives
              const filteredSecrets = secrets.filter((s) => {
                // Skip package-lock.json and package.json
                if (
                  s.file?.includes("package-lock.json") ||
                  s.file?.includes("package.json")
                ) {
                  return false;
                }
                // Skip yarn.lock, pnpm-lock.yaml
                if (
                  s.file?.includes("yarn.lock") ||
                  s.file?.includes("pnpm-lock.yaml")
                ) {
                  return false;
                }
                // Skip "Generic Secret" pattern
                if (
                  s.pattern === "Generic Secret" ||
                  s.pattern?.toLowerCase().includes("generic")
                ) {
                  return false;
                }
                // Skip if confidence is too low (optional)
                if (s.confidence && s.confidence < 40) {
                  return false;
                }
                return true;
              });

              if (filteredSecrets.length === 0) return null;

              return (
                <GlassCard
                  title={`Detected Secrets (${filteredSecrets.length})`}
                  icon="!"
                  compact={compact}
                >
                  <div className="space-y-2">
                    {filteredSecrets.map((s, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-2"
                      >
                        <span className="rounded bg-[var(--color-danger-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-danger)]">
                          {s.pattern}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-secondary)]">
                          {s.file}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          line {s.line}
                        </span>
                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                          Confidence: {s.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              );
            })()}

            <GlassCard title="Technical Debt" icon="◇" compact={compact}>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                      Estimated Hours
                    </p>
                    <p className="text-2xl font-bold text-[var(--accent)]">
                      {techDebt.estimatedHours}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Estimated effort to fix all identified issues.
                  </p>
                </div>
                {techDebt.issues?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-[var(--text-muted)]">
                      Breakdown:
                    </p>
                    {techDebt.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                            issue.severity === "critical"
                              ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                              : issue.severity === "major"
                                ? "bg-[var(--color-caution-soft)] text-[var(--color-caution)]"
                                : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="flex-1 truncate text-[var(--text-secondary)]">
                          {issue.description}
                        </span>
                        <span className="font-mono text-[var(--text-muted)]">
                          {issue.effort}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>

            {architectureGraph.nodes?.length > 0 && (
              <GlassCard title="Architecture Graph" icon="⌘" compact={compact}>
                <div className="overflow-x-auto">
                  <div className="min-w-[300px]">
                    <svg
                      width="100%"
                      height="400"
                      viewBox="0 0 800 400"
                      className="mx-auto"
                    >
                      {(() => {
                        const nodes = architectureGraph.nodes || [];
                        const edges = architectureGraph.edges || [];
                        const centerX = 400,
                          centerY = 200;
                        const radius = 150;
                        const n = nodes.length;
                        if (n === 0) return null;
                        const positions = nodes.map((node, i) => {
                          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                          return {
                            x: centerX + radius * Math.cos(angle),
                            y: centerY + radius * Math.sin(angle),
                          };
                        });
                        const nodeMap = Object.fromEntries(
                          nodes.map((node, i) => [node.id, i]),
                        );
                        return (
                          <>
                            {edges.map((edge, i) => {
                              const fromIdx = nodeMap[edge.from];
                              const toIdx = nodeMap[edge.to];
                              if (fromIdx === undefined || toIdx === undefined)
                                return null;
                              return (
                                <line
                                  key={`edge-${i}`}
                                  x1={positions[fromIdx].x}
                                  y1={positions[fromIdx].y}
                                  x2={positions[toIdx].x}
                                  y2={positions[toIdx].y}
                                  stroke="var(--border-light)"
                                  strokeWidth="2"
                                  opacity="0.5"
                                />
                              );
                            })}
                            {nodes.map((node, i) => (
                              <g key={node.id}>
                                <circle
                                  cx={positions[i].x}
                                  cy={positions[i].y}
                                  r="20"
                                  fill="var(--bg-card)"
                                  stroke="var(--accent)"
                                  strokeWidth="2"
                                />
                                <text
                                  x={positions[i].x}
                                  y={positions[i].y + 5}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="var(--text-secondary)"
                                  className="font-mono"
                                >
                                  {node.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Visualisation of module dependencies. Each node represents a
                  file or module; edges show import relationships.
                </p>
              </GlassCard>
            )}

            {!healthScore.overall &&
              !securityVulnerabilities.length &&
              !dependencyVulnerabilities.length &&
              !secrets.length &&
              !techDebt.estimatedHours &&
              !architectureGraph.nodes?.length && (
                <EmptyState
                  text="No enhanced analysis data available. Run a fresh analysis to see health score, vulnerabilities, and more."
                  compact={compact}
                />
              )}
          </div>
        )}

        {/* ===== TESTS TAB ===== */}
        {activeTab === "tests" && (
          <div className="space-y-4">
            {testLoading && (
              <GlassCard title="Generating Tests..." icon="◌" compact={compact}>
                <div
                  className={`flex flex-col items-center gap-4 ${compact ? "py-8" : "py-12"}`}
                >
                  <div className="relative">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-light)] border-t-[var(--accent)]" />
                  </div>
                  <div className="text-center">
                    <p
                      className={`font-medium text-[var(--text-secondary)] ${compact ? "text-xs" : "text-sm"}`}
                    >
                      Analysing repository
                    </p>
                    <p
                      className={`mt-1 text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-xs"}`}
                    >
                      Writing test cases based on your code...
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {testError && !testLoading && (
              <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Test Generation Failed
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[var(--text-secondary)]">
                      {testError}
                    </p>
                    <button
                      onClick={runGenerateTests}
                      className="mt-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] transition-all duration-150 hover:bg-[var(--color-danger)]/20 active:scale-[0.97]"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {testData && !testLoading && (
              <>
                <div
                  className={`flex flex-wrap items-center gap-2 ${compact ? "gap-1.5" : ""}`}
                >
                  <Badge color="accent" compact={compact}>
                    Framework: {testData.framework ?? "jest"}
                  </Badge>
                  <Badge color="accent" compact={compact}>
                    Est. Coverage:{" "}
                    {testData.coverageSummary?.estimatedCoverage ?? 0}%
                  </Badge>
                  <span
                    className={`ml-auto text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
                  >
                    {testData.setupInstructions}
                  </span>
                </div>

                {testData.coverageSummary && (
                  <GlassCard
                    title="Coverage Summary"
                    icon="◉"
                    compact={compact}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
                        >
                          Estimated Coverage
                        </span>
                        <span
                          className={`font-bold text-[var(--accent)] ${compact ? "text-xs" : "text-sm"}`}
                        >
                          {testData.coverageSummary.estimatedCoverage}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border-dark)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                          style={{
                            width: `${testData.coverageSummary.estimatedCoverage}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`leading-5 text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
                      >
                        {testData.coverageSummary.recommendation}
                      </p>
                      {testData.coverageSummary.uncoveredAreas?.length > 0 && (
                        <div
                          className={`flex flex-wrap gap-2 pt-1 ${compact ? "gap-1.5" : ""}`}
                        >
                          {testData.coverageSummary.uncoveredAreas.map(
                            (a, i) => (
                              <span
                                key={i}
                                className={`rounded-md border border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning)] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
                              >
                                {a}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}

                {testData.testFiles?.length > 0 && (
                  <GlassCard
                    title="Generated Test Files"
                    icon="◇"
                    compact={compact}
                  >
                    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
                      {testData.testFiles.map((file, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)]"
                        >
                          <div
                            className={`flex items-center justify-between border-b border-[var(--border-dark)] bg-[var(--bg-card)] ${testFilePadding}`}
                          >
                            <span
                              className={`max-w-[60%] truncate font-mono text-[var(--accent)] ${testFileFont}`}
                            >
                              {file.fileName}
                            </span>
                            <div className="flex items-center gap-3">
                              <span
                                className={`hidden max-w-[300px] truncate text-[var(--text-muted)] md:block ${compact ? "text-[9px]" : "text-[10px]"}`}
                              >
                                {file.description}
                              </span>
                              <button
                                onClick={() => copy(file.testCode, `file-${i}`)}
                                className={`rounded-md border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all duration-150 hover:text-[var(--text-primary)] active:scale-[0.95] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
                              >
                                {copiedId === `file-${i}` ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                          <pre
                            className={`overflow-x-auto bg-[var(--bg-primary)] text-[var(--text-secondary)] ${codeBlockPadding} ${codeBlockFont}`}
                          >
                            <code>{file.testCode}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {testData.unitTests?.length > 0 && (
                  <GlassCard title="Unit Tests" icon="◇" compact={compact}>
                    <div className={`space-y-5 ${compact ? "space-y-3" : ""}`}>
                      {testData.unitTests.map((fn, i) => (
                        <div key={i}>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`font-mono font-semibold text-[var(--accent)] ${compact ? "text-[10px]" : "text-xs"}`}
                            >
                              {fn.functionName}()
                            </span>
                            <span
                              className={`text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
                            >
                              {fn.filePath}
                            </span>
                          </div>
                          <p
                            className={`mb-3 text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-[11px]"}`}
                          >
                            {fn.description}
                          </p>
                          <div
                            className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}
                          >
                            {fn.cases?.map((c, j) => (
                              <TestCaseRow
                                key={j}
                                testCase={c}
                                id={`unit-${i}-${j}`}
                                copiedId={copiedId}
                                onCopy={copy}
                                compact={compact}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {testData.edgeCases?.length > 0 && (
                  <GlassCard title="Edge Cases" icon="!" compact={compact}>
                    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
                      {testData.edgeCases.map((c, i) => (
                        <div key={i}>
                          <p
                            className={`mb-1 font-mono text-[var(--color-warning)] ${compact ? "text-[9px]" : "text-[10px]"}`}
                          >
                            {c.functionName}()
                          </p>
                          <TestCaseRow
                            testCase={c}
                            id={`edge-${i}`}
                            copiedId={copiedId}
                            onCopy={copy}
                            accent="warning"
                            compact={compact}
                          />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {testData.integrationTests?.length > 0 && (
                  <GlassCard
                    title="Integration Tests"
                    icon="↗"
                    compact={compact}
                  >
                    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
                      {testData.integrationTests.map((t, i) => (
                        <div
                          key={i}
                          className={`rounded-xl border border-[var(--border-dark)] bg-[var(--bg-primary)] ${compact ? "p-3" : "p-4"}`}
                        >
                          <p
                            className={`font-semibold text-[var(--text-primary)] ${compact ? "text-[10px]" : "text-xs"}`}
                          >
                            {t.label}
                          </p>
                          <p
                            className={`mb-3 mt-1 text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-[11px]"}`}
                          >
                            {t.description}
                          </p>
                          <div className="relative">
                            <pre
                              className={`overflow-x-auto rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] pr-16 text-[var(--accent)] ${codeBlockPadding} ${codeBlockFont}`}
                            >
                              <code>{t.codeSnippet}</code>
                            </pre>
                            <button
                              onClick={() => copy(t.codeSnippet, `int-${i}`)}
                              className={`absolute right-2 top-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all duration-150 hover:text-[var(--text-primary)] active:scale-[0.95] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
                            >
                              {copiedId === `int-${i}` ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {testData.mocks?.length > 0 && (
                  <GlassCard title="Mocks & Stubs" icon="◇" compact={compact}>
                    <div
                      className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}
                    >
                      {testData.mocks.map((m, i) => (
                        <AlertCard key={i} type="warning" compact={compact}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`font-mono font-semibold text-[var(--color-warning)] ${compact ? "text-[10px]" : "text-xs"}`}
                              >
                                {m.target}
                              </p>
                              <p
                                className={`mt-1 text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-[11px]"}`}
                              >
                                {m.reason}
                              </p>
                              <pre
                                className={`mt-2 overflow-x-auto text-[var(--color-warning)] ${compact ? "text-[9px]" : "text-[10px]"}`}
                              >
                                <code>{m.snippet}</code>
                              </pre>
                            </div>
                            <button
                              onClick={() => copy(m.snippet, `mock-${i}`)}
                              className={`shrink-0 rounded-md border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all duration-150 hover:text-[var(--text-primary)] active:scale-[0.95] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
                            >
                              {copiedId === `mock-${i}` ? "✓" : "Copy"}
                            </button>
                          </div>
                        </AlertCard>
                      ))}
                    </div>
                  </GlassCard>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={runGenerateTests}
                    disabled={testLoading}
                    className={`flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] font-medium text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"}`}
                  >
                    <span>↻</span>
                    {compact ? "Re-gen" : "Re-generate Tests"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB‑COMPONENTS
// ═══════════════════════════════════════════════════════════════

function GlassCard({ title, children, icon, compact }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-md)]">
      <div
        className={`flex items-center gap-2 border-b border-[var(--border-dark)] ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      >
        <span
          className={`flex items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] ${compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]"}`}
        >
          {icon}
        </span>
        <h2
          className={`font-semibold text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-xs"}`}
        >
          {title}
        </h2>
      </div>
      <div className={compact ? "p-3" : "p-4"}>{children}</div>
    </div>
  );
}

function AlertCard({ children, type, compact }) {
  const styles = {
    error: "border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)]",
    warning: "border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)]",
  };
  return (
    <div
      className={`rounded-lg border ${compact ? "p-2" : "p-3"} ${styles[type] || "border-[var(--border-light)] bg-[var(--bg-card)]"}`}
    >
      {children}
    </div>
  );
}

function ScoreCard({ label, value, icon, compact }) {
  const val = typeof value === "number" ? Math.min(Math.max(value, 0), 100) : 0;
  return (
    <div
      className={`rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-medium)] ${compact ? "p-2.5" : "p-3.5"}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center justify-center rounded-lg text-xs bg-[var(--accent-soft)] text-[var(--accent)] ${compact ? "h-6 w-6 text-[10px]" : "h-7 w-7"}`}
        >
          {icon}
        </div>
        <span
          className={`uppercase tracking-wider text-[var(--text-muted)] text-[9px]`}
        >
          Score
        </span>
      </div>
      <div
        className={`flex items-end justify-between ${compact ? "mt-2" : "mt-3"}`}
      >
        <div>
          <p
            className={`text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            {label}
          </p>
          <p
            className={`mt-0.5 font-bold text-[var(--accent)] ${compact ? "text-lg" : "text-xl"}`}
          >
            {val || "N/A"}
          </p>
        </div>
        <span
          className={`mb-1 text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
        >
          /100
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-[var(--border-dark)] ${compact ? "mt-1.5 h-0.5" : "mt-2 h-1"}`}
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
          style={{ width: `${val}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ children, color = "accent", compact }) {
  const colors = {
    accent:
      "border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]",
    warning:
      "border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  };
  return (
    <span
      className={`rounded-md border font-medium ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} ${colors[color] || colors.accent}`}
    >
      {children}
    </span>
  );
}

function TestCaseRow({
  testCase: c,
  id,
  copiedId,
  onCopy,
  accent = "secondary",
  compact,
}) {
  const accentColors = {
    secondary: "text-[var(--accent-secondary)]",
    warning: "text-[var(--color-warning)]",
  };
  return (
    <div
      className={`rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] ${compact ? "p-2" : "p-3"}`}
    >
      <div className={`flex items-center gap-2 ${compact ? "mb-1.5" : "mb-2"}`}>
        <TypeBadge type={c.type} compact={compact} />
        <span
          className={`text-[var(--text-secondary)] ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {c.label}
        </span>
      </div>
      <div
        className={`flex flex-col gap-1 text-[var(--text-muted)] sm:flex-row sm:gap-5 ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        <span>
          Input: <span className="text-[var(--text-secondary)]">{c.input}</span>
        </span>
        <span>
          Expected:{" "}
          <span className="text-[var(--text-secondary)]">{c.expected}</span>
        </span>
      </div>
      {c.codeSnippet && (
        <div className="relative">
          <pre
            className={`overflow-x-auto rounded-lg border border-[var(--border-dark)] bg-[var(--bg-primary)] pr-12 ${accentColors[accent] || "text-[var(--accent)]"} ${compact ? "p-2 text-[9px]" : "p-3 text-[10px]"}`}
          >
            <code>{c.codeSnippet}</code>
          </pre>
          <button
            onClick={() => onCopy(c.codeSnippet, id)}
            className={`absolute right-2 top-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all duration-150 hover:text-[var(--text-primary)] active:scale-[0.95] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
          >
            {copiedId === id ? "✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type, compact }) {
  const map = {
    unit: {
      label: "unit",
      cls: "border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)]",
    },
    edge: {
      label: "edge",
      cls: "border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    },
    integration: {
      label: "integration",
      cls: "border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]",
    },
  };
  const { label, cls } = map[type] ?? {
    label: type,
    cls: "border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-secondary)]",
  };
  return (
    <span
      className={`rounded border font-mono uppercase tracking-wide ${compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[9px]"} ${cls}`}
    >
      {label}
    </span>
  );
}

function EmptyState({ text, compact }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-light)] bg-[var(--bg-primary)] ${compact ? "px-2 py-2" : "px-3 py-4"}`}
    >
      <span
        className={`text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-xs"}`}
      >
        ○
      </span>
      <p
        className={`text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-xs"}`}
      >
        {text}
      </p>
    </div>
  );
}

function ScoreMini({ label, value, compact }) {
  return (
    <div className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] p-2 text-center">
      <p
        className={`text-[var(--text-muted)] ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        {label}
      </p>
      <p
        className={`font-bold text-[var(--accent)] ${compact ? "text-sm" : "text-base"}`}
      >
        {value}
      </p>
    </div>
  );
}
