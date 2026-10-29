"use client";

import React, { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorialStatePage } from "@/components/editorial-state-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <EditorialStatePage
      folio="Oops"
      eyebrow="A Brief Interruption"
      title="Something didn't load quite right."
      description="A temporary hiccup stopped this page from loading. Your saved answers and photos are safe. Try again, or return to your magazine brief."
      actions={
        <>
          <Button size="lg" onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <BookOpen className="h-4 w-4" />
              Back to My Magazine Brief
            </Link>
          </Button>
        </>
      }
      footnote={error.digest ? `Reference: ${error.digest}` : undefined}
    />
  );
}
