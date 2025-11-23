"use client";

import { getAccessToken } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_BACKEND_URL || "http://localhost:4000";

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

async function parseError(res: Response): Promise<Error> {
  try {
    const data = await res.json();
    if (data?.message) return new Error(data.message);
  } catch {
    // ignore
  }
  return new Error(`Request failed with status ${res.status}`);
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.method && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
