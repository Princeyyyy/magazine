import React from "react";
import { EditorialStatePage } from "@/components/editorial-state-page";
import { NotFoundActions } from "@/components/not-found-actions";

export default function AdminNotFound() {
  return (
    <EditorialStatePage
      withHeader={false}
      folio="404"
      eyebrow="Editorial Archive"
      title="This brief isn't in the archive."
      description="The order or page you are looking for does not exist or has been removed. You can return to the orders queue to browse active magazine briefs."
      actions={
        <NotFoundActions
          primaryHref="/admin"
          primaryLabel="Back to Orders Queue"
          autoRedirectSeconds={10}
        />
      }
    />
  );
}
