"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { apiFetch } from "@/lib/apiClient";
import { setAccessToken, setCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

interface LoginResponse {
  accessToken: string;
  user: User;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setAccessToken(data.accessToken);
      setCurrentUser(data.user);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
    >
      <h1 className="mb-2 text-xl font-semibold text-slate-50">Sign in</h1>
      <p className="mb-6 text-xs text-slate-400">
        Use the same email + password stored in <code>MasterDB</code> Users table.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-slate-300">Email</label>
          <Input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">Password</label>
          <Input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-600/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="mt-6 w-full"
        loading={loading}
      >
        Sign in
      </Button>
    </form>
  );
}
