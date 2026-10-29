import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, asc, sql } from "drizzle-orm";
import { getAuthenticatedAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders, photos, orderStatusEnum, type OrderStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorialSelect } from "@/components/ui/editorial-select";
import { Camera, ArrowUpRight, Search } from "lucide-react";

interface AdminOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    theme?: string;
    sort?: string;
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
  ready: { label: "Ready", variant: "success" },
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

  await ensureDbReady();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "").trim();
  const themeFilter = (params.theme ?? "").trim().toLowerCase();
  const sortOrder = params.sort === "oldest" ? "oldest" : "newest";

  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(
      sortOrder === "oldest" ? asc(orders.createdAt) : desc(orders.createdAt)
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-serif italic text-base text-[#9E4765]">
            Editorial Queue
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
            Magazine Orders ({filtered.length})
          </h1>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings">Configure Services &amp; Dev Outbox</Link>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <form
        method="GET"
        action="/admin"
        className="rounded-2xl border border-[#EFE6E0] bg-white p-4 sm:p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center"
      >
        <div className="relative sm:col-span-2 lg:col-span-4 min-w-0">
          <Search className="h-4 w-4 text-[#A39197] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by name, email, or reference..."
            className="pl-10 h-10 w-full"
          />
        </div>

        <EditorialSelect
          name="status"
          defaultValue={statusFilter}
          ariaLabel="Filter by status"
          className="w-full min-w-0 lg:col-span-2"
          size="md"
          triggerClassName="text-xs"
          options={[
            { value: "", label: "All Statuses" },
            ...orderStatusEnum.enumValues.map((s) => ({
              value: s,
              label: STATUS_BADGE_MAP[s].label,
            })),
          ]}
        />

        <EditorialSelect
          name="theme"
          defaultValue={params.theme ?? ""}
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
          defaultValue={sortOrder}
          ariaLabel="Sort by date"
          className="w-full min-w-0 lg:col-span-2"
          size="md"
          triggerClassName="text-xs"
          options={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
          ]}
        />

        <Button
          type="submit"
          size="sm"
          className="h-10 w-full lg:col-span-1"
        >
          Filter
        </Button>
      </form>

      {/* Orders Table */}
      <div className="rounded-3xl border border-[#EFE6E0] bg-white overflow-hidden shadow-[0_8px_30px_-12px_rgba(31,22,25,0.05)]">
        {filtered.length === 0 ? (
          <div className="p-14 text-center space-y-2">
            <p className="font-serif text-xl text-[#1F1619]">
              No matching magazine orders found
            </p>
            <p className="text-xs text-[#7A686E]">
              Try clearing your filters or run <code className="font-mono bg-[#FAF3F0] px-1.5 py-0.5">npm run db:seed</code> to populate sample issues.
            </p>
          </div>
        ) : (
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
                  <th className="py-3.5 px-5 font-medium">Created</th>
                  <th className="py-3.5 px-5 text-right font-medium">Brief</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE7] text-sm">
                {filtered.map((order) => {
                  const photoCount = photoCountMap.get(order.id) ?? 0;
                  const statusMeta = STATUS_BADGE_MAP[order.status];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FCF9F7]/80 transition-colors"
                    >
                      <td className="py-4 px-5 font-mono text-xs font-medium text-[#1F1619]">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-[#9E4765] underline-offset-4 hover:underline"
                        >
                          {order.reference}
                        </Link>
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
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#4A3A40]">
                          <Camera className="h-3.5 w-3.5 text-[#9E4765]" />
                          {photoCount}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge
                          variant={statusMeta.variant}
                          className="rounded-full"
                        >
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-xs text-[#7A686E]">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/orders/${order.id}`}>
                            Open Brief
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
