import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getAdminAllowlist } from "@/env";
import { DevAdminLoginForm } from "@/components/admin/dev-admin-login-form";
import { BrandLogoMark } from "@/components/icons/SectionIcons";

export default async function AdminLoginPage() {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (adminEmail) {
    redirect("/admin");
  }

  const allowlist = getAdminAllowlist();

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="rounded-3xl border border-[#EFE6E0] bg-white p-8 sm:p-10 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-6 text-center">
        <div className="flex justify-center">
          <BrandLogoMark className="h-14 w-14 shadow-xs" />
        </div>
        <div className="space-y-2">
          <p className="font-serif italic text-base text-[#9E4765]">
            Editorial Access
          </p>
          <h1 className="font-serif text-3xl text-[#1F1619]">
            Sign in to Admin
          </h1>
          <p className="text-xs text-[#7A686E] leading-relaxed">
            Sign in with your authorized email in{" "}
            <code className="bg-[#FAF3F0] px-1.5 py-0.5 rounded">
              ADMIN_EMAILS
            </code>{" "}
            and your{" "}
            <code className="bg-[#FAF3F0] px-1.5 py-0.5 rounded">
              ADMIN_PASSWORD
            </code>
            .
          </p>
        </div>

        <DevAdminLoginForm defaultEmail={allowlist[0] || "admin@example.com"} />
      </div>
    </div>
  );
}
