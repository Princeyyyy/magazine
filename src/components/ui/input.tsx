"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { autoCapitalizeFirst } from "@/config/form";

export interface InputProps extends React.ComponentProps<"input"> {
  disableAutoCapitalize?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disableAutoCapitalize, onChange, onWheel, ...props }, ref) => {
    const shouldAutoCap =
      !disableAutoCapitalize &&
      type !== "email" &&
      type !== "number" &&
      type !== "date" &&
      type !== "tel" &&
      type !== "url" &&
      type !== "password";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (shouldAutoCap && typeof e.target.value === "string" && e.target.value.length > 0) {
        const capped = autoCapitalizeFirst(e.target.value);
        if (capped !== e.target.value) {
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          e.target.value = capped;
          if (start !== null && end !== null) {
            e.target.setSelectionRange(start, end);
          }
        }
      }
      onChange?.(e);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Prevent mouse wheel from accidentally changing number inputs
      if (type === "number") {
        e.currentTarget.blur();
      }
      onWheel?.(e);
    };

    return (
      <input
        type={type}
        autoCapitalize={shouldAutoCap ? "sentences" : "off"}
        onChange={handleChange}
        onWheel={handleWheel}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#EAE0DA] bg-[#FCF9F7]/70 px-4 py-2.5 text-sm text-[#1F1619] placeholder:text-[#A39197] focus-visible:outline-none focus-visible:bg-white focus-visible:border-[#9E4765] focus-visible:ring-3 focus-visible:ring-[#9E4765]/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
