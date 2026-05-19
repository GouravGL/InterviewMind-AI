import axios from "axios";

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Attach token to requests
API.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("im_access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("im_refresh_token");
        if (refreshToken) {
          const { data } = await axios.post(`${API.defaults.baseURL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          localStorage.setItem("im_access_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("im_refresh_token", data.refresh_token);
          }
          
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("im_access_token");
        localStorage.removeItem("im_refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    
    const msg = error.response?.data?.detail || error.message || "Request failed";
    return Promise.reject(new Error(msg));
  }
);

export const authApi = {
  register: (d: any) => API.post("/api/auth/register", d).then(r => r.data),
  login: (d: any) => API.post("/api/auth/login", d).then(r => r.data),
  getMe: () => API.get("/api/auth/me").then(r => r.data),
  logout: () => API.post("/api/auth/logout").then(r => r.data),
};

export const interviewApi = {
  start: (d: { user_id: string; role: string; topic: string; difficulty: string }) =>
    API.post("/api/interview/start", d).then((r) => r.data),
  answer: (d: { session_id: string; user_id: string; answer: string; question: string; question_index: number }) =>
    API.post("/api/interview/answer", d).then((r) => r.data),
  complete: (d: { session_id: string; user_id: string; integrity_data?: any }) =>
    API.post("/api/interview/complete", d).then((r) => r.data),
  history: (userId: string) =>
    API.get(`/api/interview/history/${userId}`).then((r) => r.data),
  session: (sessionId: string) =>
    API.get(`/api/interview/session/${sessionId}`).then((r) => r.data),
};

export const memoryApi = {
  profile: (userId: string) => API.get(`/api/memory/${userId}/profile`).then((r) => r.data),
  timeline: (userId: string) => API.get(`/api/memory/${userId}/timeline`).then((r) => r.data),
  reflect: (userId: string) => API.get(`/api/memory/${userId}/reflect`).then((r) => r.data),
  recall: (userId: string, topic?: string) =>
    API.get(`/api/memory/${userId}/recall${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`).then((r) => r.data),
};

export const analyticsApi = {
  summary: () => API.get("/api/analytics/summary").then((r) => r.data),
};

// Deprecated: use AuthContext for real authenticated user ID.
export function getUserId(): string {
  if (typeof window === "undefined") return "guest-user";
  let id = localStorage.getItem("im_uid");
  if (!id) {
    id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem("im_uid", id);
  }
  return id;
}
