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
  generateOrderWordBlob,
  generateOrderPdfBlob,
} from "@/lib/editorial-exports";
import {
  Copy,
  Check,
  Mail,
  FolderOpen,
  Download,
  FileText,
  FileDown,
  Star,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
  driveFolderUrl?: string;
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
  statusHistory: AdminStatusHistoryItem[];
  driveFolderUrl: string;
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

interface ToastState {
  type: "loading" | "success" | "error";
  title: string;
  subtitle?: string;
}

export function AdminOrderDetailClient({
  order,
  values,
  photos,
  statusHistory,
  driveFolderUrl,
}: AdminOrderDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeExport, setActiveExport] = useState<
    "zip" | "word" | "pdf" | null
  >(null);

  const selectedGender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  // Send Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState(
    `Update on ${order.herName || "your"} custom magazine (${order.reference})`
  );
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const notifyAdmin = (
    type: "loading" | "success" | "error",
    title: string,
    subtitle?: string,
    autoHideMs = 3800
  ) => {
    setToast({ type, title, subtitle });
    if (type !== "loading" && autoHideMs > 0) {
      setTimeout(() => {
        setToast((prev) => (prev?.title === title ? null : prev));
      }, autoHideMs);
    }
  };

  const copyText = async (key: string, text: string, label?: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    if (label) {
      notifyAdmin("success", `${label} copied to clipboard`);
    }
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    setStatus(nextStatus);
    notifyAdmin(
      "loading",
      "Updating order status...",
      `Changing status to "${nextStatus.replace(/_/g, " ")}"`
    );
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", status: nextStatus }),
    });
    if (res.ok) {
      notifyAdmin(
        "success",
        `Status updated to "${nextStatus.replace(/_/g, " ")}"`,
        `Recorded in workflow history for ${order.reference}`
      );
      router.refresh();
    } else {
      notifyAdmin("error", "Failed to update order status");
    }
  };

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    notifyAdmin(
      "loading",
      "Sending email to customer...",
      `Recipient: ${order.email}`
    );
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
        notifyAdmin(
          "success",
          "Email delivered to customer",
          `Sent to ${order.email}`
        );
        setShowEmailModal(false);
        setEmailMessage("");
        router.refresh();
      } else {
        notifyAdmin("error", "Could not send email", "Please check your mailer settings.");
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExportWord = async () => {
    if (activeExport) return;
    setActiveExport("word");
    notifyAdmin(
      "loading",
      "Formatting Word (.docx) Brief...",
      `Typesetting all 9 chapters & photo manifest for ${order.herName || order.reference}`
    );
    try {
      const blob = await generateOrderWordBlob(
        order,
        values,
        photos,
        driveFolderUrl
      );
      const safeName = (order.herName || "Magazine")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${order.reference}-${safeName}-Editorial-Brief.docx`;
      triggerBlobDownload(blob, filename);
      notifyAdmin(
        "success",
        "Word (.docx) Brief Exported",
        `Downloaded ${filename}`
      );
    } catch (err) {
      notifyAdmin(
        "error",
        "Word Export Failed",
        err instanceof Error ? err.message : "Could not generate .docx file."
      );
    } finally {
      setActiveExport(null);
    }
  };

  const handleExportPdf = async () => {
    if (activeExport) return;
    setActiveExport("pdf");
    notifyAdmin(
      "loading",
      "Designing Editorial PDF...",
      `Rendering multi-page A4 editorial brief for ${order.herName || order.reference}`
    );
    try {
      // Allow UI toast to paint before synchronous PDF layout
      await new Promise((r) => setTimeout(r, 80));
      const blob = generateOrderPdfBlob(
        order,
        values,
        photos,
        driveFolderUrl
      );
      const safeName = (order.herName || "Magazine")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${order.reference}-${safeName}-Editorial-Brief.pdf`;
      triggerBlobDownload(blob, filename);
      notifyAdmin(
        "success",
        "Editorial PDF Exported",
        `Downloaded ${filename}`
      );
    } catch (err) {
      notifyAdmin(
        "error",
        "PDF Export Failed",
        err instanceof Error ? err.message : "Could not generate .pdf file."
      );
    } finally {
      setActiveExport(null);
    }
  };

  const handleDownloadPhotosZip = async () => {
    if (activeExport) return;
    setActiveExport("zip");
    notifyAdmin(
      "loading",
      `Packaging ${photos.length} Photos into ZIP...`,
      "Fetching original high-resolution photos from storage — please wait"
    );
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/photos-zip`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      notifyAdmin(
        "loading",
        "Downloading ZIP Archive...",
        `Streaming ${photos.length} photos for ${order.reference}`
      );
      const blob = await res.blob();
      const safeName = (order.herName || "Magazine")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${order.reference}-${safeName}-Photos.zip`;
      triggerBlobDownload(blob, filename);
      notifyAdmin(
        "success",
        "All Photos Downloaded (.zip)",
        `${photos.length} photos packaged in ${filename}`
      );
    } catch (err) {
      notifyAdmin(
        "error",
        "ZIP Download Failed",
        err instanceof Error ? err.message : "Could not download photos archive."
      );
    } finally {
      setActiveExport(null);
    }
  };

  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];

  return (
    <div className="space-y-8">
      {/* Elegant Floating Progress / Action Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-[#EAD4DF] bg-[#1F1619]/95 backdrop-blur-md px-5 py-4 text-white shadow-[0_16px_40px_-12px_rgba(31,22,25,0.35)] flex items-start gap-3.5 animate-editorial-in"
        >
          {toast.type === "loading" ? (
            <Loader2 className="h-5 w-5 text-[#E8A6BE] animate-spin shrink-0 mt-0.5" />
          ) : toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-[#4ADE80] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-[#F87171] shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 text-left">
            <p className="font-serif text-sm font-medium tracking-wide text-white">
              {toast.title}
            </p>
            {toast.subtitle && (
              <p className="text-[11px] text-[#D9C8C0] leading-relaxed">
                {toast.subtitle}
              </p>
            )}
          </div>
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

        {/* Contact Info + Copy Buttons & Primary Action Bar */}
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
                  onClick={() =>
                    void copyText("email", order.email, "Customer email")
                  }
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
                  onClick={() =>
                    void copyText("phone", order.phoneE164, "Phone number")
                  }
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

        {/* Streamlined Editorial Exports Toolbar (ZIP, Word, PDF only) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#F3ECE7]">
          <span className="text-xs font-medium text-[#7A686E] mr-1">
            Editorial Exports:
          </span>

          <Button
            type="button"
            variant="editorial"
            size="sm"
            disabled={activeExport !== null}
            onClick={() => void handleDownloadPhotosZip()}
          >
            {activeExport === "zip" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {activeExport === "zip"
              ? "Packaging Photos (.zip)..."
              : `Download all images (.zip)`}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeExport !== null}
            onClick={() => void handleExportWord()}
          >
            {activeExport === "word" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-[#9E4765]" />
            )}
            {activeExport === "word"
              ? "Building Word (.docx)..."
              : "Export to Word (.docx)"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeExport !== null}
            onClick={() => void handleExportPdf()}
          >
            {activeExport === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-[#9E4765]" />
            )}
            {activeExport === "pdf"
              ? "Building PDF (.pdf)..."
              : "Export to PDF (.pdf)"}
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
              <Button type="submit" size="sm" disabled={isSendingEmail}>
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

                  {/* Direct Google Drive Folder Reference Card */}
                  <div className="rounded-2xl border border-[#EAE0DA] bg-[#FCF9F7] p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#7A686E]">
                        Order Drive Link
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "drive-url",
                            driveFolderUrl,
                            "Google Drive folder link"
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-2.5 py-1 text-[11px] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] cursor-pointer"
                      >
                        {copiedKey === "drive-url" ? (
                          <>
                            <Check className="h-3 w-3 text-[#15803D]" />
                            Copied Link
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Drive Link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-[#9E4765] break-all bg-white p-3 rounded-xl border border-[#EFE6E0]">
                      {driveFolderUrl}
                    </p>
                    {coverPhoto && (
                      <div className="flex items-center gap-2 text-xs text-[#7A2E48] font-medium pt-1">
                        <Star className="h-3.5 w-3.5 fill-current text-[#9E4765]" />
                        <span>
                          Selected Cover Photo:{" "}
                          <strong>{coverPhoto.originalName}</strong>
                          {coverPhoto.caption
                            ? ` — "${coverPhoto.caption}"`
                            : ""}
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

                  {/* Clean Text Manifest of Filenames & Captions */}
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
                                .join("\n"),
                              "Photo captions list"
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
                          {adaptCopyByGender(group.title, genderLabel(selectedGender))}
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              `group-${group.id}`,
                              formatGroupAsText(group, values, selectedGender),
                              adaptCopyByGender(group.title, selectedGender)
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-2.5 py-1 text-[11px] text-[#5C4950] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
                        >
                          {copiedKey === `group-${group.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-[#15803D]" />
                              Copied
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
                          if (field.type === "photoUpload") return null;
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

        {/* Right Column: Order Summary & Status Workflow Log */}
        <div className="space-y-6">
          {/* Quick Export & Drive Card */}
          <section className="rounded-3xl border border-[#EFE6E0] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="font-serif text-xl text-[#1F1619] border-b border-[#F3ECE7] pb-2.5">
              Order Files &amp; Exports
            </h2>
            <p className="text-xs text-[#6E5A61] leading-relaxed">
              Download the formatted editorial brief in Word or PDF for layout design, or download all original uploaded photographs in a single ZIP archive.
            </p>
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="editorial"
                size="sm"
                className="w-full justify-start"
                disabled={activeExport !== null}
                onClick={() => void handleDownloadPhotosZip()}
              >
                {activeExport === "zip" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download All Images (.zip)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                disabled={activeExport !== null}
                onClick={() => void handleExportWord()}
              >
                {activeExport === "word" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-[#9E4765]" />
                )}
                Export Brief to Word (.docx)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                disabled={activeExport !== null}
                onClick={() => void handleExportPdf()}
              >
                {activeExport === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 text-[#9E4765]" />
                )}
                Export Brief to PDF (.pdf)
              </Button>
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
        </div>
      </div>
    </div>
  );
}

function genderLabel(gender: string): string {
  return gender;
}
