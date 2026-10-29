"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  type RepeatableRowsFieldConfig,
  adaptCopyByGender,
  autoCapitalizeFirst,
} from "@/config/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RepeatableRowsFieldProps {
  field: RepeatableRowsFieldConfig;
  rows: Record<string, string>[];
  onChange: (nextRows: Record<string, string>[]) => void;
  onBlurSave: () => void;
  errorMessage?: string;
  rowErrors?: Record<number, Record<string, string>>;
  gender?: string;
}

export function RepeatableRowsField({
  field,
  rows,
  onChange,
  onBlurSave,
  errorMessage,
  rowErrors,
  gender = "Female",
}: RepeatableRowsFieldProps) {
  const safeRows: Record<string, string>[] = Array.isArray(rows) ? rows : [];

  const filledRowsCount = safeRows.filter((row) =>
    field.subFields.every((sf) => (row[sf.key] ?? "").trim().length > 0)
  ).length;

  const handleCellChange = (
    rowIndex: number,
    subKey: string,
    nextVal: string
  ) => {
    const cappedVal = autoCapitalizeFirst(nextVal);
    const updated = safeRows.map((row, idx) =>
      idx === rowIndex ? { ...row, [subKey]: cappedVal } : row
    );
    onChange(updated);
  };

  const handleAddRow = () => {
    if (safeRows.length >= field.maxRows) return;
    const emptyRow: Record<string, string> = {};
    for (const sf of field.subFields) {
      emptyRow[sf.key] = "";
    }
    onChange([...safeRows, emptyRow]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (safeRows.length <= Math.max(1, field.minRows)) return;
    const updated = safeRows.filter((_, idx) => idx !== rowIndex);
    onChange(updated);
    onBlurSave();
  };

  const isSingleSubField = field.subFields.length === 1;

  return (
    <div className="space-y-4">
      {/* Subtle Header Metadata & Target Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A686E]">
        <div className="flex items-center gap-2.5">
          {field.targetHint && (
            <span className="italic font-serif text-sm text-[#6E5A61]">
              {adaptCopyByGender(field.targetHint, gender)}
            </span>
          )}
          {field.minRows > 0 && (
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                filledRowsCount >= field.minRows
                  ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                  : "bg-[#F9F0F4] text-[#873954] border-[#EAD4DF]"
              )}
            >
              {filledRowsCount} of {field.minRows} minimum
            </span>
          )}
        </div>
      </div>

      {/* Rows List */}
      <div className="space-y-2.5">
        {safeRows.map((row, rowIndex) => {
          const singleSf = field.subFields[0];
          const canRemove = safeRows.length > Math.max(1, field.minRows);

          if (isSingleSubField && singleSf) {
            const val = row[singleSf.key] ?? "";
            const cellErr = rowErrors?.[rowIndex]?.[singleSf.key];
            const adaptedPlaceholder = adaptCopyByGender(
              singleSf.placeholder,
              gender
            );

            return (
              <div key={rowIndex} className="space-y-1">
                <div className="group flex items-center gap-3">
                  <span className="w-6 text-right font-serif italic text-sm text-[#9E4765]/80 select-none">
                    {String(rowIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="relative flex-1">
                    <Input
                      value={val}
                      maxLength={singleSf.maxLength}
                      placeholder={adaptedPlaceholder}
                      aria-label={`${adaptCopyByGender(field.label, gender)} entry ${rowIndex + 1}`}
                      onChange={(e) =>
                        handleCellChange(rowIndex, singleSf.key, e.target.value)
                      }
                      onBlur={onBlurSave}
                      className={cn(
                        "pr-14",
                        cellErr ? "border-[#B91C1C]" : undefined
                      )}
                    />
                    {val.length > 0 && (
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[#A39197]">
                        {val.length}/{singleSf.maxLength}
                      </span>
                    )}
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      aria-label={`Remove entry ${rowIndex + 1}`}
                      onClick={() => handleRemoveRow(rowIndex)}
                      className="p-1.5 text-[#B5A3A9] opacity-60 group-hover:opacity-100 hover:text-[#B91C1C] transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {cellErr && (
                  <p className="pl-9 text-xs text-[#B91C1C]">{cellErr}</p>
                )}
              </div>
            );
          }

          return (
            <div
              key={rowIndex}
              className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7]/90 p-4 sm:p-5 space-y-3.5 transition-colors hover:border-[#E2D2C9]"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif italic text-sm text-[#9E4765]">
                  No. {String(rowIndex + 1).padStart(2, "0")}
                </span>
                {canRemove && (
                  <button
                    type="button"
                    aria-label={`Remove entry ${rowIndex + 1}`}
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="inline-flex items-center gap-1 text-xs text-[#96838A] hover:text-[#B91C1C] transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {field.subFields.map((sf) => {
                  const val = row[sf.key] ?? "";
                  const isLong = sf.type === "longText";
                  const cellErr = rowErrors?.[rowIndex]?.[sf.key];
                  const adaptedSubLabel = adaptCopyByGender(sf.label, gender);
                  const adaptedSubPlaceholder = adaptCopyByGender(
                    sf.placeholder,
                    gender
                  );

                  return (
                    <div
                      key={sf.key}
                      className={cn(
                        "space-y-1.5",
                        isLong ? "sm:col-span-2" : undefined
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-[#5C4950]">
                          {adaptedSubLabel}
                        </Label>
                        {val.length > 0 && (
                          <span className="text-[11px] text-[#A39197]">
                            {val.length}/{sf.maxLength}
                          </span>
                        )}
                      </div>
                      {isLong ? (
                        <Textarea
                          value={val}
                          maxLength={sf.maxLength}
                          placeholder={adaptedSubPlaceholder}
                          aria-label={`${adaptedSubLabel} for entry ${rowIndex + 1}`}
                          onChange={(e) =>
                            handleCellChange(rowIndex, sf.key, e.target.value)
                          }
                          onBlur={onBlurSave}
                          className={cn(
                            "min-h-[84px] bg-white",
                            cellErr ? "border-[#B91C1C]" : undefined
                          )}
                        />
                      ) : (
                        <Input
                          value={val}
                          maxLength={sf.maxLength}
                          placeholder={adaptedSubPlaceholder}
                          aria-label={`${adaptedSubLabel} for entry ${rowIndex + 1}`}
                          onChange={(e) =>
                            handleCellChange(rowIndex, sf.key, e.target.value)
                          }
                          onBlur={onBlurSave}
                          className={cn(
                            "bg-white",
                            cellErr ? "border-[#B91C1C]" : undefined
                          )}
                        />
                      )}
                      {cellErr && (
                        <p className="text-xs text-[#B91C1C]">{cellErr}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Row Button */}
      {safeRows.length < field.maxRows && (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add More ({safeRows.length} of {field.maxRows} max)
          </Button>
        </div>
      )}

      {/* Field-level Error */}
      {errorMessage && (
        <p role="alert" aria-live="polite" className="text-xs text-[#B91C1C]">
          {adaptCopyByGender(errorMessage, gender)}
        </p>
      )}
    </div>
  );
}
