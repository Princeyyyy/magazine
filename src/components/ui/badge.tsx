import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#9E4765] text-white",
        secondary: "border-[#E6D5DF] bg-[#F8EEF3] text-[#7A2E48]",
        outline: "border-[#D9C8C0] text-[#4A3A40] bg-white",
        success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
        warning: "border-[#FDE68A] bg-[#FEFCE8] text-[#B45309]",
        dev: "border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
