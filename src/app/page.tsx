import React, { Suspense } from "react";
import Link from "next/link";
import { MagazineWizard } from "@/components/wizard/magazine-wizard";
import {
  BrandLogoMark,
  BrandLogoTransparent,
} from "@/components/icons/SectionIcons";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7]">
      {/* Subtle Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-[#F5E6ED]/60 via-[#FAF3F0]/30 to-transparent -z-10"
      />

      {/* Editorial Masthead Header */}
      <header className="border-b border-[#EFE6E0]/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 font-serif text-2xl sm:text-3xl tracking-tight text-[#1F1619] font-normal"
          >
            <BrandLogoMark className="h-9 w-9 shrink-0" />
            <span>Custom Magazine</span>
          </Link>

          <div className="flex items-center gap-4 text-xs text-[#7A686E]">
            <span className="italic font-serif text-sm text-[#8C7A80]">
              The Bespoke Issue
            </span>
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
          <MagazineWizard />
        </Suspense>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#EFE6E0]/80 bg-white/60 py-6 px-4 sm:px-6 text-center text-xs text-[#8C7A80]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-center gap-2">
            <BrandLogoTransparent className="h-6 w-6 shrink-0" />
            <p className="font-serif italic text-sm text-[#6E5A61]">
              Custom Magazine &mdash; One-of-a-kind glossy keepsakes crafted from your memories.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#7A686E]">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
