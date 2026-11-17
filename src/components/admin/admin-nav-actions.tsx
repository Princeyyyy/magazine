"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorialSelect } from "@/components/ui/editorial-select";
import {
  ArrowUpRight,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";

/**
 * Open Brief button in the admin orders table.
 * Immediately displays an animated spinner and "Opening..." loading state
 * upon click to eliminate perceived lag when navigating to heavy order briefs.
 */
export function AdminOpenBriefButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push(`/admin/orders/${orderId}`);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleClick}
      className="cursor-pointer min-w-[105px] transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E4765]" />
          <span>Opening...</span>
        </>
      ) : (
        <>
          <span>Open Brief</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </>
      )}
    </Button>
  );
}

/**
 * Order reference link in the admin orders table.
 * Shows an inline spinner upon click so clicking the reference number gives immediate feedback.
 */
export function AdminOrderRefLink({
  orderId,
  reference,
}: {
  orderId: string;
  reference: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    router.push(`/admin/orders/${orderId}`);
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#1F1619] hover:text-[#9E4765] underline-offset-4 hover:underline cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />}
      <span>{reference}</span>
    </button>
  );
}

/**
 * Configure Services button at the top of the admin page.
 * Displays an animated spinner and loading state upon click.
 */
export function AdminConfigureServicesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push("/admin/settings");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleClick}
      className="cursor-pointer min-w-[145px]"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E4765]" />
          <span>Loading...</span>
        </>
      ) : (
        <span>Configure Services</span>
      )}
    </Button>
  );
}

/**
 * Reset filters button with instant loading state upon click.
 */
export function AdminResetFiltersButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push("/admin");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleClick}
      className="cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E4765]" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      <span>{loading ? "Resetting..." : "Reset Filters"}</span>
    </Button>
  );
}

/**
 * Back to Orders Queue button in order detail page.
 * Shows an animated spinner upon click.
 */
export function AdminBackToQueueButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push("/admin");
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A686E] hover:text-[#9E4765] transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E4765]" />
      ) : (
        <span className="text-sm">&larr;</span>
      )}
      <span>{loading ? "Returning to queue..." : "Back to Orders Queue"}</span>
    </button>
  );
}

export interface AdminFilterOption {
  value: string;
  label: string;
}

interface AdminOrdersFilterBarProps {
  initialQuery?: string;
  initialStatus?: string;
  initialTheme?: string;
  initialSort?: string;
  statusOptions: AdminFilterOption[];
}

/**
 * Self-contained Client Component for the Admin Filter Bar.
 * Strictly uses plain serializable props (strings and option objects) to prevent RSC serialization errors.
 */
export function AdminOrdersFilterBar({
  initialQuery = "",
  initialStatus = "",
  initialTheme = "",
  initialSort = "newest",
  statusOptions,
}: AdminOrdersFilterBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [theme, setTheme] = useState(initialTheme);
  const [sort, setSort] = useState(initialSort);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
    setTheme(initialTheme);
    setSort(initialSort);
  }, [initialQuery, initialStatus, initialTheme, initialSort]);

  const hasSelection = Boolean(
    query.trim().length > 0 ||
    status !== "" ||
    theme !== "" ||
    (sort !== "" && sort !== "newest")
  );

  const hasActiveUrlFilters = Boolean(
    initialQuery.trim().length > 0 ||
    initialStatus !== "" ||
    initialTheme !== "" ||
    (initialSort !== "" && initialSort !== "newest")
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!hasSelection || isSubmitting || isResetting) {
      e.preventDefault();
      return;
    }
    setIsSubmitting(true);
  };

  const handleReset = () => {
    setIsResetting(true);
    setQuery("");
    setStatus("");
    setTheme("");
    setSort("newest");
    router.push("/admin");
  };

  return (
    <form
      method="GET"
      action="/admin"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#EFE6E0] bg-white p-4 sm:p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center"
    >
      <div className="relative sm:col-span-2 lg:col-span-4 min-w-0">
        <Search className="h-4 w-4 text-[#A39197] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or reference..."
          className="pl-10 h-10 w-full"
        />
      </div>

      <EditorialSelect
        name="status"
        value={status}
        onChange={(val) => setStatus(val)}
        ariaLabel="Filter by status"
        className="w-full min-w-0 lg:col-span-2"
        size="md"
        triggerClassName="text-xs"
        options={statusOptions}
      />

      <EditorialSelect
        name="theme"
        value={theme}
        onChange={(val) => setTheme(val)}
        ariaLabel="Filter by colour theme"
        className="w-full min-w-0 lg:col-span-2"
        size="md"
        triggerClassName="text-xs"
        options={[
          { value: "", label: "All Colour Themes" },
          { value: "pink", label: "Pink and girly" },
          { value: "black", label: "Black and white" },
          { value: "neutral", label: "Neutral and minimal" },
          { value: "bright", label: "Bright and colourful" },
          { value: "other", label: "Other" },
        ]}
      />

      <EditorialSelect
        name="sort"
        value={sort}
        onChange={(val) => setSort(val)}
        ariaLabel="Sort by last updated"
        className="w-full min-w-0 lg:col-span-2"
        size="md"
        triggerClassName="text-xs"
        options={[
          { value: "newest", label: "Latest Updated" },
          { value: "oldest", label: "Oldest Updated" },
        ]}
      />

      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2 w-full">
        <Button
          type="submit"
          size="sm"
          disabled={!hasSelection || isSubmitting || isResetting}
          title={
            hasSelection
              ? "Apply selected filters"
              : "Select at least one filter or search keyword to filter"
          }
          className="h-10 flex-1 min-w-[75px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Filtering...</span>
            </>
          ) : (
            <span>Filter</span>
          )}
        </Button>

        {(hasActiveUrlFilters || hasSelection) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isResetting || isSubmitting}
            onClick={handleReset}
            title="Reset all filters"
            className="h-10 px-3 text-[#8C7A80] hover:text-[#1F1619] cursor-pointer"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span className="sr-only sm:not-sr-only sm:inline-block">Reset</span>
          </Button>
        )}
      </div>
    </form>
  );
}

