import React from "react";
import { cn } from "@/lib/utils";

interface BoboStudioTagProps {
  variant?: "masthead" | "badge" | "footer" | "seal" | "logo" | "flower";
  color?: "pink" | "brown";
  className?: string;
}

/**
 * Editorial brand signature: "Product of Bobo Studio"
 * Rendered across mastheads, footers, forms, and admin layouts using the official brand assets.
 */
export function BoboStudioTag({
  variant = "badge",
  color = "pink",
  className,
}: BoboStudioTagProps) {
  const flowerSrc =
    color === "brown"
      ? "/brand/png/flower-brown-256.png"
      : "/brand/png/flower-pink-256.png";

  if (variant === "logo") {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/png/robo-studio-logo-256.png"
          alt="Bobo Studio"
          className="h-8 w-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (variant === "flower") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flowerSrc}
        alt="Bobo Studio emblem"
        className={cn("h-4 w-4 object-contain inline-block", className)}
        loading="lazy"
      />
    );
  }

  if (variant === "masthead") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] font-sans font-medium text-[#9E4765]/90",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flowerSrc}
          alt=""
          className="h-3 w-3 object-contain shrink-0"
          aria-hidden="true"
        />
        <span>Product of Bobo Studio</span>
      </span>
    );
  }

  if (variant === "seal") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2.5 sm:gap-3 text-[11px] tracking-[0.2em] uppercase font-sans text-[#8C7A80]",
          className
        )}
      >
        <span className="h-px w-6 sm:w-10 bg-[#E8DCD5]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flowerSrc}
          alt=""
          className="h-4 w-4 object-contain shrink-0"
          aria-hidden="true"
        />
        <span>
          Product of{" "}
          <strong className="font-semibold text-[#1F1619] tracking-[0.22em]">
            Bobo Studio
          </strong>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flowerSrc}
          alt=""
          className="h-4 w-4 object-contain shrink-0"
          aria-hidden="true"
        />
        <span className="h-px w-6 sm:w-10 bg-[#E8DCD5]" />
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-xs text-[#5C4950] font-sans tracking-wide",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flowerSrc}
          alt=""
          className="h-3.5 w-3.5 object-contain shrink-0"
          aria-hidden="true"
        />
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flowerSrc}
        alt=""
        className="h-3 w-3 object-contain shrink-0"
        aria-hidden="true"
      />
      <span>Product of Bobo Studio</span>
    </span>
  );
}
