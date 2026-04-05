import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE });

// AUTH
export const login = (email: string, name: string) =>
  api.post("/api/auth/login", { email, name }).then((r) => r.data);

export const getUser = (userId: number) =>
  api.get(`/api/auth/user/${userId}`).then((r) => r.data);

// TRANSACTIONS
export const uploadTransactions = (userId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/api/transactions/upload/${userId}`, form).then((r) => r.data);
};

export const listTransactions = (userId: number) =>
  api.get(`/api/transactions/list/${userId}`).then((r) => r.data);

// RISK
export const analyzeRisk = (userId: number) =>
  api.post(`/api/risk/analyze/${userId}`).then((r) => r.data);

export const getRiskProfile = (userId: number) =>
  api.get(`/api/risk/profile/${userId}`).then((r) => r.data);

export const getRiskHistory = (userId: number) =>
  api.get(`/api/risk/history/${userId}`).then((r) => r.data);

// AI
export const aiRiskExplain = (userId: number) =>
  api.post(`/api/ai/risk-explain/${userId}`).then((r) => r.data);

export const aiRecoveryPlan = (userId: number) =>
  api.post(`/api/ai/recovery-plan/${userId}`).then((r) => r.data);

export const aiFamilyExplain = (userId: number) =>
  api.post(`/api/ai/family-explain/${userId}`).then((r) => r.data);

export const aiPsychiatristSummary = (userId: number) =>
  api.post(`/api/ai/psychiatrist-summary/${userId}`).then((r) => r.data);

export const aiChat = (userId: number, message: string) =>
  api.post(`/api/ai/chat/${userId}`, { message }).then((r) => r.data);

// CONTACTS & SOS
export const getContacts = (userId: number) =>
  api.get(`/api/contacts/${userId}`).then((r) => r.data);

export const addContact = (userId: number, data: { name: string; phone: string; relation: string }) =>
  api.post(`/api/contacts/${userId}`, data).then((r) => r.data);

export const deleteContact = (userId: number, contactId: number) =>
  api.delete(`/api/contacts/${userId}/${contactId}`).then((r) => r.data);

export const triggerSOS = (userId: number) =>
  api.post(`/api/sos/${userId}/trigger`).then((r) => r.data);

// ANALYST
export const getAnalystUsers = () =>
  api.get("/api/analyst/users").then((r) => r.data);

export const getAnalystStats = () =>
  api.get("/api/analyst/stats").then((r) => r.data);

// ML
export const predictEscalation = (userId: number) =>
  api.get(`/api/ml/predict/escalation/${userId}`).then((r) => r.data);
