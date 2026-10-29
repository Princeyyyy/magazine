import React from "react";
import type { Metadata } from "next";
import { EditorialStatePage } from "@/components/editorial-state-page";
import { NotFoundActions } from "@/components/not-found-actions";

export const metadata: Metadata = {
  title: "Page Not Found — Custom Magazine",
};

export default function NotFound() {
  return (
    <EditorialStatePage
      folio="404"
      eyebrow="Lost Chapter"
      title="This page seems to be missing from the issue."
      description="The link you followed may be incomplete, moved, or no longer available. Your saved answers, memories, and photos are completely safe."
      actions={
        <NotFoundActions
          primaryHref="/"
          primaryLabel="Return to Magazine Brief"
          autoRedirectSeconds={12}
        />
      }
      footnote="If you were sent a private resume link, check your email to ensure the full link was opened."
    />
  );
}
