"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_PAGES, adaptCopyByGender, type GroupConfig } from "@/config/form";
import { type OrderStatus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EditorialSelect } from "@/components/ui/editorial-select";
import { getSectionIcon } from "@/components/icons/SectionIcons";
import {
  Copy,
  Check,
  Mail,
  FolderOpen,
  Download,
  FileText,
  FileJson,
  Star,
  ExternalLink,
} from "lucide-react";

interface OrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
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
  createdAt: string;
  submittedAt: string | null;
}

interface AdminPhotoItem {
  id: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  caption: string;
  isCover: boolean;
  sortOrder: number;
  uploadedAt: string;
}

interface AdminNoteItem {
  id: string;
  adminEmail: string;
  body: string;
  createdAt: string;
}

interface AdminMessageLogItem {
  id: string;
  channel: string;
  template: string;
  status: string;
  error: string | null;
  createdAt: string;
}

interface AdminStatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  adminEmail: string;
  createdAt: string;
}

interface AdminOrderDetailClientProps {
  order: OrderSummary;
  values: Record<string, unknown>;
  photos: AdminPhotoItem[];
  notes: AdminNoteItem[];
  messageLogs: AdminMessageLogItem[];
  statusHistory: AdminStatusHistoryItem[];
  driveFolderUrl: string;
  openWaChatUrl?: string;
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_photos", label: "Awaiting Photos" },
  { value: "in_design", label: "In Design" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function formatGroupAsText(
  group: GroupConfig,
  values: Record<string, unknown>,
  gender = "Female"
): string {
  const lines: string[] = [`### ${adaptCopyByGender(group.title, gender)}`];

  for (const field of group.fields) {
    if (field.type === "photoUpload") continue;
    if (field.conditional) {
      if (values[field.conditional.fieldKey] !== field.conditional.equals) {
        continue;
      }
    }

    const raw = values[field.key];
    const adaptedLabel = adaptCopyByGender(field.label, gender);
    if (field.type === "repeatableRows") {
      const rows = Array.isArray(raw) ? (raw as Record<string, string>[]) : [];
      const filled = rows.filter((r) =>
        field.subFields.some((sf) => (r[sf.key] ?? "").trim().length > 0)
      );
      lines.push(`\n**${adaptedLabel}:**`);
      if (filled.length === 0) {
        lines.push(`- (None provided)`);
      } else {
        filled.forEach((row, idx) => {
          const joined = field.subFields
            .map((sf) => (row[sf.key] ?? "").trim())
            .filter(Boolean)
            .join(" — ");
          lines.push(`${idx + 1}. ${joined}`);
        });
      }
    } else {
      const str =
        raw !== undefined && raw !== null && String(raw).trim() !== ""
          ? String(raw).trim()
          : "(Not provided)";
      lines.push(`- **${adaptedLabel}:** ${str}`);
    }
  }

  return lines.join("\n");
}

export function buildFullMarkdownBrief(
  order: OrderSummary,
  values: Record<string, unknown>,
  photos: AdminPhotoItem[],
  driveFolderUrl: string
): string {
  const gender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  const sections: string[] = [
    `# Custom Magazine Brief — ${order.reference}`,
    ``,
    `- **Featured Star:** ${order.herName || "Untitled"} (${gender})`,
    `- **Ordered By:** ${order.customerName || "Unknown"} (${order.relationship || "Loved one"})`,
    `- **Status:** ${order.status}`,
    `- **Customer Email:** ${order.email || "—"}`,
    `- **Customer Phone:** ${order.phoneE164 || "—"}`,
    `- **Photos Uploaded:** ${photos.length} (Google Drive Folder: ${driveFolderUrl})`,
    ``,
  ];

  for (const page of FORM_PAGES) {
    sections.push(
      `## Page ${page.pageNumber}: ${adaptCopyByGender(page.title, gender)} (${adaptCopyByGender(page.subtitle, gender)})`
    );
    sections.push(``);
    for (const group of page.groups) {
      sections.push(formatGroupAsText(group, values, gender));
      sections.push(``);
    }
  }

  sections.push(`## Uploaded Photos & Captions Manifest (${photos.length})`);
  sections.push(`Google Drive Folder: ${driveFolderUrl}`);
  sections.push(``);
  photos.forEach((p, idx) => {
    sections.push(
      `${idx + 1}. ${p.originalName}${p.isCover ? " [COVER]" : ""} — Caption: ${
        p.caption || "(none)"
      }`
    );
  });

  return sections.join("\n");
}

export function AdminOrderDetailClient({
  order,
  values,
  photos,
  notes: initialNotes,
  messageLogs,
  statusHistory,
  driveFolderUrl,
}: AdminOrderDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedGender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  // Notes state
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Send Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState(
    `Update on ${order.herName || "your"}'s custom magazine (${order.reference})`
  );
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    setStatus(nextStatus);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", status: nextStatus }),
    });
    if (res.ok) {
      showToast(`Order status updated to "${nextStatus.replace(/_/g, " ")}".`);
      router.refresh();
    } else {
      showToast("Failed to update status.");
    }
  };

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          emailSubject,
          emailMessage,
        }),
      });
      if (res.ok) {
        showToast("Email sent to customer and logged.");
        setShowEmailModal(false);
        setEmailMessage("");
        router.refresh();
      } else {
        showToast("Failed to send email.");
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_note", noteBody: noteInput }),
      });
      if (res.ok) {
        setNoteInput("");
        showToast("Note added to order.");
        router.refresh();
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleExportMarkdown = () => {
    const md = buildFullMarkdownBrief(order, values, photos, driveFolderUrl);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.reference}-brief.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      order,
      answers: values,
      photos,
      driveFolderUrl,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.reference}-answers.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyFullBrief = async () => {
    const md = buildFullMarkdownBrief(order, values, photos, driveFolderUrl);
    await copyText("full-brief", md);
    showToast("Full editorial brief copied to clipboard.");
  };

  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-[#9E4765] bg-[#1F1619] px-5 py-3 text-xs font-medium text-white shadow-lg">
          {actionToast}
        </div>
      )}

      {/* Top Order Brief Header Card */}
      <div className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F3ECE7] pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#9E4765] bg-[#F6EBF0] px-3 py-1 rounded-full">
                {order.reference}
              </span>
              <Badge variant="outline" className="rounded-full">
                {selectedGender}
              </Badge>
              <span className="text-xs text-[#7A686E]">
                Created{" "}
                {new Date(order.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
              {order.herName || "Untitled Star"}
              {order.ageTurning ? (
                <span className="font-serif italic text-2xl text-[#7A686E] ml-2">
                  (Turning {order.ageTurning})
                </span>
              ) : null}
            </h1>
            <p className="text-xs text-[#5C4950]">
              Ordered by <strong>{order.customerName || "—"}</strong> (
              {order.relationship || "Loved one"}) &bull; Theme:{" "}
              <strong>{order.colourTheme || "—"}</strong>
            </p>
          </div>

          {/* Status Workflow Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="order-status-select"
              className="text-xs font-medium text-[#7A686E]"
            >
              Order Status:
            </label>
            <EditorialSelect
              id="order-status-select"
              ariaLabel="Order Status"
              value={status}
              options={ORDER_STATUSES}
              onChange={(val) => void handleStatusChange(val as OrderStatus)}
              className="w-44"
              size="md"
              triggerClassName="rounded-full text-xs font-medium bg-[#FCF9F7] border-[#D9C8C0]"
            />
          </div>
        </div>

        {/* Contact Info + Copy Buttons & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-3.5 py-1.5">
              <span className="text-[#7A686E]">Email:</span>
              <span className="font-medium text-[#1F1619]">
                {order.email || "Not provided"}
              </span>
              {order.email && (
                <button
                  type="button"
                  onClick={() => void copyText("email", order.email)}
                  className="text-[#9E4765] hover:underline ml-1 cursor-pointer"
                >
                  {copiedKey === "email" ? (
                    <Check className="h-3.5 w-3.5 text-[#15803D]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-3.5 py-1.5">
              <span className="text-[#7A686E]">Phone:</span>
              <span className="font-medium text-[#1F1619]">
                {order.phoneE164 || "Not provided"}
              </span>
              {order.phoneE164 && (
                <button
                  type="button"
                  onClick={() => void copyText("phone", order.phoneE164)}
                  className="text-[#9E4765] hover:underline ml-1 cursor-pointer"
                >
                  {copiedKey === "phone" ? (
                    <Check className="h-3.5 w-3.5 text-[#15803D]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Primary Communication & Folder Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmailModal((prev) => !prev)}
            >
              <Mail className="h-3.5 w-3.5 text-[#9E4765]" />
              Send email
            </Button>

            <Button asChild size="sm">
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Open Drive Folder ({photos.length} Photos)
              </a>
            </Button>
          </div>
        </div>

        {/* Export & Download Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#F3ECE7]">
          <span className="text-xs font-medium text-[#7A686E] mr-1">
            Editorial Exports:
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportMarkdown}
          >
            <FileText className="h-3.5 w-3.5" />
            Export brief (.md)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
          >
            <FileJson className="h-3.5 w-3.5" />
            Export JSON (.json)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleCopyFullBrief()}
          >
            {copiedKey === "full-brief" ? (
              <Check className="h-3.5 w-3.5 text-[#15803D]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy brief to clipboard
          </Button>
          <Button asChild variant="editorial" size="sm">
            <a href={`/api/admin/orders/${order.id}/photos-zip`} download>
              <Download className="h-3.5 w-3.5" />
              Download all photos (.zip)
            </a>
          </Button>
        </div>

        {/* Inline Send Email Panel */}
        {showEmailModal && (
          <form
            onSubmit={(e) => void handleSendCustomEmail(e)}
            className="rounded-2xl border border-[#EAE0DA] bg-[#FCF9F7] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#1F1619]">
                Send Email to {order.customerName || order.email}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-xs text-[#7A686E] hover:text-[#1F1619]"
              >
                Close
              </button>
            </div>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject line"
              className="bg-white"
            />
            <Textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Write a message to the customer (or leave blank to re-send the order confirmation email)..."
              className="bg-white min-h-[90px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isSendingEmail}
              >
                {isSendingEmail
                  ? "Sending..."
                  : emailMessage.trim()
                    ? "Send Message"
                    : "Resend Confirmation Email"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Main Two-Column Editorial Brief Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Answers by Page & Group + Google Drive Folder Access Card */}
        <div className="lg:col-span-2 space-y-8">
          {FORM_PAGES.map((page) => {
            const SectionIcon = getSectionIcon(page.id);
            if (page.id === "photos") {
              return (
                <section
                  key={page.id}
                  id="photos"
                  className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-2xs space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3ECE7] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765]">
                        <SectionIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-serif italic text-sm text-[#9E4765]">
                          Page {page.pageNumber} &mdash;{" "}
                          {adaptCopyByGender(page.subtitle, selectedGender)}
                        </p>
                        <h2 className="font-serif text-2xl text-[#1F1619]">
                          Google Drive Photos ({photos.length} Uploaded)
                        </h2>
                      </div>
                    </div>
                    <Button asChild size="default">
                      <a
                        href={driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Open Order Folder in Google Drive
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>

                  {/* Direct Google Drive Folder Card (no heavy image grid rendering) */}
                  <div className="rounded-2xl border border-[#EAE0DA] bg-[#FCF9F7] p-5 space-y-3">
                    <p className="text-sm text-[#1F1619] leading-relaxed">
                      All <strong>{photos.length} original high-resolution photos</strong> for{" "}
                      <strong>{order.herName || "this order"}</strong> are stored in Google Drive under folder{" "}
                      <code className="rounded bg-white px-2 py-0.5 text-xs border border-[#EAE0DA]">
                        {order.herName || "Her"} - {order.reference}
                      </code>
                      . Open the Drive folder above to view and work with the full images directly.
                    </p>
                    {coverPhoto && (
                      <div className="flex items-center gap-2 text-xs text-[#7A2E48] font-medium">
                        <Star className="h-3.5 w-3.5 fill-current text-[#9E4765]" />
                        <span>
                          Selected Cover Photo File:{" "}
                          <strong>{coverPhoto.originalName}</strong>
                          {coverPhoto.caption ? ` — "${coverPhoto.caption}"` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {Boolean(values["photo_link_fallback"]) && (
                    <div className="rounded-xl border border-[#EAE0DA] bg-[#FCF9F7] p-3.5 text-xs">
                      <strong className="text-[#1F1619]">
                        Customer Shared Photo Link Fallback:
                      </strong>{" "}
                      <a
                        href={String(values["photo_link_fallback"])}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9E4765] underline break-all"
                      >
                        {String(values["photo_link_fallback"])}
                      </a>
                    </div>
                  )}

                  {/* Clean Text Manifest of Filenames & Captions (No images rendered) */}
                  {photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-[#7A686E]">
                          Photo Filenames &amp; Customer Captions ({photos.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              "photo-captions",
                              photos
                                .map(
                                  (p, idx) =>
                                    `${idx + 1}. ${p.originalName}${
                                      p.isCover ? " [COVER]" : ""
                                    } — ${p.caption || "(no caption)"}`
                                )
                                .join("\n")
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-[#FCF9F7] px-2.5 py-1 text-[11px] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] cursor-pointer"
                        >
                          {copiedKey === "photo-captions" ? (
                            <>
                              <Check className="h-3 w-3 text-[#15803D]" />
                              Copied List
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Captions List
                            </>
                          )}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7]/60 divide-y divide-[#F3ECE7] max-h-72 overflow-y-auto">
                        {photos.map((photo, idx) => (
                          <div
                            key={photo.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[11px] text-[#96838A]">
                                {String(idx + 1).padStart(2, "0")}.
                              </span>
                              <span className="font-medium text-[#1F1619] truncate">
                                {photo.originalName}
                              </span>
                              {photo.isCover && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#9E4765] px-2 py-0.5 text-[10px] font-medium text-white shrink-0">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  Cover
                                </span>
                              )}
                            </div>
                            <span className="text-[#5C4950] truncate max-w-[50%]">
                              {photo.caption || (
                                <span className="italic text-[#B5A3A9]">
                                  No caption
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            }

            return (
              <section
                key={page.id}
                className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-2xs space-y-6"
              >
                <div className="flex items-center gap-3 border-b border-[#F3ECE7] pb-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765]">
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-serif italic text-sm text-[#9E4765]">
                      Page {page.pageNumber} &mdash;{" "}
                      {adaptCopyByGender(page.subtitle, selectedGender)}
                    </p>
                    <h2 className="font-serif text-2xl text-[#1F1619]">
                      {adaptCopyByGender(page.title, selectedGender)}
                    </h2>
                  </div>
                </div>

                <div className="space-y-6">
                  {page.groups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-[#F3ECE7] bg-[#FCF9F7]/70 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#EFE6E0] pb-2.5">
                        <h3 className="font-serif text-lg text-[#1F1619]">
                          {adaptCopyByGender(group.title, selectedGender)}
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              `group-${group.id}`,
                              formatGroupAsText(group, values, selectedGender)
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-2.5 py-1 text-[11px] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
                        >
                          {copiedKey === `group-${group.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-[#15803D]" />
                              Copied Section
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Section
                            </>
                          )}
                        </button>
                      </div>

                      <dl className="space-y-3.5">
                        {group.fields.map((field) => {
                          if (field.conditional) {
                            if (
                              values[field.conditional.fieldKey] !==
                              field.conditional.equals
                            ) {
                              return null;
                            }
                          }

                          const raw = values[field.key];
                          const adaptedLabel = adaptCopyByGender(
                            field.label,
                            selectedGender
                          );

                          if (field.type === "repeatableRows") {
                            const rows = Array.isArray(raw)
                              ? (raw as Record<string, string>[])
                              : [];
                            const filled = rows.filter((r) =>
                              field.subFields.some(
                                (sf) => (r[sf.key] ?? "").trim().length > 0
                              )
                            );

                            return (
                              <div key={field.key} className="space-y-1.5">
                                <dt className="text-xs font-medium text-[#7A686E]">
                                  {adaptedLabel}
                                </dt>
                                <dd>
                                  {filled.length === 0 ? (
                                    <span className="text-xs italic text-[#A39197]">
                                      Not provided
                                    </span>
                                  ) : (
                                    <ol className="list-decimal list-inside space-y-1.5 rounded-xl bg-white p-3.5 border border-[#EFE6E0] text-sm text-[#1F1619]">
                                      {filled.map((row, idx) => {
                                        const parts = field.subFields
                                          .map((sf) => (row[sf.key] ?? "").trim())
                                          .filter(Boolean);
                                        return (
                                          <li key={idx} className="leading-relaxed">
                                            {parts.join(" — ")}
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  )}
                                </dd>
                              </div>
                            );
                          }

                          const strVal =
                            raw !== undefined &&
                            raw !== null &&
                            String(raw).trim() !== ""
                              ? String(raw).trim()
                              : "";

                          return (
                            <div key={field.key} className="space-y-0.5">
                              <dt className="text-xs font-medium text-[#7A686E]">
                                {adaptedLabel}
                              </dt>
                              <dd className="text-sm text-[#1F1619] whitespace-pre-wrap leading-relaxed">
                                {strVal || (
                                  <span className="text-xs italic text-[#A39197]">
                                    Not provided
                                  </span>
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right Column: Private Notes Thread, Status History & Message Log */}
        <div className="space-y-6">
          {/* Private Editorial Notes Thread */}
          <section className="rounded-3xl border border-[#EFE6E0] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="font-serif text-xl text-[#1F1619] border-b border-[#F3ECE7] pb-2.5">
              Private Editorial Notes
            </h2>

            <form
              onSubmit={(e) => void handleAddNote(e)}
              className="space-y-2.5"
            >
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a private note for the layout or design team..."
                className="min-h-[84px]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSavingNote || !noteInput.trim()}
                className="w-full"
              >
                {isSavingNote ? "Saving Note..." : "Add Private Note"}
              </Button>
            </form>

            <div className="space-y-3 pt-2">
              {initialNotes.length === 0 ? (
                <p className="text-xs italic text-[#96838A]">
                  No private notes yet.
                </p>
              ) : (
                initialNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#7A686E]">
                      <span className="font-medium text-[#9E4765]">
                        {note.adminEmail}
                      </span>
                      <span>
                        {new Date(note.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[#1F1619] whitespace-pre-wrap leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Status History */}
          <section className="rounded-3xl border border-[#EFE6E0] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="font-serif text-xl text-[#1F1619] border-b border-[#F3ECE7] pb-2.5">
              Status Workflow Log
            </h2>
            {statusHistory.length === 0 ? (
              <p className="text-xs italic text-[#96838A]">
                No status transitions recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {statusHistory.map((sh) => (
                  <div
                    key={sh.id}
                    className="rounded-xl border border-[#F3ECE7] bg-[#FCF9F7] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#1F1619]">
                        {sh.fromStatus ? `${sh.fromStatus} -> ` : ""}
                        {sh.toStatus}
                      </span>
                      <span className="text-[10px] text-[#8C7A80]">
                        {new Date(sh.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A686E]">
                      By {sh.adminEmail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Message Log */}
          <section className="rounded-3xl border border-[#EFE6E0] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="font-serif text-xl text-[#1F1619] border-b border-[#F3ECE7] pb-2.5">
              Message Log ({messageLogs.length})
            </h2>
            {messageLogs.length === 0 ? (
              <p className="text-xs italic text-[#96838A]">
                No outbound emails or WhatsApp messages logged for this order yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {messageLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#F3ECE7] bg-[#FCF9F7] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="rounded-full uppercase text-[10px]">
                        {log.channel}
                      </Badge>
                      <span className="text-[10px] text-[#8C7A80]">
                        {new Date(log.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="font-medium text-[#1F1619]">
                      Template: {log.template}
                    </p>
                    <p className="text-[11px] text-[#5C4950]">
                      Status: <strong>{log.status}</strong>
                    </p>
                    {log.error && (
                      <p className="text-[11px] text-[#B91C1C] break-all">
                        Error: {log.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
