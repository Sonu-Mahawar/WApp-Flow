import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      workspaceId: null,

      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        set({
          token: res.data.token,
          user: res.data.user,
          workspaceId: res.data.workspaceId,
        });
        return res.data;
      },

      register: async (name, email, password) => {
        const res = await api.post("/auth/register", { name, email, password });
        set({
          token: res.data.token,
          user: res.data.user,
          workspaceId: res.data.workspaceId,
        });
        return res.data;
      },

      logout: () => set({ token: null, user: null, workspaceId: null }),
    }),
    {
      name: "wa-platform-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        workspaceId: state.workspaceId,
      }),
    },
  ),
);

// API helpers
export const waApi = {
  get: (path, params) => api.get(path, { params }),
  post: (path, data) => api.post(path, data),
  put: (path, data) => api.put(path, data),
  patch: (path, data) => api.patch(path, data),
  delete: (path) => api.delete(path),
};
