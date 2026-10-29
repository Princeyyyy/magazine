import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BrandLogoMark,
  BrandLogoTransparent,
} from "@/components/icons/SectionIcons";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Custom Magazine",
  description:
    "Terms of service governing custom magazine orders, content submissions, and bespoke editorial keepsakes.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7]">
      <header className="border-b border-[#EFE6E0]/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 font-serif text-2xl sm:text-3xl tracking-tight text-[#1F1619] font-normal"
          >
            <BrandLogoMark className="h-9 w-9 shrink-0" />
            <span>Custom Magazine</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-3.5 py-1.5 text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <article className="rounded-3xl border border-[#EFE6E0] bg-white p-8 sm:p-12 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-8 text-[#4A3A40]">
          <div className="border-b border-[#F3ECE7] pb-6 space-y-2">
            <p className="font-serif italic text-base text-[#9E4765]">
              Legal &amp; Editorial Terms
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
              Terms of Service
            </h1>
            <p className="text-xs text-[#8C7A80]">
              Last updated: October 2026
            </p>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              1. Bespoke Editorial Service
            </h2>
            <p>
              By submitting an order brief on Custom Magazine, you are commissioning a personalized editorial magazine created from the stories, answers, and photographs you provide through the online questionnaire.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              2. Content Ownership &amp; Permission
            </h2>
            <p>
              You retain full ownership of all photographs, stories, and personal text you upload. By checking the consent box and submitting your order, you confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                You willingly submitted the information and photographs for the creation of the custom magazine.
              </li>
              <li>
                You have the right and permission to share the photographs and personal details of the individuals featured in your submission.
              </li>
              <li>
                You grant me a limited, non-exclusive right to edit, crop, format, and print your submitted materials solely to produce and deliver your custom magazine order.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              3. Accuracy of Submitted Details
            </h2>
            <p>
              Because each magazine is custom-designed around your answers, please review spellings of names, dates, song titles, and captions carefully on the Final Proof step before submitting. I may lightly proofread for punctuation and layout flow while preserving your authentic words and voice.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              4. Photo Quality &amp; Selection
            </h2>
            <p>
              For the sharpest editorial print and layout results, please upload clear, high-resolution original photographs rather than compressed screenshots where possible. If any uploaded photos are too blurry or low-resolution for print, I will reach out to you using the contact information on your order.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              5. Revisions &amp; Communication
            </h2>
            <p>
              Once your order is submitted, you will receive an Order Reference (e.g., <code className="font-mono text-xs bg-[#FAF3F0] px-1.5 py-0.5 rounded">HM-2026-XXXX</code>). Please include this reference in any follow-up communication regarding updates or adjustments to your magazine.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-[#EFE6E0]/80 bg-white/60 py-6 px-4 sm:px-6 text-center text-xs text-[#8C7A80]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandLogoTransparent className="h-6 w-6 shrink-0" />
            <p className="font-serif italic text-sm text-[#6E5A61]">
              Custom Magazine &mdash; One-of-a-kind glossy keepsakes crafted from your memories.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#7A686E]">
            <Link href="/privacy" className="hover:text-[#9E4765] transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="text-[#9E4765] font-medium">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
