"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function AdminSignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/admin/dev-login", { method: "DELETE" }).catch(() => {});
    await signOut({ redirect: false }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-3 py-1 text-xs text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
    >
      <LogOut className="h-3 w-3" />
      Sign Out
    </button>
  );
}
