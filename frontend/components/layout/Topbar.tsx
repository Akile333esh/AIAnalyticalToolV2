"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "../ui/Button";

export function Topbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      // Force redirect anyway
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4 md:hidden">
        {/* Mobile menu trigger could go here */}
        <span className="font-bold text-slate-100">AI Analytics</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-300"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
