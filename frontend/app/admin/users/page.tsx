"use client";

import { useEffect, useState } from "react";
import { ProtectedClient } from "@/components/auth/ProtectedClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface AdminUser {
  Id: number;
  Email: string;
  Role: string;
  CreatedAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ users: AdminUser[] }>("/admin/users", {
        auth: true
      });
      setUsers(data.users ?? data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateRole = async (userId: number, role: string) => {
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ role })
      });
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to update role");
    }
  };

  return (
    <ProtectedClient>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4">
            <Card>
              <div className="mb-2 text-sm font-semibold">Users & roles</div>
              {loading && (
                <div className="text-xs text-slate-500">Loading…</div>
              )}
              {error && (
                <div className="mb-2 rounded-md border border-red-600/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
              {!loading && users.length === 0 && (
                <div className="text-xs text-slate-500">No users found.</div>
              )}
              {users.length > 0 && (
                <div className="overflow-auto text-xs">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Email
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Role
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.Id}
                          className="odd:bg-slate-950/60 even:bg-slate-900/60"
                        >
                          <td className="border-b border-slate-800 px-2 py-1">
                            {u.Email}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            <Select
                              value={u.Role}
                              onChange={(e) =>
                                updateRole(u.Id, e.target.value)
                              }
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </Select>
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            <Button
                              variant="secondary"
                              onClick={() => updateRole(u.Id, u.Role)}
                            >
                              Save
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </main>
        </div>
      </div>
    </ProtectedClient>
  );
}
