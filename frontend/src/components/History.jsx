import { useEffect, useState } from "react";
import axios from "axios";

export default function History() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://localhost:5000/api/report", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setReports(res.data.reports || []))
      .catch(() => alert("Failed to load history"));
  }, []);

  const downloadPDF = async (id) => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `http://localhost:5000/api/report/${id}/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "AI-Code-Audit.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Report History</h1>

      {reports.map((r) => (
        <div key={r._id} className="bg-white p-6 rounded shadow mb-4">
          <h2 className="font-bold">{r.repoUrl.split("/").pop()}</h2>
          <p className="text-sm mt-2">{r.summary}</p>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <Score label="Code Quality" value={r.scores?.codeQuality} />
            <Score label="Security" value={r.scores?.security} />
            <Score label="Performance" value={r.scores?.performance} />
            <Score label="Maintainability" value={r.scores?.maintainability} />
          </div>

          <button
            onClick={() => downloadPDF(r._id)}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Download PDF
          </button>
        </div>
      ))}
    </div>
  );
}

function Score({ label, value }) {
  return (
    <div className="bg-gray-50 p-3 rounded text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold">
        {typeof value === "number" ? value : "N/A"}
      </p>
    </div>
  );
}
