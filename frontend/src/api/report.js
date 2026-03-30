import api from "./axios";
export const getHistory = () => api.get("/report");
