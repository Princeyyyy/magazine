import React from "react";
import { cn } from "@/lib/utils";

interface BoboStudioTagProps {
  variant?: "masthead" | "badge" | "footer" | "seal";
  className?: string;
}

/**
 * Editorial brand signature: "Product of Bobo Studio"
 * Rendered across mastheads, footers, forms, and admin layouts.
 */
export function BoboStudioTag({
  variant = "badge",
  className,
}: BoboStudioTagProps) {
  if (variant === "masthead") {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[10px] uppercase tracking-[0.24em] font-sans font-medium text-[#9E4765]/90",
          className
        )}
      >
        Product of Bobo Studio
      </span>
    );
  }

  if (variant === "seal") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2.5 text-[11px] tracking-[0.2em] uppercase font-sans text-[#8C7A80]",
          className
        )}
      >
        <span className="h-px w-6 sm:w-8 bg-[#E8DCD5]" />
        <span>
          Product of{" "}
          <strong className="font-semibold text-[#1F1619] tracking-[0.22em]">
            Bobo Studio
          </strong>
        </span>
        <span className="h-px w-6 sm:w-8 bg-[#E8DCD5]" />
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-[#5C4950] font-sans tracking-wide",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#9E4765]" />
        <span>
          Product of{" "}
          <strong className="font-medium text-[#1F1619]">Bobo Studio</strong>
        </span>
      </div>
    );
  }

  // Default "badge"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#EAD4DF] bg-[#FDF8FA] px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase text-[#9E4765]",
        className
      )}
    >
      <span className="h-1 w-1 rounded-full bg-[#9E4765]" />
      Product of Bobo Studio
    </span>
  );
}
