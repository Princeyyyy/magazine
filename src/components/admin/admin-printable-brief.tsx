"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FileDown,
  Check,
  Copy,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";
import { FORM_PAGES, adaptCopyByGender } from "@/config/form";
import {
  generateOrderWordBlob,
  generateOrderPdfBlob,
  getFormattedFieldLines,
  formatOrderStatusLabel,
} from "@/lib/editorial-exports";
import { cleanClipboardText } from "@/lib/editorial-text";

export interface PrintableOrderSummary {
  id: string;
  reference: string;
  status: string;
  customerName: string;
  relationship: string;
  herName: string;
  herNickname: string;
  birthdayDate: string;
  ageTurning: number | null;
  colourTheme: string;
  coverHeadline: string;
  email: string;
  phoneE164: string;
  driveFolderId: string;
  driveFolderUrl?: string;
  createdAt: string;
  submittedAt: string | null;
}

export interface PrintablePhotoItem {
  id: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  caption: string;
  isCover: boolean;
  sortOrder: number;
  category?: "solo" | "shared";
  uploadedAt: string;
}

interface AdminPrintableBriefProps {
  order: PrintableOrderSummary;
  values: Record<string, unknown>;
  photos: PrintablePhotoItem[];
  driveFolderUrl: string;
  /**
   * When true the page auto-triggers window.print() after a short delay
   * and hides the toolbar so only the document is visible in the print dialog.
   * Activated by opening the page with ?pdf=1.
   */
  autoPrint?: boolean;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function AdminPrintableBrief({
  order,
  values,
  photos,
  driveFolderUrl,
  autoPrint = false,
}: AdminPrintableBriefProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Optional auto-print mode if opened with ?print=1
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const selectedGender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  const starName = order.herName || "Featured Star";
  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];
  const formattedCreated = new Date(order.createdAt).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const copyText = async (key: string, text: string) => {
    const cleaned = cleanClipboardText(text);
    await navigator.clipboard.writeText(cleaned).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportWord = async () => {
    if (isExportingWord) return;
    setIsExportingWord(true);
    try {
      const blob = await generateOrderWordBlob(
        order,
        values,
        photos,
        driveFolderUrl
      );
      const safeName = (order.herName || "Magazine").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      triggerBlobDownload(
        blob,
        `${order.reference}-${safeName}-Editorial-Brief.docx`
      );
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleExportPdf = () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const blob = generateOrderPdfBlob(
        order,
        values,
        photos,
        driveFolderUrl
      );
      const safeName = (order.herName || "Magazine").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      triggerBlobDownload(
        blob,
        `${order.reference}-${safeName}-Editorial-Brief.pdf`
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6EFEB] text-[#1F1619] antialiased print:bg-white print:min-h-0">
      {/* Sticky top toolbar — hidden during printing */}
      {!autoPrint && (
        <header className="sticky top-0 z-50 print:hidden border-b border-[#E8D8CF] bg-[#1F1619]/95 text-white backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-md">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Left: back + order info */}
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[#D9C8C0] hover:text-white hover:bg-white/10 -ml-2"
              >
                <Link href={`/admin/orders/${order.id}`}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Order
                </Link>
              </Button>
              <div className="h-4 w-px bg-white/20 hidden sm:block" />
              <span className="font-mono text-xs font-semibold tracking-wider text-[#E8A6BE]">
                {order.reference}
              </span>
              <span className="text-xs text-white/70 hidden sm:inline">
                {starName}
              </span>
            </div>

            {/* Right: export buttons */}
            <div className="flex items-center gap-2">
              {/* Word export */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleExportWord()}
                disabled={isExportingWord}
                className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white"
              >
                {isExportingWord ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-[#E8A6BE]" />
                )}
                Word (.docx)
              </Button>

              {/* PDF export */}
              <Button
                type="button"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="bg-[#9E4765] hover:bg-[#8A3B54] text-white shadow-xs font-medium cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                )}
                PDF (.pdf)
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Main document */}
      <main className="max-w-4xl mx-auto my-6 sm:my-10 p-6 sm:p-12 bg-white rounded-3xl shadow-[0_12px_45px_-12px_rgba(31,22,25,0.08)] border border-[#EFE6E0] print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none print:rounded-none">
        {/* Masthead */}
        <header className="border-b-2 border-[#1F1619] pb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BoboStudioTag variant="flower" className="h-4 w-4" />
                <span className="font-serif text-xs uppercase tracking-[0.28em] text-[#9E4765] font-semibold">
                  Custom Magazine • Editorial Production Brief
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1F1619]">
                {starName}
              </h1>
              {order.herNickname && (
                <p className="font-serif text-base italic text-[#7A686E]">
                  Known lovingly as &ldquo;{order.herNickname}&rdquo;
                </p>
              )}
            </div>

            <div className="text-right space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#EAD4DF] bg-[#FCF9F7] px-3.5 py-1 text-xs font-semibold text-[#9E4765]">
                <span>{order.reference}</span>
                <span>•</span>
                <span>{formatOrderStatusLabel(order.status)}</span>
              </div>
              <p className="text-xs text-[#8C7A80]">Prepared on {formattedCreated}</p>
            </div>
          </div>

          {order.coverHeadline && (
            <div className="rounded-2xl bg-[#FCF9F7] border border-[#F3ECE7] px-5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E4765] block mb-0.5">
                Front Cover Headline
              </span>
              <p className="font-serif text-lg italic text-[#1F1619]">
                &ldquo;{order.coverHeadline}&rdquo;
              </p>
            </div>
          )}
        </header>

        {/* Specifications grid */}
        <section className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#FCF9F7] border border-[#F0E6E0] text-xs print:bg-white print:border-[#EAE0DA]">
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#8C7A80] text-[10px] block">
              Featured Star
            </span>
            <p className="font-medium text-[#1F1619] text-sm">{starName}</p>
            <p className="text-[#7A686E]">
              {order.ageTurning
                ? `Turning ${order.ageTurning} years old`
                : "Milestone Celebration"}
            </p>
            {order.birthdayDate && (
              <p className="text-[#7A686E]">Birthday: {order.birthdayDate}</p>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#8C7A80] text-[10px] block">
              Ordered By
            </span>
            <p className="font-medium text-[#1F1619] text-sm">
              {order.customerName || "Customer"}
            </p>
            <p className="text-[#7A686E]">
              Relationship: {order.relationship || "Special Friend"}
            </p>
            {order.email && (
              <p className="text-[#7A686E] truncate">{order.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#8C7A80] text-[10px] block">
              Design Palette
            </span>
            <p className="font-medium text-[#1F1619] text-sm">
              {order.colourTheme || "Editorial Classic Rose"}
            </p>
            <p className="text-[#7A686E]">Target Gender: {selectedGender}</p>
            <p className="text-[#7A686E]">Format: Standard A4 Magazine</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#8C7A80] text-[10px] block">
              Asset Manifest
            </span>
            <p className="font-medium text-[#1F1619] text-sm">
              {photos.length} High-Res Photos
            </p>
            {coverPhoto && (
              <p className="text-[#7A686E] truncate">
                Cover: {coverPhoto.originalName}
              </p>
            )}
            {driveFolderUrl && (
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9E4765] hover:underline inline-flex items-center gap-1 font-medium print:hidden"
              >
                <FolderOpen className="h-3 w-3" />
                Drive Folder
              </a>
            )}
          </div>
        </section>

        {/* Chapters */}
        <div className="space-y-8 mt-8">
          {FORM_PAGES.map((page) => {
            // Chapter 7: Photos Manifest
            if (page.pageNumber === 7) {
              const fallbackLink =
                typeof values["photos_drive_fallback_link"] === "string"
                  ? values["photos_drive_fallback_link"].trim()
                  : "";

              return (
                <section
                  key={page.id}
                  className="space-y-4 print-avoid-break pt-4 border-t border-[#F0E6E0]"
                >
                  <div className="rounded-xl bg-[#F6EBF0] px-4 py-2.5 flex items-center justify-between border-l-4 border-[#9E4765]">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#9E4765]">
                        Chapter {page.pageNumber} • Photo Gallery
                      </span>
                      <h2 className="font-serif text-lg font-bold text-[#1F1619]">
                        {page.title}
                      </h2>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white">
                      {photos.length} Photos
                    </Badge>
                  </div>

                  {driveFolderUrl && (
                    <div className="text-xs p-3.5 rounded-xl bg-[#FCF9F7] border border-[#EFE6E0] space-y-1">
                      <span className="font-bold text-[#9E4765] block">
                        Google Drive Master Order Folder:
                      </span>
                      <a
                        href={driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#5C4950] break-all hover:underline"
                      >
                        {driveFolderUrl}
                      </a>
                    </div>
                  )}

                  {fallbackLink && (
                    <div className="text-xs p-3.5 rounded-xl bg-[#FCF9F7] border border-[#EFE6E0] space-y-1">
                      <span className="font-bold text-[#9E4765] block">
                        Customer Alternate Photo Link:
                      </span>
                      <span className="font-mono text-[#5C4950] break-all">
                        {fallbackLink}
                      </span>
                    </div>
                  )}

                  {photos.length === 0 ? (
                    <p className="text-xs italic text-[#A39197] p-4 bg-[#FCF9F7] rounded-xl text-center">
                      No photos uploaded to this order yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#EFE6E0]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF5F2] border-b border-[#EFE6E0] text-[#7A686E] uppercase font-semibold text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3">Photo File</th>
                            <th className="py-2.5 px-3 w-20">Type</th>
                            <th className="py-2.5 px-3 w-20">Size</th>
                            <th className="py-2.5 px-3">
                              Caption Written by Customer
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F3ECE7]">
                          {photos.map((photo, idx) => (
                            <tr
                              key={photo.id}
                              className={
                                photo.isCover
                                  ? "bg-[#FFF9FA]"
                                  : "hover:bg-[#FCF9F7]"
                              }
                            >
                              <td className="py-2 px-3 text-center font-mono text-[#A39197]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-[#1F1619]">
                                <div className="flex items-center gap-1.5">
                                  <span>{photo.originalName}</span>
                                  {photo.isCover && (
                                    <Badge className="bg-[#9E4765] text-white text-[9px] px-1.5 py-0">
                                      COVER
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-[#7A686E] capitalize">
                                {photo.category || "solo"}
                              </td>
                              <td className="py-2 px-3 font-mono text-[#8C7A80]">
                                {formatBytes(photo.sizeBytes)}
                              </td>
                              <td className="py-2 px-3 text-[#1F1619] italic font-serif leading-relaxed">
                                {photo.caption || (
                                  <span className="text-[#B8A8AF] not-italic text-[11px]">
                                    (No caption provided)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            }

            // Question chapters
            const populatedGroups = page.groups
              .map((group) => {
                const answeredFields = group.fields
                  .filter((field) => {
                    if (field.type === "photoUpload") return false;
                    if (field.conditional) {
                      if (
                        values[field.conditional.fieldKey] !==
                        field.conditional.equals
                      )
                        return false;
                    }
                    return getFormattedFieldLines(field, values).length > 0;
                  })
                  .map((field) => ({
                    key: field.key,
                    label: adaptCopyByGender(field.label, selectedGender),
                    lines: getFormattedFieldLines(field, values),
                  }));

                return {
                  id: group.id,
                  title: adaptCopyByGender(group.title, selectedGender),
                  fields: answeredFields,
                };
              })
              .filter((g) => g.fields.length > 0);

            if (populatedGroups.length === 0) return null;

            return (
              <section
                key={page.id}
                className="space-y-5 print-avoid-break pt-5 border-t border-[#F0E6E0]"
              >
                {/* Chapter banner */}
                <div className="rounded-xl bg-[#F6EBF0] px-4 py-2.5 flex items-center justify-between border-l-4 border-[#9E4765]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#9E4765]">
                      Chapter {page.pageNumber} •{" "}
                      {adaptCopyByGender(
                        page.subtitle || "Editorial Section",
                        selectedGender
                      )}
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#1F1619]">
                      {adaptCopyByGender(page.title, selectedGender)}
                    </h2>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white">
                    {populatedGroups.reduce(
                      (acc, g) => acc + g.fields.length,
                      0
                    )}{" "}
                    Answers
                  </Badge>
                </div>

                {/* Groups */}
                <div className="space-y-6">
                  {populatedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-[#F3ECE7] bg-[#FCF9F7]/70 p-5 space-y-4 print-avoid-break print:bg-white"
                    >
                      <div className="flex items-center justify-between border-b border-[#EFE6E0] pb-2">
                        <h3 className="font-serif text-base font-semibold text-[#1F1619]">
                          {group.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = group.fields
                              .map(
                                (f) =>
                                  `**${f.label}:**\n${f.lines.join("\n")}`
                              )
                              .join("\n\n");
                            void copyText(`grp-${group.id}`, formatted);
                          }}
                          className="print:hidden inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-2 py-0.5 text-[10px] text-[#5C4950] hover:text-[#9E4765] cursor-pointer"
                        >
                          {copiedKey === `grp-${group.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-[#15803D]" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Group
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-4">
                        {group.fields.map((field) => (
                          <div
                            key={field.key}
                            className="space-y-1.5 print-avoid-break group/field"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#7A686E] tracking-wide">
                                {field.label}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void copyText(
                                    field.key,
                                    field.lines.join("\n")
                                  )
                                }
                                className="print:hidden opacity-0 group-hover/field:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] text-[#9E4765] hover:underline cursor-pointer"
                              >
                                {copiedKey === field.key ? (
                                  <Check className="h-3 w-3 text-[#15803D]" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                Copy
                              </button>
                            </div>

                            <div className="font-serif text-sm text-[#1F1619] leading-relaxed whitespace-pre-wrap rounded-xl bg-white p-3.5 border border-[#EFE6E0] print:border-[#E8D8CF]">
                              {field.lines.map((line, i) => (
                                <p key={i} className="mb-1 last:mb-0">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-[#EAE0DA] text-center space-y-1 text-xs text-[#8C7A80] print:mt-8">
          <div className="flex items-center justify-center gap-2">
            <BoboStudioTag variant="flower" className="h-3.5 w-3.5" />
            <span className="font-serif tracking-widest uppercase font-semibold text-[11px] text-[#9E4765]">
              Custom Magazine • A Product of Bobo Studio
            </span>
          </div>
          <p className="text-[10px] text-[#A39197]">
            Confidential Editorial Production Document for Order{" "}
            {order.reference} • All Rights Reserved
          </p>
        </footer>
      </main>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          html,
          body {
            background-color: #ffffff !important;
            color: #1f1619 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
