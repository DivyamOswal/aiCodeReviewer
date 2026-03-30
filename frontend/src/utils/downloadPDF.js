export async function downloadPDF(reportId) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `http://localhost:5000/api/report/${reportId}/pdf`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return alert("Unauthorized");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AI-Code-Audit.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
