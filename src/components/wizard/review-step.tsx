"use client";

import React from "react";
import {
  FORM_PAGES,
  adaptCopyByGender,
  type UploadedPhotoItem,
} from "@/config/form";
import { Button } from "@/components/ui/button";
import { getSectionIcon } from "@/components/icons/SectionIcons";
import { Star, Pencil, Image as ImageIcon } from "lucide-react";

interface ReviewStepProps {
  values: Record<string, unknown>;
  photos: UploadedPhotoItem[];
  onEditPage: (pageIndex: number) => void;
  onToggleConsent: (checked: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  gender?: string;
}

export function ReviewStep({
  values,
  photos,
  onEditPage,
  onToggleConsent,
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
  gender = "Female",
}: ReviewStepProps) {
  const [localConsentError, setLocalConsentError] = React.useState(false);
  const isConsented = values.permission_consent === true;
  return (
    <div className="space-y-8">
      <div className="border-b border-[#E3D4CC] pb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E4765] font-medium mb-1">
          Final Editorial Proof
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl text-[#1F1619]">
          Review Magazine Brief
        </h2>
        <p className="text-sm text-[#6E5A61] mt-1">
          Take a moment to look over your answers and photos before locking in the custom issue. You can jump back to any page to make adjustments.
        </p>
      </div>

      <div className="space-y-6">
        {FORM_PAGES.map((page, pageIndex) => {
          const SectionIcon = getSectionIcon(page.id);
          return (
          <section
            key={page.id}
            className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#EFE6E1] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765]">
                  <SectionIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-[#9E4765] font-medium">
                    Page {page.pageNumber} &mdash;{" "}
                    {adaptCopyByGender(page.subtitle, gender)}
                  </p>
                  <h3 className="font-serif text-xl text-[#1F1619]">
                    {adaptCopyByGender(page.title, gender)}
                  </h3>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditPage(pageIndex)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>

            <div className="space-y-6">
              {page.groups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h4 className="font-serif text-sm font-semibold text-[#4A3A40] border-l-2 border-[#9E4765] pl-2.5">
                    {adaptCopyByGender(group.title, gender)}
                  </h4>

                  <dl className="grid grid-cols-1 gap-3 pl-3">
                    {group.fields.map((field) => {
                      if (field.conditional) {
                        const triggerVal = values[field.conditional.fieldKey];
                        if (triggerVal !== field.conditional.equals) {
                          return null;
                        }
                      }

                      const rawVal = values[field.key];
                      const adaptedFieldLabel = adaptCopyByGender(
                        field.label,
                        gender
                      );

                      if (field.type === "photoUpload") {
                        const isShared = field.key === "shared_photos";
                        const categoryPhotos = photos.filter((p) =>
                          isShared ? p.category === "shared" : p.category !== "shared"
                        );
                        return (
                          <div key={field.key} className="space-y-2.5">
                            <dt className="text-xs font-medium text-[#7A686E]">
                              {adaptedFieldLabel} ({categoryPhotos.length} uploaded)
                            </dt>
                            <dd>
                              {categoryPhotos.length === 0 ? (
                                <span className="text-xs italic text-[#96838A]">
                                  No photos uploaded yet
                                </span>
                              ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                                  {categoryPhotos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="relative border border-[#E3D4CC] bg-[#FAF6F3] p-1"
                                    >
                                      <div className="aspect-square bg-[#EFE6E1] overflow-hidden flex items-center justify-center">
                                        {photo.previewUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={photo.previewUrl}
                                            alt={photo.caption || photo.originalName}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <ImageIcon className="h-5 w-5 text-[#96838A]" />
                                        )}
                                      </div>
                                      {!isShared && photo.isCover && (
                                        <span className="absolute top-1.5 left-1.5 bg-[#9E4765] text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                                          <Star className="h-2.5 w-2.5 fill-current" />
                                          Cover
                                        </span>
                                      )}
                                      {photo.caption && (
                                        <p className="text-[10px] text-[#4A3A40] truncate mt-1">
                                          {photo.caption}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </dd>
                          </div>
                        );
                      }

                      if (field.type === "repeatableRows") {
                        const rows = Array.isArray(rawVal)
                          ? (rawVal as Record<string, string>[])
                          : [];
                        const filledRows = rows.filter((r) =>
                          field.subFields.some(
                            (sf) => (r[sf.key] ?? "").trim().length > 0
                          )
                        );

                        return (
                          <div key={field.key} className="space-y-1.5">
                            <dt className="text-xs font-medium text-[#7A686E]">
                              {adaptedFieldLabel}
                            </dt>
                            <dd className="text-sm text-[#1F1619]">
                              {filledRows.length === 0 ? (
                                <span className="italic text-[#96838A] text-xs">
                                  Not provided
                                </span>
                              ) : (
                                <ol className="list-decimal list-inside space-y-1 bg-[#FAF6F3] p-3 border border-[#EFE6E1]">
                                  {filledRows.map((row, idx) => {
                                    const parts = field.subFields
                                      .map((sf) => (row[sf.key] ?? "").trim())
                                      .filter(Boolean);
                                    return (
                                      <li key={idx} className="text-xs sm:text-sm leading-relaxed">
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

                      if (field.type === "checkbox") {
                        return (
                          <div key={field.key} className="space-y-0.5">
                            <dt className="text-xs font-medium text-[#7A686E]">
                              {adaptedFieldLabel}
                            </dt>
                            <dd className="text-sm text-[#1F1619]">
                              {rawVal === true
                                ? "Confirmed: I am willingly submitting this information and have permission to share these photos and messages in the magazine."
                                : "Not yet confirmed"}
                            </dd>
                          </div>
                        );
                      }

                      const strVal =
                        rawVal !== undefined && rawVal !== null
                          ? String(rawVal).trim()
                          : "";

                      return (
                        <div key={field.key} className="space-y-0.5">
                          <dt className="text-xs font-medium text-[#7A686E]">
                            {adaptedFieldLabel}
                          </dt>
                          <dd className="text-sm text-[#1F1619] whitespace-pre-wrap">
                            {strVal || (
                              <span className="italic text-[#96838A] text-xs">
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

      {/* Final Willing Submission Consent Box */}
      <div
        id="final-consent-box"
        className={`rounded-3xl border p-5 sm:p-6 transition-all duration-200 ${
          isConsented
            ? "border-[#9E4765] bg-[#FDF8FA]"
            : localConsentError
              ? "border-[#B91C1C] bg-[#FFF5F6]"
              : "border-[#EFE6E0] bg-white"
        }`}
      >
        <label className="flex items-start gap-3.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isConsented}
            onChange={(e) => {
              onToggleConsent(e.target.checked);
              if (e.target.checked) {
                setLocalConsentError(false);
              }
            }}
            className="mt-1 h-4 w-4 rounded border-[#D4C3BC] accent-[#9E4765]"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[#1F1619]">
                Willing Submission &amp; Editorial Consent
              </span>
              <span className="inline-flex items-center rounded-full border border-[#EAD4DF] bg-[#F8EEF3] px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-[#873954]">
                Required
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#57454C] leading-relaxed">
              I confirm that I am willingly submitting all of the information, stories, memories, and photos in this brief to be created into the custom magazine, and I have permission to share them.
            </p>
            {localConsentError && !isConsented && (
              <p className="text-xs font-medium text-[#B91C1C] pt-1">
                Please check this box to confirm that you willingly submit this information for the magazine before continuing.
              </p>
            )}
          </div>
        </label>
      </div>

      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-[#F5C2C7] bg-[#FFF5F6] p-4 text-sm text-[#9E2A3A]"
        >
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E3D4CC]">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Back to Final Details
        </Button>

        <Button
          type="button"
          size="lg"
          onClick={() => {
            if (!isConsented) {
              setLocalConsentError(true);
              const el = document.getElementById("final-consent-box");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              return;
            }
            onSubmit();
          }}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting
            ? "Submitting Magazine..."
            : "Submit Magazine Order"}
        </Button>
      </div>
    </div>
  );
}
