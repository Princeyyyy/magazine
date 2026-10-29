"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { EditorialSelect } from "@/components/ui/editorial-select";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function getDaysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function parseIsoDate(value: string): {
  year: number;
  monthIndex: number; // 0-11
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const maxDay = getDaysInMonth(year, month - 1);
  if (day < 1 || day > maxDay) return null;
  return { year, monthIndex: month - 1, day };
}

function formatIsoDate(year: number, monthIndex: number, day: number): string {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface EditorialDatePickerProps {
  id?: string;
  value: string;
  onChange: (nextIsoDate: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
}

export function EditorialDatePicker({
  id,
  value,
  onChange,
  onBlur,
  hasError,
}: EditorialDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const parsed = parseIsoDate(value);

  const [selectedYear, setSelectedYear] = useState<string>(
    parsed ? String(parsed.year) : ""
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    parsed ? String(parsed.monthIndex) : ""
  );
  const [selectedDay, setSelectedDay] = useState<string>(
    parsed ? String(parsed.day) : ""
  );

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(
    parsed ? parsed.year : currentYear - 25
  );
  const [viewMonth, setViewMonth] = useState<number>(
    parsed ? parsed.monthIndex : 0
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    const p = parseIsoDate(value);
    if (p) {
      setSelectedYear(String(p.year));
      setSelectedMonth(String(p.monthIndex));
      setSelectedDay(String(p.day));
      setViewYear(p.year);
      setViewMonth(p.monthIndex);
    } else if (!value) {
      setSelectedYear("");
      setSelectedMonth("");
      setSelectedDay("");
    }
  }, [value]);

  // Close calendar popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen, onBlur]);

  const commitParts = (yStr: string, mStr: string, dStr: string) => {
    if (yStr !== "" && mStr !== "" && dStr !== "") {
      const y = Number(yStr);
      const m = Number(mStr);
      const maxD = getDaysInMonth(y, m);
      const clampedDay = Math.min(Number(dStr), maxD);
      if (clampedDay !== Number(dStr)) {
        setSelectedDay(String(clampedDay));
      }
      onChange(formatIsoDate(y, m, clampedDay));
    } else if (yStr === "" && mStr === "" && dStr === "") {
      onChange("");
    }
  };

  const maxDaysForSelection =
    selectedYear !== "" && selectedMonth !== ""
      ? getDaysInMonth(Number(selectedYear), Number(selectedMonth))
      : 31;

  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1920; y--) {
    years.push(y);
  }

  const dayOptions = Array.from({ length: maxDaysForSelection }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const monthOptions = MONTHS.map((m, idx) => ({
    value: String(idx),
    label: m,
  }));

  const yearOptions = years.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const daysInViewMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectCalendarDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth);
    const dStr = String(day);
    setSelectedYear(yStr);
    setSelectedMonth(mStr);
    setSelectedDay(dStr);
    onChange(formatIsoDate(viewYear, viewMonth, day));
    setIsOpen(false);
    onBlur?.();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formattedDisplay = parsed
    ? `${parsed.day} ${MONTHS[parsed.monthIndex]} ${parsed.year}`
    : null;

  return (
    <div ref={containerRef} id={id} className="relative space-y-2">
      <div
        className={cn(
          "flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-2xl border bg-[#FCF9F7]/70 p-2 transition-all duration-200",
          hasError ? "border-[#B91C1C]" : "border-[#EAE0DA]"
        )}
      >
        {/* Day Dropdown */}
        <EditorialSelect
          ariaLabel="Day"
          placeholder="Day"
          value={selectedDay}
          options={dayOptions}
          onChange={(nextDay) => {
            setSelectedDay(nextDay);
            commitParts(selectedYear, selectedMonth, nextDay);
          }}
          onBlur={onBlur}
          size="sm"
          className="flex-1 min-w-[92px]"
          triggerClassName="bg-white border-[#EFE6E0]"
        />

        {/* Month Dropdown */}
        <EditorialSelect
          ariaLabel="Month"
          placeholder="Month"
          value={selectedMonth}
          options={monthOptions}
          onChange={(nextMonth) => {
            setSelectedMonth(nextMonth);
            if (nextMonth !== "") setViewMonth(Number(nextMonth));
            commitParts(selectedYear, nextMonth, selectedDay);
          }}
          onBlur={onBlur}
          size="sm"
          className="flex-[1.6] min-w-[140px]"
          triggerClassName="bg-white border-[#EFE6E0]"
        />

        {/* Year Dropdown */}
        <EditorialSelect
          ariaLabel="Year"
          placeholder="Year"
          value={selectedYear}
          options={yearOptions}
          onChange={(nextYear) => {
            setSelectedYear(nextYear);
            if (nextYear !== "") setViewYear(Number(nextYear));
            commitParts(nextYear, selectedMonth, selectedDay);
          }}
          onBlur={onBlur}
          size="sm"
          className="flex-1 min-w-[104px]"
          triggerClassName="bg-white border-[#EFE6E0]"
        />

        {/* Interactive Calendar Popover Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open calendar picker"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-medium transition-colors cursor-pointer shrink-0",
            isOpen
              ? "border-[#9E4765] bg-[#9E4765] text-white"
              : "border-[#EFE6E0] bg-white text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765]"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {formattedDisplay || "Calendar"}
          </span>
        </button>
      </div>

      {/* Floating Editorial Calendar Popover */}
      {isOpen && (
        <div className="z-30 mt-1 w-full max-w-sm rounded-3xl border border-[#EAE0DA] bg-white p-4 shadow-[0_16px_40px_-12px_rgba(31,22,25,0.16)] animate-editorial-in">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F3ECE7]">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EFE6E0] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-1 items-center gap-1.5">
              <EditorialSelect
                ariaLabel="Calendar month"
                value={String(viewMonth)}
                options={monthOptions}
                onChange={(val) => setViewMonth(Number(val))}
                size="sm"
                className="flex-[1.4]"
              />

              <EditorialSelect
                ariaLabel="Calendar year"
                value={String(viewYear)}
                options={yearOptions}
                onChange={(val) => setViewYear(Number(val))}
                size="sm"
                className="flex-1"
              />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EFE6E0] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 pt-3 text-center">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-[10px] font-medium uppercase tracking-wider text-[#96838A] py-1"
              >
                {wd}
              </div>
            ))}

            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map(
              (day) => {
                const isSelected =
                  parsed &&
                  parsed.year === viewYear &&
                  parsed.monthIndex === viewMonth &&
                  parsed.day === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectCalendarDay(day)}
                    className={cn(
                      "h-8 w-8 mx-auto rounded-full text-xs transition-all cursor-pointer flex items-center justify-center",
                      isSelected
                        ? "bg-[#9E4765] text-white font-semibold shadow-2xs"
                        : "text-[#1F1619] hover:bg-[#F6EBF0] hover:text-[#9E4765]"
                    )}
                  >
                    {day}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
