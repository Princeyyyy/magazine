"use client";

import React from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { BrandLogoTransparent } from "@/components/icons/SectionIcons";

interface ThankYouViewProps {
  reference: string;
  herName?: string;
}

export function ThankYouView({ reference, herName }: ThankYouViewProps) {
  const [copiedRef, setCopiedRef] = React.useState(false);
  const [copiedMsg, setCopiedMsg] = React.useState(false);

  const starText = herName && herName.trim() ? ` for ${herName.trim()}` : "";
  const completionMessage = `Hi! I have just completed the Custom Magazine form${starText}. My order reference is ${reference}.`;

  const handleCopyRef = async () => {
    await navigator.clipboard.writeText(reference).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(completionMessage).catch(() => {});
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
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
          Thank you! I can&apos;t wait to create the magazine.
        </h1>
        <p className="text-sm text-[#6E5A61] max-w-md mx-auto leading-relaxed">
          All of your chapters, answers, and photographs have been safely received at the Editorial Desk.
        </p>
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
            {copiedRef ? (
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

      {/* Final Step: Let Me Know on WhatsApp Card */}
      <div className="rounded-2xl border border-[#EAD4DF] bg-[#FDF8FA] p-6 sm:p-7 text-left space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9E4765] text-white shadow-2xs">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9E4765]">
              Final Step
            </p>
            <h2 className="font-serif text-xl text-[#1F1619]">
              Let me know on WhatsApp that you&apos;re done
            </h2>
            <p className="text-xs sm:text-sm text-[#5C4950] leading-relaxed">
              Send me a quick message in our WhatsApp chat with your order reference below so I know your form is complete and can begin working on your magazine right away.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E8D5DF] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[#1F1619] italic leading-relaxed">
            &ldquo;{completionMessage}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => void handleCopyMessage()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#9E4765] px-4 py-2 text-xs font-medium text-white hover:bg-[#873954] transition-colors cursor-pointer shadow-2xs"
          >
            {copiedMsg ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Message Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy WhatsApp Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
