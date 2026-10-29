import React, { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThankYouView } from "@/components/wizard/thank-you-view";
import { BrandLogoMark } from "@/components/icons/SectionIcons";

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
            className="flex items-center gap-3 font-serif text-2xl sm:text-3xl tracking-tight text-[#1F1619] font-normal"
          >
            <BrandLogoMark className="h-9 w-9 shrink-0" />
            <span>Custom Magazine</span>
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
    </div>
  );
}
