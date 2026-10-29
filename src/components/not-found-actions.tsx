"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotFoundActionsProps {
  primaryHref?: string;
  primaryLabel?: string;
  autoRedirectSeconds?: number;
}

export function NotFoundActions({
  primaryHref = "/",
  primaryLabel = "Return to Magazine Brief",
  autoRedirectSeconds = 12,
}: NotFoundActionsProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(autoRedirectSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(primaryHref);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, secondsLeft, primaryHref, router]);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push(primaryHref);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={primaryHref}>
            <BookOpen className="h-4 w-4" />
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleGoBack}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </div>

      {autoRedirectSeconds > 0 && secondsLeft > 0 && !isPaused && (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#EFE6E0] bg-[#FCF9F7] px-3.5 py-1 text-xs text-[#7A686E]">
          <span>
            Taking you back home in{" "}
            <strong className="text-[#9E4765] font-semibold">
              {secondsLeft}s
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            className="inline-flex items-center gap-1 text-[11px] text-[#9E4765] hover:underline cursor-pointer ml-1"
          >
            <Pause className="h-3 w-3" />
            Pause
          </button>
        </div>
      )}

      {isPaused && (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#EFE6E0] bg-[#FCF9F7] px-3.5 py-1 text-xs text-[#7A686E]">
          <span>Auto-redirect paused</span>
          <button
            type="button"
            onClick={() => setIsPaused(false)}
            className="inline-flex items-center gap-1 text-[11px] text-[#9E4765] hover:underline cursor-pointer ml-1"
          >
            <Play className="h-3 w-3" />
            Resume
          </button>
        </div>
      )}
    </div>
  );
}
