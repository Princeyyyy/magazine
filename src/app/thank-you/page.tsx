import React, { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThankYouView } from "@/components/wizard/thank-you-view";
import { BrandLogoMark } from "@/components/icons/SectionIcons";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";

interface ThankYouPageProps {
  searchParams: Promise<{
    ref?: string;
    her?: string;
  }>;
}

async function ThankYouContent({ searchParams }: ThankYouPageProps) {
  const params = await searchParams;
  if (!params.ref || !params.ref.trim()) {
    redirect("/");
  }

  return <ThankYouView reference={params.ref.trim()} herName={params.her} />;
}

export default function ThankYouPage(props: ThankYouPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#E3D4CC] bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 flex items-center justify-between">
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
        </div>
      </header>

      <main className="flex-1 py-12 sm:py-20 px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="text-center font-serif text-lg text-[#6E5A61]">
              Loading your confirmation...
            </div>
          }
        >
          <ThankYouContent searchParams={props.searchParams} />
        </Suspense>
      </main>

      <footer className="border-t border-[#EFE6E0]/80 bg-white/60 py-6 px-4 sm:px-6 text-center text-xs text-[#8C7A80]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-serif italic text-sm text-[#6E5A61]">
            Custom Magazine &mdash; One-of-a-kind glossy keepsakes crafted from your memories.
          </p>
          <BoboStudioTag variant="footer" />
        </div>
      </footer>
    </div>
  );
}
