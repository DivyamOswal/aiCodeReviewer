import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

export default function ScoreCharts({ scores }) {
  const data = [
    { subject: "Code", value: scores.codeQuality },
    { subject: "Security", value: scores.security },
    { subject: "Performance", value: scores.performance },
    { subject: "Maintain", value: scores.maintainability },
  ];

  return (
    <RadarChart width={400} height={300} data={data}>
      <PolarGrid />
      <PolarAngleAxis dataKey="subject" />
      <Radar dataKey="value" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
    </RadarChart>
  );
}
