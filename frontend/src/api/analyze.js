import api from "./axios";

export const analyzeCode = (code) =>
  api.post("/analyze", { code });
