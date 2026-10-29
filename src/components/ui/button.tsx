import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E4765]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#9E4765] text-white hover:bg-[#873954] shadow-sm hover:shadow",
        editorial:
          "bg-[#1F1619] text-[#FCF9F7] hover:bg-[#35262B] tracking-wide shadow-sm",
        outline:
          "border border-[#E6DAD3] bg-white text-[#1F1619] hover:bg-[#FAF4F0] hover:border-[#C5A4B1]",
        secondary:
          "bg-[#F6EBF0] text-[#7A2E48] hover:bg-[#EDD9E2]",
        ghost:
          "text-[#5C4950] hover:bg-[#F5EDE8] hover:text-[#1F1619]",
        destructive:
          "bg-[#B91C1C] text-white hover:bg-[#991B1B]",
      },
      size: {
        default: "h-11 px-6 py-2.5 rounded-full",
        sm: "h-9 px-4 text-xs rounded-full",
        lg: "h-12 px-8 text-sm tracking-wide rounded-full",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
