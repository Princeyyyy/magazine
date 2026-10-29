import React from "react";
import Link from "next/link";
import { getAuthenticatedAdminEmail } from "@/auth";
import { AdminSignOutButton } from "@/components/admin/admin-signout-button";
import { BrandLogoMark } from "@/components/icons/SectionIcons";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminEmail = await getAuthenticatedAdminEmail();

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7]">
      <header className="border-b border-[#EFE6E0] bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href="/admin"
              className="flex items-center gap-3 font-serif text-2xl tracking-tight text-[#1F1619]"
            >
              <BrandLogoMark className="h-8 w-8 shrink-0" />
              <span>Custom Magazine</span>
              <span className="ml-1 font-sans text-xs uppercase tracking-widest text-[#9E4765]">
                Editorial Desk
              </span>
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
              <Link
                href="/admin/settings"
                className="hover:text-[#9E4765] transition-colors"
              >
                Settings &amp; Services
              </Link>
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
    </div>
  );
}