interface AdminPaginationNavProps {
  currentPage: number;
  totalPages: number;
  baseParams: {
    q?: string;
    status?: string;
    theme?: string;
    sort?: string;
  };
}

function buildPaginationUrl(
  baseParams: { q?: string; status?: string; theme?: string; sort?: string },
  targetPage: number
): string {
  const sp = new URLSearchParams();
  if (baseParams.q?.trim()) sp.set("q", baseParams.q.trim());
  if (baseParams.status) sp.set("status", baseParams.status);
  if (baseParams.theme) sp.set("theme", baseParams.theme);
  if (baseParams.sort && baseParams.sort === "oldest") {
    sp.set("sort", "oldest");
  }
  if (targetPage > 1) {
    sp.set("page", String(targetPage));
  }
  const qs = sp.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

function getPaginationRange(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

/**
 * Pagination Navigation bar with instant feedback on link clicks.
 * Strictly uses plain serializable props (numbers, plain baseParams object).
 * Uses Next.js Link for instant prefetching and SPA navigation back and forth.
 */
export function AdminPaginationNav({
  currentPage,
  totalPages,
  baseParams,
}: AdminPaginationNavProps) {
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  // Clear pending spinner whenever currentPage updates after navigation
  useEffect(() => {
    setPendingPage(null);
  }, [currentPage]);

  if (totalPages <= 1) {
    return (
      <nav aria-label="Orders pagination" className="flex items-center gap-1.5">
        <span
          aria-current="page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#9E4765] text-xs font-semibold text-white shadow-2xs select-none"
        >
          1
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="Orders pagination" className="flex items-center gap-1.5">
      {currentPage > 1 ? (
        <Link
          href={buildPaginationUrl(baseParams, currentPage - 1)}
          scroll={false}
          onClick={() => setPendingPage(currentPage - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-3 text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
        >
          {pendingPage === currentPage - 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
          ) : (
            <span className="text-xs">&larr;</span>
          )}
          <span>Previous</span>
        </Link>
      ) : (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[#F2EAE4] bg-[#FAF6F3] px-3 text-xs text-[#C2B2B8] cursor-not-allowed select-none">
          <span className="text-xs">&larr;</span>
          <span>Previous</span>
        </span>
      )}

      <div className="flex items-center gap-1 px-1">
        {getPaginationRange(currentPage, totalPages).map((item, idx) => {
          if (item === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex h-8 w-6 items-center justify-center text-xs text-[#A39197] select-none"
              >
                &hellip;
              </span>
            );
          }

          const pNum = item as number;
          const isActive = pNum === currentPage;
          const isLoading = pendingPage === pNum && !isActive;

          if (isActive) {
            return (
              <span
                key={pNum}
                aria-current="page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#9E4765] text-xs font-semibold text-white shadow-2xs select-none"
              >
                {pNum}
              </span>
            );
          }

          return (
            <Link
              key={pNum}
              href={buildPaginationUrl(baseParams, pNum)}
              scroll={false}
              onClick={() => setPendingPage(pNum)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0DA] bg-white text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
              ) : (
                pNum
              )}
            </Link>
          );
        })}
      </div>

      {currentPage < totalPages ? (
        <Link
          href={buildPaginationUrl(baseParams, currentPage + 1)}
          scroll={false}
          onClick={() => setPendingPage(currentPage + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-3 text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer"
        >
          <span>Next</span>
          {pendingPage === currentPage + 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
          ) : (
            <span className="text-xs">&rarr;</span>
          )}
        </Link>
      ) : (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[#F2EAE4] bg-[#FAF6F3] px-3 text-xs text-[#C2B2B8] cursor-not-allowed select-none">
          <span>Next</span>
          <span className="text-xs">&rarr;</span>
        </span>
      )}
    </nav>
  );
}

interface AdminDeleteOrderButtonProps {
  orderId: string;
  reference: string;
  starName?: string | null;
  customerName?: string | null;
  onDeleted?: () => void;
  variant?: "table" | "detail";
}

/**
 * Delete button with an editorial confirmation modal for magazine order entries.
 * Prompts the admin to confirm before permanently wiping database records,
 * Google Drive folders, and local photo files.
 */
export function AdminDeleteOrderButton({
  orderId,
  reference,
  starName,
  customerName,
  onDeleted,
  variant = "table",
}: AdminDeleteOrderButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleting]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete order entry.");
      }

      setIsOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete order entry."
      );
      setDeleting(false);
    }
  };

  return (
    <>
      {variant === "detail" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className="cursor-pointer text-[#8C7A80] hover:text-[#B3261E] hover:border-[#F3D1D7] hover:bg-[#FDF6F7] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-[#B3261E]" />
          <span>Delete Issue</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          title={`Delete issue ${reference}`}
          className="cursor-pointer text-[#8C7A80] hover:text-[#B3261E] hover:border-[#F3D1D7] hover:bg-[#FDF6F7] transition-colors px-2.5 sm:px-3"
        >
          <Trash2 className="h-3.5 w-3.5 text-[#B3261E]" />
          <span className="sr-only sm:not-sr-only sm:inline-block">Delete</span>
        </Button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-modal-title-${orderId}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setIsOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-left animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              disabled={deleting}
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 rounded-full p-1.5 text-[#8C7A80] hover:bg-[#F6EBF0] hover:text-[#1F1619] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header with warning icon */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FCDADF] bg-[#FDF2F4] text-[#B3261E]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 pr-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B3261E]">
                  Irreversible Action
                </p>
                <h2
                  id={`delete-modal-title-${orderId}`}
                  className="font-serif text-2xl font-bold text-[#1F1619]"
                >
                  Delete Magazine Issue?
                </h2>
              </div>
            </div>

            {/* Target Details Card */}
            <div className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-[#4A3A40]">
                <span className="text-[#8C7A80]">Order Reference:</span>
                <span className="font-mono font-bold text-[#1F1619]">
                  {reference}
                </span>
              </div>
              {starName && (
                <div className="flex justify-between items-center text-[#4A3A40]">
                  <span className="text-[#8C7A80]">Featured Star:</span>
                  <span className="font-medium text-[#1F1619]">{starName}</span>
                </div>
              )}
              {customerName && (
                <div className="flex justify-between items-center text-[#4A3A40]">
                  <span className="text-[#8C7A80]">Ordered By:</span>
                  <span className="text-[#1F1619]">{customerName}</span>
                </div>
              )}
            </div>

            {/* Detailed Explanation */}
            <div className="text-xs text-[#6E5A61] space-y-2 leading-relaxed">
              <p>
                Permanently deletes this entry and all related content from the system:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#4A3A40] pl-1">
                <li>All questionnaire answers and editorial responses</li>
                <li>All customer photos registered in the database</li>
                <li>The dedicated Google Drive folder and its stored files</li>
                <li>Audit trail logs and status history entries</li>
              </ul>
              <p className="font-medium text-[#B3261E] pt-1">
                This action cannot be undone.
              </p>
            </div>

            {/* Error Message if deletion failed */}
            {error && (
              <div className="rounded-xl border border-[#FCDADF] bg-[#FDF2F4] p-3 text-xs text-[#B3261E]">
                {error}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setIsOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
                className="cursor-pointer bg-[#B3261E] hover:bg-[#991B1B] text-white border-0 min-w-[130px]"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Issue</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
