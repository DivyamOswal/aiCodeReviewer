import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function Result({ data }) {
  if (!data) return null;

  /* 🔒 SAFE DEFAULTS */
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
  } = data;

  const chartData = [
    { metric: "Code Quality", value: scores.codeQuality || 0 },
    { metric: "Security", value: scores.security || 0 },
    { metric: "Performance", value: scores.performance || 0 },
    { metric: "Maintainability", value: scores.maintainability || 0 },
  ];

  return (
    <div className="bg-white p-8 rounded shadow space-y-10">

      {/* ===== EXECUTIVE SUMMARY ===== */}
      <Section title="Executive Summary">
        <p>{summary}</p>
      </Section>

      {/* ===== ARCHITECTURE REVIEW ===== */}
      <Section title="Architecture Review">
        {architecture.length ? (
          architecture.map((a, i) => (
            <div key={i} className="mb-3">
              <p className="font-semibold">{a.component}</p>
              <p className="text-sm text-gray-700">
                {a.recommendation || a.description}
              </p>
            </div>
          ))
        ) : (
          <p>No architecture insights provided.</p>
        )}
      </Section>

      {/* ===== SCORE CHART ===== */}
      <Section title="Quality Score Analysis">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ===== BUGS ===== */}
      <Section title="Identified Bugs">
        {bugs.length ? (
          bugs.map((b, i) => (
            <Card key={i} color="red">
              <p className="font-semibold">
                {b.title} ({b.impact})
              </p>
              <p>{b.description}</p>
              <p className="text-green-700 mt-1">
                Fix: {b.suggestedFix || b.fix}
              </p>
            </Card>
          ))
        ) : (
          <p>No major bugs detected.</p>
        )}
      </Section>

      {/* ===== SECURITY ===== */}
      <Section title="Security Assessment">
        {securityIssues.length ? (
          securityIssues.map((s, i) => (
            <Card key={i} color="yellow">
              <p className="font-semibold">{s.issue}</p>
              <p className="text-red-600">Risk: {s.risk}</p>
              <p className="text-green-700">
                Recommendation: {s.recommendation}
              </p>
            </Card>
          ))
        ) : (
          <p>No critical security issues reported.</p>
        )}
      </Section>

      {/* ===== FUTURE ROADMAP ===== */}
      <Section title="Future Roadmap">
        {futureRoadmap.length ? (
          futureRoadmap.map((f, i) => (
            <li key={i} className="list-disc ml-6">
              <b>{f.phase || f.feature}:</b> {f.details || f.description}
            </li>
          ))
        ) : (
          <p>No future roadmap generated.</p>
        )}
      </Section>

      {/* ===== TOOLS ===== */}
      <Section title="Tools & Packages Used">
        {toolsAndPackages.length ? (
          <ul className="list-disc ml-6">
            {toolsAndPackages.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        ) : (
          <p>Tools information not provided.</p>
        )}
      </Section>

      {/* ===== FINAL GRADE ===== */}
      <Section title="Final Grade">
        <span className="inline-block bg-indigo-600 text-white px-6 py-2 rounded text-2xl font-bold">
          {grade}
        </span>
      </Section>

      {/* ===== FINAL VERDICT ===== */}
      <Section title="Final Verdict">
        <p>{finalVerdict}</p>
      </Section>
    </div>
  );
}

/* ===== UI HELPERS ===== */

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}

function Card({ children, color }) {
  const colors = {
    red: "border-red-400 bg-red-50",
    yellow: "border-yellow-400 bg-yellow-50",
    green: "border-green-400 bg-green-50",
  };

  return (
    <div className={`border p-4 rounded mb-3 ${colors[color]}`}>
      {children}
    </div>
  );
}
