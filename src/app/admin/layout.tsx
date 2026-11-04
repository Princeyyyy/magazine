import React from "react";
import Link from "next/link";
import { getAuthenticatedAdminEmail, isSuperAdminEmail } from "@/auth";
import { AdminSignOutButton } from "@/components/admin/admin-signout-button";
import {
  BrandLogoMark,
  BrandLogoTransparent,
} from "@/components/icons/SectionIcons";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminEmail = await getAuthenticatedAdminEmail();
  const isSuperAdmin = isSuperAdminEmail(adminEmail);

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7]">
      <header className="border-b border-[#EFE6E0] bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href="/admin"
              className="flex items-center gap-3 sm:gap-3.5 group"
            >
              <BrandLogoMark className="h-11 sm:h-13 w-auto shrink-0 transition-transform duration-200 group-hover:scale-102" />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-2xl tracking-tight text-[#1F1619] leading-none">
                    Custom Magazine
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-widest text-[#9E4765] font-medium">
                    Editorial Desk
                  </span>
                </div>
                <BoboStudioTag variant="masthead" className="mt-1" />
              </div>
            </Link>
          </div>

          {adminEmail && (
            <nav className="flex items-center gap-4 text-xs font-medium text-[#5C4950]">
              <Link
                href="/admin"
                className="hover:text-[#9E4765] transition-colors"
              >
                Orders
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/admin/settings"
                  className="hover:text-[#9E4765] transition-colors"
                >
                  Settings &amp; Services
                </Link>
              )}
              <Link
                href="/"
                className="hover:text-[#9E4765] transition-colors"
              >
                Customer Form
              </Link>
              <span className="text-[#E6DAD3]">|</span>
              <span className="text-[#8C7A80] hidden sm:inline">
                {adminEmail}
              </span>
              <AdminSignOutButton />
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-[#EFE6E0] bg-white/70 py-5 px-4 sm:px-6 text-xs text-[#8C7A80]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandLogoTransparent className="h-5 w-5 shrink-0" />
            <p className="font-serif italic text-sm text-[#6E5A61]">
              Custom Magazine &mdash; Editorial Production Desk
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BoboStudioTag variant="footer" />
            <span className="text-[#E6DAD3]">&bull;</span>
            <Link href="/" className="hover:text-[#9E4765] transition-colors">
              Customer Form
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
