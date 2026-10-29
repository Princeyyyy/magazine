import React from "react";
import Link from "next/link";
import { BrandLogoMark } from "@/components/icons/SectionIcons";

interface EditorialStatePageProps {
  /** Large decorative folio number, e.g. "404" */
  folio: string;
  eyebrow: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  /** Optional footnote under the actions */
  footnote?: React.ReactNode;
  /** Render the public brand header (off when nested inside the admin layout) */
  withHeader?: boolean;
}

/**
 * Shared editorial layout for 404 / error / lost-route states so every dead end
 * still looks like a page of the magazine and always offers a way back.
 */
export function EditorialStatePage({
  folio,
  eyebrow,
  title,
  description,
  actions,
  footnote,
  withHeader = true,
}: EditorialStatePageProps) {
  return (
    <div className={withHeader ? "min-h-screen flex flex-col" : "flex flex-col"}>
      {withHeader && (
        <header className="border-b border-[#E3D4CC] bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 font-serif text-2xl sm:text-3xl tracking-tight text-[#1F1619] font-normal"
            >
              <BrandLogoMark className="h-9 w-9 shrink-0" />
              <span>Custom Magazine</span>
            </Link>
          </div>
        </header>
      )}

      <main
        className={
          withHeader
            ? "flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24"
            : "flex items-center justify-center py-10 sm:py-16"
        }
      >
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#EFE6E0] bg-white px-8 py-12 sm:px-14 sm:py-16 text-center shadow-[0_12px_40px_-16px_rgba(31,22,25,0.08)] animate-editorial-in">
          {/* Decorative oversized folio number behind the copy */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-2 select-none font-serif text-[9rem] sm:text-[12rem] leading-none font-semibold text-[#F6EBF0]"
          >
            {folio}
          </span>

          <div className="relative space-y-6">
            <div className="flex justify-center">
              <BrandLogoMark className="h-12 w-12" />
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9E4765]">
                {eyebrow}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-[#1F1619]">
                {title}
              </h1>
              <div className="mx-auto flex items-center justify-center gap-3 text-[#D9C8C0]">
                <span className="h-px w-10 bg-current" />
                <span className="font-serif italic text-sm text-[#9E4765]">
                  Custom Magazine
                </span>
                <span className="h-px w-10 bg-current" />
              </div>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-[#6E5A61]">
                {description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {actions}
            </div>

            {footnote && (
              <p className="text-xs text-[#96838A] leading-relaxed">{footnote}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
