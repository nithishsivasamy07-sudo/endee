import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || "Request failed";
    return Promise.reject(new Error(msg));
  }
);

export const uploadDocument = (formData, onProgress) =>
  api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });

export const listDocuments = () => api.get("/upload/documents");
export const deleteDocument = (id) => api.delete(`/upload/documents/${id}`);

export const sendChat = (query, sessionId, documentId) =>
  api.post("/chat", { query, sessionId, documentId });

export const getChatHistory = (sessionId) =>
  api.get(`/chat/history/${sessionId}`);

export const clearChatHistory = (sessionId) =>
  api.delete(`/chat/history/${sessionId}`);

export const generateQuiz = (topic, quizType, count, documentId) =>
  api.post("/generate-quiz", { topic, quizType, count, documentId });

export const generateAnswer = (question, answerType, documentId) =>
  api.post("/generate-answer", { question, answerType, documentId });

export const getHealth = () => api.get("/health");

export default api;
