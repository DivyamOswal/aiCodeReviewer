// frontend/src/components/Result.jsx

import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";

// ✅ Import directly — works even when parent forgets to pass generateTestsFn
import { generateTests as defaultGenerateTests } from "../api/github";

// ─────────────────────────────────────────────
//  Props:
//    data            {object}  flat audit result (may contain _sourceCode)
//    sourceCode      {string}  optional — fallback to data._sourceCode
//    onDownload      {fn}      optional
//    generateTestsFn {fn}      optional — falls back to ../api/github generateTests
// ─────────────────────────────────────────────
export default function Result({ data, sourceCode: sourceCodeProp = "", onDownload, generateTestsFn }) {
  const [activeTab,   setActiveTab]   = useState("audit");
  const [testData,    setTestData]    = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError,   setTestError]   = useState(null);
  const [copiedId,    setCopiedId]    = useState(null);

  if (!data) return null;

  // Priority: prop → data._sourceCode → empty
  const sourceCode = sourceCodeProp || data?._sourceCode || "";

  // Priority: prop → built-in import
  const doGenerateTests = generateTestsFn ?? defaultGenerateTests;

  const {
    summary          = "No summary generated.",
    architecture     = [],
    bugs             = [],
    securityIssues   = [],
    futureRoadmap    = [],
    toolsAndPackages = [],
    scores           = {},
    grade            = "N/A",
    finalVerdict     = "No verdict provided.",
  } = data;

  const chartData = [
    { metric: "Code Quality",    value: scores.codeQuality    || 0 },
    { metric: "Security",        value: scores.security       || 0 },
    { metric: "Performance",     value: scores.performance    || 0 },
    { metric: "Maintainability", value: scores.maintainability || 0 },
  ];

  // ── Test generation ──────────────────────────
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 md:p-8 text-white space-y-8">

      {/* ── HEADER ────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">📊 AI Code Analysis Report</h1>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-gray-400 text-xs">Final Grade</p>
            <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              {grade}
            </span>
          </div>
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 transition text-sm"
            >
              ⬇ Download Report
            </button>
          )}
        </div>
      </div>

      {/* ── SCORE CARDS ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Code Quality"    value={scores.codeQuality}     />
        <ScoreCard label="Security"        value={scores.security}        />
        <ScoreCard label="Performance"     value={scores.performance}     />
        <ScoreCard label="Maintainability" value={scores.maintainability} />
      </div>

      {/* ── TAB BAR ───────────────────────────── */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: "audit", label: "📊 Audit Report" },
          { id: "tests", label: "🧪 Test Cases"   },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200
              ${activeTab === tab.id
                ? "bg-white/10 border border-b-0 border-white/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
          >
            {tab.label}
          </button>
        ))}

        {!testData && !testLoading && activeTab === "audit" && (
          <button
            onClick={() => handleTabClick("tests")}
            className="ml-auto mb-1 px-4 py-1.5 text-xs font-semibold rounded-lg
              bg-gradient-to-r from-emerald-500 to-teal-500
              hover:from-emerald-400 hover:to-teal-400 transition-all"
          >
            🧪 Generate Tests
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════
          AUDIT TAB
      ════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-8">
          <GlassCard title="Executive Summary">
            <p className="text-gray-300">{summary}</p>
          </GlassCard>

          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard title="Quality Score Analysis">
              <div style={{ width: "100%", height: 288, minHeight: 288 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                  <RadarChart data={chartData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis dataKey="metric" stroke="#aaa" />
                    <PolarRadiusAxis domain={[0, 100]} stroke="#666" />
                    <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard title="Final Verdict">
              <p className="text-gray-300">{finalVerdict}</p>
            </GlassCard>
          </div>

          <GlassCard title="Architecture Review">
            {architecture.length ? architecture.map((a, i) => (
              <div key={i} className="mb-3">
                <p className="font-semibold text-indigo-400">{a.component}</p>
                <p className="text-gray-300 text-sm">{a.recommendation || a.description}</p>
              </div>
            )) : <p className="text-gray-400">No architecture insights provided.</p>}
          </GlassCard>

          <GlassCard title="Identified Bugs">
            {bugs.length ? bugs.map((b, i) => (
              <AlertCard key={i} type="error">
                <p className="font-semibold">{b.title} ({b.impact})</p>
                <p className="text-sm text-gray-300">{b.description}</p>
                <p className="text-green-400 mt-1">Fix: {b.suggestedFix || b.fix}</p>
              </AlertCard>
            )) : <p className="text-gray-400">No major bugs detected.</p>}
          </GlassCard>

          <GlassCard title="Security Assessment">
            {securityIssues.length ? securityIssues.map((s, i) => (
              <AlertCard key={i} type="warning">
                <p className="font-semibold">{s.issue}</p>
                {s.risk && <p className="text-red-400">Risk: {s.risk}</p>}
                <p className="text-green-400">Recommendation: {s.recommendation}</p>
              </AlertCard>
            )) : <p className="text-gray-400">No critical security issues reported.</p>}
          </GlassCard>

          <GlassCard title="Future Roadmap">
            {futureRoadmap.length ? (
              <ul className="list-disc ml-6 text-gray-300 space-y-1">
                {futureRoadmap.map((f, i) => (
                  <li key={i}><b>{f.phase || f.feature}:</b> {f.details || f.description}</li>
                ))}
              </ul>
            ) : <p className="text-gray-400">No roadmap generated.</p>}
          </GlassCard>

          <GlassCard title="Tools & Packages">
            {toolsAndPackages.length ? (
              <div className="flex flex-wrap gap-2">
                {toolsAndPackages.map((t, i) => (
                  <span key={i} className="px-3 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-300">{t}</span>
                ))}
              </div>
            ) : <p className="text-gray-400">No tools info available.</p>}
          </GlassCard>
        </div>
      )}

      {/* ════════════════════════════════════════
          TESTS TAB
      ════════════════════════════════════════ */}
      {activeTab === "tests" && (
        <div className="space-y-8">

          {testLoading && (
            <GlassCard title="Generating Tests…">
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400">Analysing code and writing test cases…</p>
              </div>
            </GlassCard>
          )}

          {testError && !testLoading && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
              <p className="font-semibold text-white">Test Generation Failed</p>
              <p className="text-sm text-gray-300 mt-1 whitespace-pre-line">{testError}</p>
              <button
                onClick={runGenerateTests}
                className="mt-3 px-4 py-1.5 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/40 transition text-white"
              >
                🔄 Retry
              </button>
            </div>
          )}

          {testData && !testLoading && (
            <>
              <div className="flex flex-wrap gap-3 items-center">
                <Badge color="emerald">Framework: {testData.framework ?? "jest"}</Badge>
                <Badge color="teal">Est. Coverage: {testData.coverageSummary?.estimatedCoverage ?? 0}%</Badge>
                <span className="text-gray-500 text-xs ml-auto">{testData.setupInstructions}</span>
              </div>

              {testData.coverageSummary && (
                <GlassCard title="Coverage Summary">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Estimated Coverage</span>
                      <span className="text-emerald-400 font-bold">{testData.coverageSummary.estimatedCoverage}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                        style={{ width: `${testData.coverageSummary.estimatedCoverage}%` }}
                      />
                    </div>
                    <p className="text-gray-300 text-sm">{testData.coverageSummary.recommendation}</p>
                    {testData.coverageSummary.uncoveredAreas?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {testData.coverageSummary.uncoveredAreas.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-300">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}

              {testData.testFiles?.length > 0 && (
                <GlassCard title="Generated Test Files">
                  <div className="space-y-4">
                    {testData.testFiles.map((file, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-white/10">
                        <div className="flex items-center justify-between px-4 py-2 bg-white/5">
                          <span className="text-emerald-400 text-sm font-mono">{file.fileName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs hidden md:block">{file.description}</span>
                            <button
                              onClick={() => copy(file.testCode, `file-${i}`)}
                              className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition"
                            >
                              {copiedId === `file-${i}` ? "✅ Copied" : "📋 Copy"}
                            </button>
                          </div>
                        </div>
                        <pre className="p-4 text-xs text-gray-300 overflow-x-auto bg-gray-900/60 max-h-72 leading-relaxed">
                          <code>{file.testCode}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {testData.unitTests?.length > 0 && (
                <GlassCard title="Unit Tests">
                  <div className="space-y-6">
                    {testData.unitTests.map((fn, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-indigo-400 font-semibold">{fn.functionName}()</span>
                          <span className="text-xs text-gray-500">{fn.filePath}</span>
                        </div>
                        <p className="text-gray-400 text-xs mb-3">{fn.description}</p>
                        <div className="space-y-2">
                          {fn.cases?.map((c, j) => (
                            <TestCaseRow key={j} testCase={c} id={`unit-${i}-${j}`} copiedId={copiedId} onCopy={copy} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {testData.edgeCases?.length > 0 && (
                <GlassCard title="Edge Cases">
                  <div className="space-y-3">
                    {testData.edgeCases.map((c, i) => (
                      <div key={i}>
                        <p className="text-xs text-yellow-400 font-mono mb-1">{c.functionName}()</p>
                        <TestCaseRow testCase={c} id={`edge-${i}`} copiedId={copiedId} onCopy={copy} accent="yellow" />
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {testData.integrationTests?.length > 0 && (
                <GlassCard title="Integration Tests">
                  <div className="space-y-3">
                    {testData.integrationTests.map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4">
                        <p className="font-semibold text-sm mb-1">{t.label}</p>
                        <p className="text-gray-400 text-xs mb-3">{t.description}</p>
                        <div className="relative">
                          <pre className="text-xs text-green-300 bg-gray-900/60 rounded-lg p-3 overflow-x-auto pr-16">
                            <code>{t.codeSnippet}</code>
                          </pre>
                          <button
                            onClick={() => copy(t.codeSnippet, `int-${i}`)}
                            className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition"
                          >
                            {copiedId === `int-${i}` ? "✅" : "📋"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {testData.mocks?.length > 0 && (
                <GlassCard title="Mocks & Stubs">
                  <div className="space-y-3">
                    {testData.mocks.map((m, i) => (
                      <AlertCard key={i} type="warning">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm font-mono">{m.target}</p>
                            <p className="text-gray-400 text-xs mt-1">{m.reason}</p>
                            <pre className="text-xs text-yellow-300 mt-2 overflow-x-auto">
                              <code>{m.snippet}</code>
                            </pre>
                          </div>
                          <button
                            onClick={() => copy(m.snippet, `mock-${i}`)}
                            className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition shrink-0"
                          >
                            {copiedId === `mock-${i}` ? "✅" : "📋"}
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
                  className="px-4 py-2 text-xs rounded-lg border border-white/10 hover:bg-white/5 transition text-gray-400"
                >
                  🔄 Re-generate Tests
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function GlassCard({ title, children }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg md:text-xl font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function AlertCard({ children, type }) {
  const styles = { error: "bg-red-500/10 border-red-500/30", warning: "bg-yellow-500/10 border-yellow-500/30" };
  return <div className={`border p-4 rounded-xl mb-3 ${styles[type]}`}>{children}</div>;
}

function ScoreCard({ label, value }) {
  const val = typeof value === "number" ? value : 0;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold mt-1">{val || "N/A"}</p>
      <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-400 to-blue-500" style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}

function Badge({ children, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-500/20 text-indigo-300", emerald: "bg-emerald-500/20 text-emerald-300",
    teal: "bg-teal-500/20 text-teal-300", yellow: "bg-yellow-500/20 text-yellow-300",
  };
  return <span className={`px-3 py-1 text-xs rounded-full font-medium ${colors[color]}`}>{children}</span>;
}

function TestCaseRow({ testCase: c, id, copiedId, onCopy, accent = "indigo" }) {
  const accentColors = { indigo: "text-indigo-300", yellow: "text-yellow-300" };
  return (
    <div className="bg-gray-900/40 rounded-lg p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <TypeBadge type={c.type} />
        <span className="text-gray-300 text-xs">{c.label}</span>
      </div>
      <div className="flex gap-4 text-xs text-gray-500 mb-2">
        <span>Input: <span className="text-gray-400">{c.input}</span></span>
        <span>Expected: <span className="text-gray-400">{c.expected}</span></span>
      </div>
      {c.codeSnippet && (
        <div className="relative">
          <pre className={`text-xs ${accentColors[accent]} bg-black/30 rounded p-2 overflow-x-auto pr-12`}>
            <code>{c.codeSnippet}</code>
          </pre>
          <button
            onClick={() => onCopy(c.codeSnippet, id)}
            className="absolute top-1.5 right-1.5 text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition"
          >
            {copiedId === id ? "✅" : "📋"}
          </button>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    unit: { label: "unit", cls: "bg-indigo-500/20 text-indigo-300" },
    edge: { label: "edge", cls: "bg-yellow-500/20 text-yellow-300" },
    integration: { label: "integration", cls: "bg-teal-500/20 text-teal-300" },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-500/20 text-gray-300" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}