import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL, logError } from "./env";
import type { Song } from "./db";

const TOKEN_KEY = "3ammm_token";
const TIMEOUT_MS = 25000;

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

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
        `Request timed out when reaching ${url}. The server may be waking up � please try again in a moment.`,
      );
    }
    const message = `Cannot reach the server at ${url}. Check your internet connection or start the backend on ${API_URL}`;
    logError("Network error", url, err.message ?? err);
    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeout = TIMEOUT_MS + attempt * 5000;
      return await fetchWithTimeout(url, options, timeout);
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.message.includes("timed out") ||
        err.message.includes("Cannot reach");

      logError("API request failed (attempt)", { url, attempt, message: err.message });

      if (!isRetryable || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

export function isArrayResponse<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function expectArrayResponse<T>(value: unknown, label: string): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const nested =
      (value as any).items ??
      (value as any).data ??
      (value as any).songs ??
      (value as any).results ??
      (value as any).favorites;

    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  throw new Error(`${label} response was not an array.`);
}

function normalizeIdsResponse(value: unknown, label: string): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (value && typeof value === "object" && Array.isArray((value as any).ids)) {
    return (value as any).ids.filter(
      (entry: unknown): entry is string => typeof entry === "string",
    );
  }
  throw new Error(`${label} response was not an array.`);
}

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
    const message = data?.message || data?.error || `Server error (${response.status})`;

    if (response.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }

    throw new Error(message);
  }

  return data;
}

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
    getAll: async (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const data = await apiFetch(`/api/songs${qs}`);
      return expectArrayResponse<Song>(data, "Songs");
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
    delete: (id: string) => apiFetch(`/api/songs/${id}`, { method: "DELETE" }),
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
    delete: (id: string) => apiFetch(`/api/setlists/${id}`, { method: "DELETE" }),
  },

  favorites: {
    getAll: () => apiFetch("/api/favorites"),
    getIds: () => apiFetch("/api/favorites/ids"),
    toggle: (songId: string) =>
      apiFetch(`/api/favorites/${songId}`, { method: "POST" }),
    merge: (songIds: string[]) =>
      apiFetch(`/api/favorites/merge`, {
        method: "POST",
        body: JSON.stringify({ songIds }),
      }),
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
