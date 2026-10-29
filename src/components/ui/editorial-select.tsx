"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorialSelectOption {
  value: string;
  label: string;
}

export interface EditorialSelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: readonly EditorialSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  onChange?: (nextValue: string) => void;
  onBlur?: () => void;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md";
}

export function EditorialSelect({
  id,
  name,
  value,
  defaultValue = "",
  options,
  placeholder = "Select...",
  ariaLabel,
  onChange,
  onBlur,
  className,
  triggerClassName,
  size = "md",
}: EditorialSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    value ?? defaultValue
  );
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const currentValue = isControlled ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  useEffect(() => {
    if (isControlled && value !== undefined) {
      setInternalValue(value);
    }
  }, [isControlled, value]);

  useEffect(() => {
    if (!isOpen) return;
    selectedItemRef.current?.scrollIntoView({ block: "nearest" });

    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        onBlur?.();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onBlur]);

  const handleSelect = (nextVal: string) => {
    if (!isControlled) {
      setInternalValue(nextVal);
    }
    onChange?.(nextVal);
    setIsOpen(false);
    onBlur?.();
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      {name && <input type="hidden" name={name} value={currentValue} />}

      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex w-full items-center justify-between rounded-xl border bg-[#FCF9F7]/70 pl-3.5 pr-9 text-left transition-all duration-200 cursor-pointer focus:outline-none",
          size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
          isOpen
            ? "border-[#9E4765] bg-white ring-3 ring-[#9E4765]/12"
            : "border-[#EAE0DA] hover:border-[#D5C3BC] hover:bg-white",
          selectedOption ? "text-[#1F1619]" : "text-[#96838A]",
          triggerClassName
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C7A80] transition-transform duration-200",
            isOpen && "rotate-180 text-[#9E4765]"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 min-w-[150px] overflow-y-auto rounded-2xl border border-[#EAE0DA] bg-white p-1.5 shadow-[0_14px_36px_-10px_rgba(31,22,25,0.16)] animate-editorial-in"
        >
          {options.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <button
                key={opt.value}
                ref={isSelected ? selectedItemRef : undefined}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#FDF2F6] text-[#873954] font-medium"
                    : "text-[#1F1619] hover:bg-[#FAF3F0] hover:text-[#9E4765]"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#9E4765]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
