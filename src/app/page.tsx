import React, { Suspense } from "react";
import Link from "next/link";
import { getAuthenticatedAdminEmail } from "@/auth";
import { MagazineWizard } from "@/components/wizard/magazine-wizard";
import {
  BrandLogoMark,
  BrandLogoTransparent,
} from "@/components/icons/SectionIcons";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";

export default async function HomePage() {
  const adminEmail = await getAuthenticatedAdminEmail();
  const isAdmin = Boolean(adminEmail);

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7]">
      {/* Subtle Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-[#F5E6ED]/60 via-[#FAF3F0]/30 to-transparent -z-10"
      />

      {/* Editorial Masthead Header */}
      <header className="border-b border-[#EFE6E0]/80 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 sm:gap-4 group"
          >
            <BrandLogoMark className="h-12 sm:h-14 w-auto shrink-0 transition-transform duration-200 group-hover:scale-102" />
            <div className="flex flex-col justify-center">
              <span className="font-serif text-2xl sm:text-3xl tracking-tight text-[#1F1619] font-normal leading-none">
                Custom Magazine
              </span>
              <BoboStudioTag variant="masthead" className="mt-1" />
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs text-[#7A686E]">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#F6EBF0] border border-[#E8D1DC] px-2.5 py-1 text-[11px] font-medium text-[#7A2E48]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9E4765]" />
                  Admin Navigation Mode
                </span>
                <Link
                  href="/admin"
                  className="rounded-full border border-[#9E4765] bg-[#9E4765] text-white px-3.5 py-1.5 text-xs font-medium hover:bg-[#7A2E48] transition-colors"
                >
                  Return to Editorial Desk
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-[#EAE0DA] bg-white/70 px-3 py-1 shadow-2xs">
                <span className="italic font-serif text-xs sm:text-sm text-[#7A686E]">
                  The Bespoke Issue
                </span>
                <BrandLogoTransparent className="h-3.5 w-3.5 shrink-0" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="flex-1 py-6 sm:py-10 px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl py-20 text-center font-serif text-xl italic text-[#7A686E]">
              Opening your editorial brief...
            </div>
          }
        >
          <MagazineWizard isAdmin={isAdmin} />
        </Suspense>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#EFE6E0]/80 bg-white/60 py-6 px-4 sm:px-6 text-center text-xs text-[#8C7A80]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-center gap-2">
            <BrandLogoTransparent className="h-6 w-6 shrink-0" />
            <p className="font-serif italic text-sm text-[#6E5A61]">
              Custom Magazine &mdash; One-of-a-kind glossy keepsakes crafted from your memories.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#7A686E]">
            <BoboStudioTag variant="footer" />
            <span className="text-[#E6DAD3]">&bull;</span>
            <Link
              href="/privacy"
              className="hover:text-[#9E4765] transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-[#E6DAD3]">&bull;</span>
            <Link
              href="/terms"
              className="hover:text-[#9E4765] transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-[#E6DAD3]">&bull;</span>
            <Link
              href="/admin"
              className="hover:text-[#9E4765] transition-colors"
            >
              Editorial Desk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
