"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorialSelect } from "@/components/ui/editorial-select";
import { ArrowUpRight, Loader2, RotateCcw, Search } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      method="GET"
      action="/admin"
      onSubmit={() => setIsSubmitting(true)}
      className="rounded-2xl border border-[#EFE6E0] bg-white p-4 sm:p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center"
    >
      <div className="relative sm:col-span-2 lg:col-span-4 min-w-0">
        <Search className="h-4 w-4 text-[#A39197] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          name="q"
          defaultValue={initialQuery}
          placeholder="Search by name, email, or reference..."
          className="pl-10 h-10 w-full"
        />
      </div>

      <EditorialSelect
        name="status"
        defaultValue={initialStatus}
        ariaLabel="Filter by status"
        className="w-full min-w-0 lg:col-span-2"
        size="md"
        triggerClassName="text-xs"
        options={statusOptions}
      />

      <EditorialSelect
        name="theme"
        defaultValue={initialTheme}
        ariaLabel="Filter by colour theme"
        className="w-full min-w-0 lg:col-span-3"
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
        defaultValue={initialSort}
        ariaLabel="Sort by last updated"
        className="w-full min-w-0 lg:col-span-2"
        size="md"
        triggerClassName="text-xs"
        options={[
          { value: "newest", label: "Latest Updated" },
          { value: "oldest", label: "Oldest Updated" },
        ]}
      />

      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="h-10 w-full lg:col-span-1 min-w-[80px]"
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
  if (baseParams.q) sp.set("q", baseParams.q);
  if (baseParams.status) sp.set("status", baseParams.status);
  if (baseParams.theme) sp.set("theme", baseParams.theme);
  if (baseParams.sort && baseParams.sort !== "oldest") {
    // default is newest
  } else if (baseParams.sort) {
    sp.set("sort", baseParams.sort);
  }
  if (targetPage > 1) {
    sp.set("page", String(targetPage));
  }
  const qs = sp.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

/**
 * Pagination Navigation bar with instant feedback on link clicks.
 * Strictly uses plain serializable props (numbers, plain baseParams object).
 */
export function AdminPaginationNav({
  currentPage,
  totalPages,
  baseParams,
}: AdminPaginationNavProps) {
  const router = useRouter();
  const [navigatingPage, setNavigatingPage] = useState<number | null>(null);

  const handleNavigate = (page: number) => {
    setNavigatingPage(page);
    router.push(buildPaginationUrl(baseParams, page));
  };

  return (
    <nav aria-label="Orders pagination" className="flex items-center gap-1.5">
      {currentPage > 1 ? (
        <button
          type="button"
          disabled={navigatingPage !== null}
          onClick={() => handleNavigate(currentPage - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-3 text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer disabled:opacity-60"
        >
          {navigatingPage === currentPage - 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
          ) : (
            <span className="text-xs">&larr;</span>
          )}
          <span>Previous</span>
        </button>
      ) : (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[#F2EAE4] bg-[#FAF6F3] px-3 text-xs text-[#C2B2B8] cursor-not-allowed">
          <span className="text-xs">&larr;</span>
          <span>Previous</span>
        </span>
      )}

      <div className="flex items-center gap-1 px-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
          const isActive = pNum === currentPage;
          const isLoading = navigatingPage === pNum;

          return (
            <button
              key={pNum}
              type="button"
              disabled={isActive || navigatingPage !== null}
              onClick={() => handleNavigate(pNum)}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#9E4765] text-xs font-semibold text-white shadow-2xs"
                  : "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0DA] bg-white text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer disabled:opacity-60"
              }
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
              ) : (
                pNum
              )}
            </button>
          );
        })}
      </div>

      {currentPage < totalPages ? (
        <button
          type="button"
          disabled={navigatingPage !== null}
          onClick={() => handleNavigate(currentPage + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[#EAE0DA] bg-white px-3 text-xs font-medium text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765] transition-colors cursor-pointer disabled:opacity-60"
        >
          <span>Next</span>
          {navigatingPage === currentPage + 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#9E4765]" />
          ) : (
            <span className="text-xs">&rarr;</span>
          )}
        </button>
      ) : (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[#F2EAE4] bg-[#FAF6F3] px-3 text-xs text-[#C2B2B8] cursor-not-allowed">
          <span>Next</span>
          <span className="text-xs">&rarr;</span>
        </span>
      )}
    </nav>
  );
}
