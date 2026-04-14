// frontend/src/api/github.js
import axios from "./axios";

// Analyze a GitHub repo
// Response: { success, analysis: { summary, grade, ..., _sourceCode }, reportId }
export const analyzeGithub = (data) =>
  axios.post("/github/analyze", data);

// Generate tests — sends source code to backend
// Result.jsx calls this via generateTestsFn prop
export const generateTests = async (code) => {
  const res = await axios.post("/github/generate-tests", { code });
  return res.data?.data ?? res.data?.result ?? res.data?.tests ?? res.data;
};