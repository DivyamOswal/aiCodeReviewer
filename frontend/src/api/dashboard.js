import api from "./axios";

export const fetchDashboard = () => {
  return api.get("/dashboard");
};
