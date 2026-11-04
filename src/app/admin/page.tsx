import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, asc, sql } from "drizzle-orm";
import { getAuthenticatedAdminEmail, isSuperAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders, photos, orderStatusEnum, type OrderStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Camera,
  ArrowUpRight,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  AdminOpenBriefButton,
  AdminOrderRefLink,
  AdminConfigureServicesButton,
  AdminOrdersFilterBar,
  AdminResetFiltersButton,
  AdminPaginationNav,
} from "@/components/admin/admin-nav-actions";
import { BoboStudioTag } from "@/components/brand/bobo-studio-tag";

const PAGE_SIZE = 10;

interface AdminOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    theme?: string;
    sort?: string;
    page?: string;
  }>;
}

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }
> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  awaiting_photos: { label: "Awaiting Photos", variant: "warning" },
  in_design: { label: "In Design", variant: "secondary" },
  ready: { label: "Ready for Delivery", variant: "success" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (!adminEmail) {
    redirect("/admin/login");
  }
  const isSuperAdmin = isSuperAdminEmail(adminEmail);

  await ensureDbReady();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "").trim();
  const themeFilter = (params.theme ?? "").trim().toLowerCase();
  const sortOrder = params.sort === "oldest" ? "oldest" : "newest";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const hasActiveFilters = Boolean(query || statusFilter || themeFilter);

  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(
      sortOrder === "oldest"
        ? asc(orders.updatedAt)
        : desc(orders.updatedAt)
    );

  // Fetch photo counts grouped by orderId
  const photoCountsRaw = await db
    .select({
      orderId: photos.orderId,
      count: sql<number>`count(*)::int`,
    })
    .from(photos)
    .groupBy(photos.orderId);

  const photoCountMap = new Map<string, number>();
  for (const row of photoCountsRaw) {
    photoCountMap.set(row.orderId, row.count);
  }

  const filtered = allOrders.filter((o) => {
    // Exclude blank phantom drafts with no customer details or photos
    const photoCount = photoCountMap.get(o.id) || 0;
    const isPhantomDraft =
      o.status === "draft" &&
      !o.customerName?.trim() &&
      !o.herName?.trim() &&
      !o.email?.trim() &&
      photoCount === 0;
    if (isPhantomDraft) return false;

    if (statusFilter && o.status !== statusFilter) return false;
    if (
      themeFilter &&
      !(o.colourTheme ?? "").toLowerCase().includes(themeFilter)
    ) {
      return false;
    }
    if (query) {
      const hay = [
        o.reference,
        o.customerName,
        o.herName,
        o.herNickname,
        o.email,
        o.phoneE164,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedOrders = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BoboStudioTag variant="flower" className="h-4 w-4 shrink-0" />
            <p className="font-serif italic text-base text-[#9E4765]">
              Editorial Queue
            </p>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
            Magazine Orders ({totalCount})
          </h1>
        </div>

        {isSuperAdmin && <AdminConfigureServicesButton />}
      </div>

      {/* Search & Filter Bar */}
      <AdminOrdersFilterBar
        initialQuery={params.q ?? ""}
        initialStatus={statusFilter}
        initialTheme={params.theme ?? ""}
        initialSort={sortOrder}
        statusOptions={[
          { value: "", label: "All Statuses" },
          ...orderStatusEnum.enumValues.map((s) => ({
            value: s,
            label: STATUS_BADGE_MAP[s].label,
          })),
        ]}
      />

      {/* Orders Table */}
      <div className="rounded-3xl border border-[#EFE6E0] bg-white overflow-hidden shadow-[0_8px_30px_-12px_rgba(31,22,25,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EFE6E0] bg-[#FCF9F7] text-[11px] uppercase tracking-wider text-[#7A686E]">
                <th className="py-3.5 px-5 font-medium">Reference</th>
                <th className="py-3.5 px-5 font-medium">Featured Star</th>
                <th className="py-3.5 px-5 font-medium">Ordered By</th>
                <th className="py-3.5 px-5 font-medium">Colour Theme</th>
                <th className="py-3.5 px-5 font-medium">Photos</th>
                <th className="py-3.5 px-5 font-medium">Status</th>
                <th className="py-3.5 px-5 font-medium">Last Updated</th>
                <th className="py-3.5 px-5 text-right font-medium">Brief</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE7] text-sm">
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765] shadow-2xs">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9E4765]">
                          {hasActiveFilters ? "Filtered View" : "Editorial Archive"}
                        </p>
                        <h2 className="font-serif text-2xl text-[#1F1619]">
                          {hasActiveFilters
                            ? "No matching magazine issues"
                            : "Your Editorial Desk is ready"}
                        </h2>
                        <p className="text-xs text-[#7A686E] leading-relaxed">
                          {hasActiveFilters
                            ? "No orders matched your current search or filter selection. Reset your filters below to view the full editorial queue."
                            : "No customer magazine briefs have been started or submitted yet. As soon as a customer begins filling in their questionnaire, their issue, uploaded photographs, and status workflow will appear here automatically."}
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        {hasActiveFilters ? (
                          <AdminResetFiltersButton />
                        ) : (
                          <Button asChild variant="outline" size="sm">
                            <Link href="/" target="_blank">
                              Open Customer Questionnaire
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const photoCount = photoCountMap.get(order.id) ?? 0;
                  const statusMeta = STATUS_BADGE_MAP[order.status];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FCF9F7]/80 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <AdminOrderRefLink
                          orderId={order.id}
                          reference={order.reference}
                        />
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-serif text-base font-medium text-[#1F1619]">
                          {order.herName || (
                            <span className="italic text-[#A39197]">
                              Untitled Star
                            </span>
                          )}
                        </div>
                        {order.ageTurning && (
                          <div className="text-xs text-[#7A686E]">
                            Turning {order.ageTurning}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm text-[#1F1619]">
                          {order.customerName || "—"}
                        </div>
                        <div className="text-xs text-[#7A686E]">
                          {order.email || order.relationship || ""}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-xs text-[#4A3A40]">
                        {order.colourTheme || "—"}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#4A3A40]">
                            <Camera className="h-3.5 w-3.5 text-[#9E4765]" />
                            {photoCount}
                          </span>
                          {(order.driveFolderUrl || order.driveFolderId) && (
                            <a
                              href={
                                order.driveFolderUrl ||
                                `https://drive.google.com/drive/folders/${order.driveFolderId}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              title="Open order photo folder in Google Drive"
                              className="inline-flex items-center gap-1 rounded-full border border-[#EAD4DF] bg-[#FDF8FA] px-2 py-0.5 text-[10px] font-medium text-[#9E4765] hover:bg-[#F6EBF0] transition-colors"
                            >
                              Drive
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <Badge
                          variant={statusMeta.variant}
                          className="rounded-full"
                        >
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-xs text-[#4A3A40]">
                        <div className="font-medium text-[#1F1619]">
                          {new Date(order.updatedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-[#8C7A80]">
                          {new Date(order.updatedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <AdminOpenBriefButton orderId={order.id} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Elegant Editorial Pagination Bar (10 per page) */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#EFE6E0] bg-[#FCF9F7] px-6 py-4">
            <p className="text-xs text-[#6E5A61]">
              Showing{" "}
              <strong className="font-medium text-[#1F1619]">
                {startIndex + 1}&ndash;
                {Math.min(startIndex + PAGE_SIZE, totalCount)}
              </strong>{" "}
              of{" "}
              <strong className="font-medium text-[#1F1619]">
                {totalCount}
              </strong>{" "}
              {totalCount === 1 ? "magazine issue" : "magazine issues"} (10 per
              page)
            </p>

            <AdminPaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              baseParams={params}
            />
          </div>
        )}
      </div>

      <div className="pt-6 pb-2">
        <BoboStudioTag variant="seal" />
      </div>
    </div>
  );
}
