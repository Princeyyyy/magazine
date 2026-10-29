"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { autoCapitalizeFirst } from "@/config/form";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, onChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (typeof e.target.value === "string" && e.target.value.length > 0) {
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

  return (
    <textarea
      autoCapitalize="sentences"
      rows={props.rows ?? 3}
      onChange={handleChange}
      className={cn(
        "flex min-h-[110px] w-full resize-none overflow-hidden rounded-xl border border-[#EAE0DA] bg-[#FCF9F7]/70 px-4 py-3 text-sm text-[#1F1619] leading-relaxed placeholder:text-[#A39197] focus-visible:outline-none focus-visible:bg-white focus-visible:border-[#9E4765] focus-visible:ring-3 focus-visible:ring-[#9E4765]/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 [field-sizing:content]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
