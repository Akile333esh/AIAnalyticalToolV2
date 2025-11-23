"use client";

import type { User } from "./types";

const ACCESS_TOKEN_KEY = "ai-capacity-access-token";
const USER_KEY = "ai-capacity-user";

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setCurrentUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function logoutClientSide() {
  clearAccessToken();
  clearCurrentUser();
}
