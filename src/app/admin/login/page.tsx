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
    <div className="mx-auto max-w-4xl py-2 sm:py-6">
      <div className="rounded-3xl border border-[#EFE6E0] bg-white shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Info & Public Guidance */}
        <div className="md:col-span-5 bg-[#FCF9F7] p-6 sm:p-8 border-b md:border-b-0 md:border-r border-[#EFE6E0] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BrandLogoMark className="h-12 w-12 shrink-0 drop-shadow-xs" />
                  <div>
                    <span className="font-serif text-2xl tracking-tight text-[#1F1619] block leading-tight">
                      Custom Magazine
                    </span>
                    <BoboStudioTag variant="masthead" />
                  </div>
                </div>
                <BoboStudioTag variant="badge" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-serif italic text-sm text-[#9E4765]">
                Editorial Desk
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#1F1619]">
                Staff Portal
              </h1>
              <p className="text-xs text-[#7A686E] leading-relaxed">
                Internal administrative desk for managing and fulfilling Custom Magazine keepsake orders.
              </p>
            </div>

            <div className="rounded-2xl border border-[#EAD4DF] bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9E4765]">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#9E4765]" />
                <span>Authorized Staff Only</span>
              </div>
              <p className="text-xs text-[#6E5A61] leading-relaxed">
                This portal is strictly for Custom Magazine editors. There is no customer account creation or self-registration.
              </p>
              <p className="text-xs text-[#6E5A61] leading-relaxed">
                Customers do not need an account to create or continue an issue.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E4765] hover:text-[#7A2E48] underline underline-offset-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Magazine Editor</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-[#9E4765] font-medium">
              Secure Sign In
            </p>
            <h2 className="font-serif text-2xl text-[#1F1619]">
              Welcome back
            </h2>
            <p className="text-xs text-[#7A686E] leading-relaxed">
              Enter your admin email and password to access the editorial queue.
            </p>
          </div>

          <DevAdminLoginForm defaultEmail="" />
        </div>
      </div>
    </div>
  );
}
