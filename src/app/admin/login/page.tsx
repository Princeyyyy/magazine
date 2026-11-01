import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedAdminEmail } from "@/auth";
import { DevAdminLoginForm } from "@/components/admin/dev-admin-login-form";
import { BrandLogoMark } from "@/components/icons/SectionIcons";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function AdminLoginPage() {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (adminEmail) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-md py-12 px-4 sm:px-0">
      <div className="rounded-3xl border border-[#EFE6E0] bg-white p-8 sm:p-10 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-6 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <BrandLogoMark className="h-14 w-14 shadow-xs" />
          <BoboStudioTag variant="badge" />
        </div>
        <div className="space-y-2">
          <p className="font-serif italic text-base text-[#9E4765]">
            Editorial Access
          </p>
          <h1 className="font-serif text-3xl text-[#1F1619]">
            Sign in to Admin
          </h1>
          <p className="text-xs text-[#7A686E] leading-relaxed">
            Enter your admin email and password to access the Editorial Desk.
          </p>
        </div>

        {/* Public Notice Banner: Explains that there is no public registration or customer accounts */}
        <div className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E4765]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#9E4765]" />
            <span>Authorized Staff Only</span>
          </div>
          <p className="text-xs text-[#6E5A61] leading-relaxed">
            This portal is strictly for Custom Magazine editors and internal staff. There is no customer account creation or self-registration.
          </p>
          <p className="text-xs text-[#6E5A61] leading-relaxed">
            If you are a customer creating or continuing your keepsake magazine, you do not need an account.
          </p>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E4765] hover:text-[#7A2E48] underline underline-offset-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Magazine Editor</span>
            </Link>
          </div>
        </div>

        <DevAdminLoginForm defaultEmail="" />
      </div>
    </div>
  );
}
