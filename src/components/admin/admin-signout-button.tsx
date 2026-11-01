"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export function AdminSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/dev-login", { method: "DELETE" }).catch(() => {});
      await signOut({ redirect: false }).catch(() => {});
      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleSignOut()}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-3 py-1 text-xs text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
      ) : (
        <LogOut className="h-3 w-3" />
      )}
      <span>{loading ? "Signing out..." : "Sign Out"}</span>
    </button>
  );
}
