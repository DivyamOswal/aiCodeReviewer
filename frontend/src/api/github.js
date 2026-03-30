import api from "./axios";

export const analyzeGithub = (data) => {
  return api.post("/github/analyze", data);
};
