import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL, SYNC_CONFIG } from "./env";

const TOKEN_KEY = "3ammm_token";
const TIMEOUT_MS = 25000; // increased from 10s — Vercel cold start can take 15-25s

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}



// ── Fetch with timeout + better error messages ────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(
        "Request timed out. The server may be waking up — please try again in a moment.",
      );
    }
    // Network unreachable
    throw new Error(
      "Cannot reach the server. Check your internet connection.",
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Retry wrapper — retries on timeout/network errors only ────
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Give each retry a little more time
      const timeout = TIMEOUT_MS + attempt * 5000;
      return await fetchWithTimeout(url, options, timeout);
    } catch (err: any) {
      lastError = err;
      // Only retry on timeout/network errors, not 4xx/5xx
      const isRetryable =
        err.message.includes("timed out") ||
        err.message.includes("Cannot reach");

      if (!isRetryable || attempt === retries) throw err;

      // Wait before retrying (1s, 2s)
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

// ── Main fetch wrapper ────────────────────────────────────────
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;

  const response = await fetchWithRetry(url, { ...options, headers });

  // Parse response
  let data: any;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Server error (${response.status})`,
    );
  }

  return data;
}

// ── API methods ───────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (
      name: string,
      email: string,
      password: string,
      singerName?: string,
    ) =>
      apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, singerName }),
      }),
    me: () => apiFetch("/api/auth/me"),

     googleAuth: (
    accessToken: string,
    idToken: string,
    serverAuthCode: string,
  ) =>
    apiFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ accessToken, idToken, serverAuthCode }),
    }),
  },

  songs: {
    getAll: (params?: Record<string, string>) => {
      const qs = params
        ? "?" + new URLSearchParams(params).toString()
        : "";
      return apiFetch(`/api/songs${qs}`);
    },
    getSingers: () => apiFetch("/api/songs/singers"),
    getOne: (id: string) => apiFetch(`/api/songs/${id}`),
    create: (data: any) =>
      apiFetch("/api/songs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiFetch(`/api/songs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch(`/api/songs/${id}`, { method: "DELETE" }),
  },

  setlists: {
    getAll: () => apiFetch("/api/setlists"),
    create: (data: any) =>
      apiFetch("/api/setlists", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiFetch(`/api/setlists/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch(`/api/setlists/${id}`, { method: "DELETE" }),
  },

  favorites: {
    getAll: () => apiFetch("/api/favorites"),
    getIds: () => apiFetch("/api/favorites/ids"),
    toggle: (songId: string) =>
      apiFetch(`/api/favorites/${songId}`, { method: "POST" }),
  },

  notifications: {
    getAll: () => apiFetch("/api/notifications"),
  },

  users: {
    getAll: () => apiFetch("/api/users"),
    getStats: () => apiFetch("/api/users/stats"),
    savePushToken: (token: string) =>
      apiFetch("/api/users/push-token", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  },

  feedback: {
    send: (message: string, email?: string) =>
      apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ message, email }),
      }),
  },

  googleAuth: (accessToken: string, idToken: string, serverAuthCode: string) =>
  apiFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken, idToken, serverAuthCode }),
  }),
};