import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BrandLogoMark,
  BrandLogoTransparent,
} from "@/components/icons/SectionIcons";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Custom Magazine",
  description:
    "How I collect, store, and protect the stories, answers, and photographs you submit for your custom magazine keepsake.",
};

export default function PrivacyPolicyPage() {
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
              Legal &amp; Trust
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
              Privacy Policy
            </h1>
            <p className="text-xs text-[#8C7A80]">
              Last updated: October 2026
            </p>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              1. Overview
            </h2>
            <p>
              Custom Magazine creates bespoke, one-of-a-kind editorial keepsake magazines from the stories, answers, and photographs you share. I take your privacy and the personal memories of the person featured in your magazine seriously. This policy explains what information I collect, how I use it, and how it is protected.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              2. Information I Collect
            </h2>
            <p>
              When you start or submit a custom magazine order on this website, I collect only the information needed to design, produce, and deliver your magazine:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Contact Details:</strong> Your name, email address, and phone number so I can send your order reference, save-and-resume links, and updates about your magazine.
              </li>
              <li>
                <strong>Questionnaire Answers &amp; Stories:</strong> Names, nicknames, dates, memories, favourite things, inside jokes, and notes from loved ones that you enter into the form to be featured in the magazine pages.
              </li>
              <li>
                <strong>Uploaded Photographs &amp; Captions:</strong> High-resolution photographs and captions you upload for the cover and interior spreads of your custom magazine.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              3. How I Use &amp; Store Your Information
            </h2>
            <p>
              All stories, questionnaire answers, and uploaded photographs are used <strong>solely for creating, designing, and fulfilling your custom magazine order</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Your questionnaire progress and order details are stored securely in an encrypted PostgreSQL database (Neon).
              </li>
              <li>
                Your uploaded photographs are stored in a private, dedicated per-order folder in Google Drive accessible only to me for laying out your magazine.
              </li>
              <li>
                I never sell, rent, or share your personal data, stories, or photographs with third-party marketers or public galleries without your explicit permission.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              4. Saving Your Progress &amp; Cookies
            </h2>
            <p>
              This website uses local browser storage and a secure draft token so you can close the tab and pick up right where you left off without losing your answers or uploaded photos. No third-party advertising or tracking cookies are used.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              5. Data Retention &amp; Deletion Requests
            </h2>
            <p>
              I retain your order brief and uploaded photographs while your magazine is being designed and for a reasonable period afterward in case you request reprints or revisions. You may request complete deletion of your questionnaire answers and uploaded photographs at any time once your order is complete.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="font-serif text-xl text-[#1F1619]">
              6. Contact
            </h2>
            <p>
              If you have any questions about this Privacy Policy or wish to update or delete your submitted information, please reach out directly via the email address provided in your order confirmation.
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
            <Link href="/privacy" className="text-[#9E4765] font-medium">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-[#9E4765] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
