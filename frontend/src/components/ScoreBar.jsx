export default function ScoreBar({ label, score }) {
  return (
    <div className="my-2">
      <p className="text-sm">{label}: {score}/100</p>
      <div className="w-full bg-gray-200 h-2 rounded">
        <div
          className="bg-blue-600 h-2 rounded"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
