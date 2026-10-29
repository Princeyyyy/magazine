"use client";

import React from "react";
import { Mail, Check, Copy } from "lucide-react";
import { BrandLogoTransparent } from "@/components/icons/SectionIcons";

interface ThankYouViewProps {
  reference: string;
  whatsAppUrl?: string;
  herName?: string;
}

export function ThankYouView({ reference }: ThankYouViewProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyRef = async () => {
    await navigator.clipboard.writeText(reference).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-[#EFE6E0] bg-white p-8 sm:p-14 text-center space-y-8 shadow-[0_12px_40px_-16px_rgba(31,22,25,0.08)]">
      <div className="space-y-3">
        <div className="flex justify-center">
          <BrandLogoTransparent className="h-12 w-12" />
        </div>
        <p className="font-serif italic text-lg text-[#9E4765]">
          Custom Magazine
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1F1619] leading-tight">
          Thank you! I can&apos;t wait to create the magazine. I&apos;ll be in touch soon.
        </h1>
      </div>

      {/* Order Reference Card */}
      <div className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-6 space-y-2">
        <p className="text-xs uppercase tracking-widest text-[#7A686E]">
          Your Order Reference
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-wider text-[#1F1619]">
            {reference}
          </span>
          <button
            type="button"
            onClick={() => void handleCopyRef()}
            aria-label="Copy order reference"
            className="inline-flex items-center gap-1 rounded-full border border-[#D9C8C0] bg-white px-3 py-1 text-xs text-[#4A3A40] hover:border-[#9E4765] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#15803D]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Notice */}
      <div className="flex items-center justify-center gap-2 text-sm text-[#6E5A61] pt-1">
        <Mail className="h-4 w-4 text-[#9E4765]" />
        <span>
          A confirmation email with your order reference is on its way to your inbox.
        </span>
      </div>
    </div>
  );
}
