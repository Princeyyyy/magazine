"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FORM_PAGES,
  buildFieldZodSchema,
  buildPageZodSchema,
  getDefaultFormValues,
  adaptCopyByGender,
  autoCapitalizeFirst,
  type FieldConfig,
  type UploadedPhotoItem,
} from "@/config/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditorialDatePicker } from "@/components/ui/editorial-date-picker";
import { RepeatableRowsField } from "./repeatable-rows-field";
import { PhotoUploader } from "./photo-uploader";
import { PhoneFieldInput } from "./phone-field-input";
import { ReviewStep } from "./review-step";
import { ThankYouView } from "./thank-you-view";
import {
  getSectionIcon,
  BrandLogoMark,
} from "@/components/icons/SectionIcons";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  Copy,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DRAFT_STORAGE_KEY = "her_custom_magazine_draft_token_v1";

/**
 * Computes the furthest page index the user has reached based on saved answers/photos
 * so returning via a resume link unlocks all sections up to where they left off.
 */
function computeInitialHighestStep(
  vals: Record<string, unknown>,
  photoList: UploadedPhotoItem[]
): number {
  let highest = 0;
  for (let i = 0; i < FORM_PAGES.length; i++) {
    const page = FORM_PAGES[i]!;
    let hasAnswerOnPage = false;

    for (const group of page.groups) {
      for (const field of group.fields) {
        if (field.key === "subject_gender") continue;
        if (field.type === "photoUpload") {
          const isShared = field.key === "shared_photos";
          const matchPhotos = photoList.filter((p) =>
            isShared ? p.category === "shared" : p.category !== "shared"
          );
          if (matchPhotos.length > 0) hasAnswerOnPage = true;
          continue;
        }
        const v = vals[field.key];
        if (typeof v === "string" && v.trim().length > 0) {
          hasAnswerOnPage = true;
        } else if (typeof v === "number") {
          hasAnswerOnPage = true;
        } else if (v === true) {
          hasAnswerOnPage = true;
        } else if (Array.isArray(v)) {
          const anyRowFilled = v.some(
            (row) =>
              row &&
              typeof row === "object" &&
              Object.values(row as Record<string, unknown>).some(
                (cell) => typeof cell === "string" && cell.trim().length > 0
              )
          );
          if (anyRowFilled) hasAnswerOnPage = true;
        }
      }
    }

    if (hasAnswerOnPage) {
      highest = i;
      // Also check if this page is completely valid; if so, unlock the next page too
      const schema = buildPageZodSchema(page);
      const soloPhotos = photoList.filter((p) => p.category !== "shared");
      const sharedPhotos = photoList.filter((p) => p.category === "shared");
      if (
        schema.safeParse({
          ...vals,
          solo_photos: soloPhotos,
          shared_photos: sharedPhotos,
          photos: photoList,
        }).success
      ) {
        highest = Math.min(FORM_PAGES.length, i + 1);
      }
    }
  }
  return highest;
}

/**
 * Checks whether the restored draft has any actual user-entered answers or uploaded photos
 * so we can distinguish returning visitors with saved progress from blank initial drafts.
 */
function hasAnySavedProgress(
  vals: Record<string, unknown>,
  photoList: UploadedPhotoItem[]
): boolean {
  if (photoList && photoList.length > 0) return true;
  for (const page of FORM_PAGES) {
    for (const group of page.groups) {
      for (const field of group.fields) {
        if (field.key === "subject_gender" || field.key === "permission_consent") {
          continue;
        }
        const v = vals[field.key];
        if (typeof v === "string" && v.trim().length > 0) return true;
        if (typeof v === "number" && !Number.isNaN(v) && v > 0) return true;
        if (Array.isArray(v) && v.length > 0) {
          const anyRowFilled = v.some(
            (row) =>
              row &&
              typeof row === "object" &&
              Object.values(row as Record<string, unknown>).some(
                (cell) => typeof cell === "string" && cell.trim().length > 0
              )
          );
          if (anyRowFilled) return true;
        }
      }
    }
  }
  return false;
}

interface MagazineWizardProps {
  isAdmin?: boolean;
}

export function MagazineWizard({
  isAdmin: initialIsAdmin = false,
}: MagazineWizardProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeTokenParam = searchParams.get("resume");

  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin);
  const [isResumingFromUrl, setIsResumingFromUrl] = useState(
    Boolean(resumeTokenParam)
  );
  const [draftToken, setDraftToken] = useState<string>("");
  const [orderReference, setOrderReference] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("draft");
  const [isDevMode, setIsDevMode] = useState<boolean>(
    process.env.NODE_ENV !== "production"
  );

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    getDefaultFormValues(FORM_PAGES)
  );
  const [photos, setPhotos] = useState<UploadedPhotoItem[]>([]);

  // Step 0..8 = FORM_PAGES[0..8], Step 9 = Review Step
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState<number>(0);

  // Validation errors for current page
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<
    Record<string, Record<number, Record<string, string>>>
  >({});

  // Autosave indicator & bookmark toggle
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [showResumeDrawer, setShowResumeDrawer] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [resumeEmailInput, setResumeEmailInput] = useState("");
  const [resumeEmailStatus, setResumeEmailStatus] = useState<string | null>(
    null
  );
  const [copiedResumeLink, setCopiedResumeLink] = useState(false);

  // Honeypot anti-bot state
  const [honeypot, setHoneypot] = useState("");

  // Final submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Elegant Editorial Toast Notification
  const [editorialToast, setEditorialToast] = useState<{
    title: string;
    subtitle: string;
    tone: "default" | "progress" | "warning";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showEditorialToast = useCallback(
    (
      title: string,
      subtitle: string,
      tone: "default" | "progress" | "warning" = "default",
      durationMs = 3600
    ) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setEditorialToast({ title, subtitle, tone });
      if (durationMs > 0) {
        toastTimerRef.current = setTimeout(() => {
          setEditorialToast(null);
        }, durationMs);
      }
    },
    []
  );

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const draftTokenRef = useRef(draftToken);
  draftTokenRef.current = draftToken;
  const userEditedBeforeInitRef = useRef(false);
  const welcomedRef = useRef(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedGender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  // Initialize or resume draft in background without blocking initial UI render
  useEffect(() => {
    let active = true;

    async function initDraft() {
      try {
        // If viewing in Admin Mode without an explicit resume URL parameter,
        // guarantee clean slate for inspecting the customer form (do not restore or create drafts)
        if (initialIsAdmin && !resumeTokenParam) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          if (!welcomedRef.current) {
            welcomedRef.current = true;
            showEditorialToast(
              "Admin Inspection Mode",
              "You can freely navigate all 9 chapters & final review. No test data or orders will be logged.",
              "default",
              4500
            );
          }
          return;
        }

        const storedToken =
          resumeTokenParam ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem(DRAFT_STORAGE_KEY)
            : null) ||
          undefined;

        // If there is no stored token, welcome the user immediately without creating any DB row
        if (!storedToken) {
          if (!welcomedRef.current) {
            welcomedRef.current = true;
            showEditorialToast(
              "Welcome to Custom Magazine",
              "Craft a bespoke editorial keepsake. Your answers and photos save automatically as you go.",
              "default",
              5000
            );
          }
          return;
        }

        const res = await fetch("/api/orders/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: storedToken }),
        });

        const data = (await res.json()) as {
          isDevMode?: boolean;
          isAdmin?: boolean;
          draft?: {
            draftToken: string;
            reference: string;
            status: string;
            values: Record<string, unknown>;
            photos: UploadedPhotoItem[];
          };
        };

        if (!active) return;

        if (typeof data.isDevMode === "boolean") {
          setIsDevMode(data.isDevMode);
        }
        if (typeof data.isAdmin === "boolean") {
          setIsAdmin(data.isAdmin);
        }

        // If token was invalid or pruned from database, reset storage and show clean welcome
        if (!data.draft) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          if (!welcomedRef.current) {
            welcomedRef.current = true;
            showEditorialToast(
              "Welcome to Custom Magazine",
              "Craft a bespoke editorial keepsake. Your answers and photos save automatically as you go.",
              "default",
              5000
            );
          }
          return;
        }

        draftTokenRef.current = data.draft.draftToken;
        setDraftToken(data.draft.draftToken);
        setOrderReference(data.draft.reference);
        setOrderStatus(data.draft.status);
        setPhotos(data.draft.photos);

        const computedMaxStep = computeInitialHighestStep(
          data.draft.values,
          data.draft.photos
        );
        setHighestUnlockedStep(computedMaxStep);

        const hasSavedAnswers = hasAnySavedProgress(
          data.draft.values,
          data.draft.photos
        );

        // If the draft has zero saved answers (e.g. empty phantom from earlier), discard it
        if (!hasSavedAnswers && !resumeTokenParam) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          if (!welcomedRef.current) {
            welcomedRef.current = true;
            showEditorialToast(
              "Welcome to Custom Magazine",
              "Craft a bespoke editorial keepsake. Your answers and photos save automatically as you go.",
              "default",
              5000
            );
          }
          return;
        }

        const isReturningSession =
          Boolean(resumeTokenParam) || (Boolean(storedToken) && hasSavedAnswers);

        if (!userEditedBeforeInitRef.current) {
          setValues(data.draft.values);

          if (isReturningSession) {
            const targetStep = Math.min(FORM_PAGES.length - 1, computedMaxStep);
            setCurrentStep(targetStep);

            if (!welcomedRef.current) {
              welcomedRef.current = true;
              const resumedPage = FORM_PAGES[targetStep];
              const customerName =
                typeof data.draft.values["customer_name"] === "string"
                  ? data.draft.values["customer_name"].trim()
                  : "";
              const herName =
                typeof data.draft.values["her_name"] === "string"
                  ? data.draft.values["her_name"].trim()
                  : "";
              const chapterTitle = resumedPage
                ? `Chapter ${targetStep + 1}: ${adaptCopyByGender(
                    resumedPage.title,
                    String(data.draft.values["subject_gender"] || "Female")
                  )}`
                : "your magazine brief";

              const title = customerName
                ? `Welcome back, ${customerName}!`
                : "Welcome back!";
              const subtitle = herName
                ? `Picked up where you left off on ${herName}'s issue (${chapterTitle}).`
                : `Your saved progress has been restored at ${chapterTitle}.`;

              showEditorialToast(title, subtitle, "default", 5500);
            }
          }
        }

        if (typeof data.draft.values["email"] === "string") {
          setResumeEmailInput(data.draft.values["email"]);
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            DRAFT_STORAGE_KEY,
            data.draft.draftToken
          );
        }
      } catch (err) {
        console.error("Failed to initialize draft:", err);
      } finally {
        if (active) setIsResumingFromUrl(false);
      }
    }

    void initDraft();
    return () => {
      active = false;
    };
  }, [initialIsAdmin, resumeTokenParam, showEditorialToast]);

  // Save draft helper: lazily creates draft on first meaningful edit, then updates
  const persistDraftNow = useCallback(
    async (overrideValues?: Record<string, unknown>) => {
      if (orderStatus !== "draft") return;
      // Admins inspecting the customer form should NEVER create drafts or log orders in DB
      if (isAdmin && !draftTokenRef.current) return;

      const payloadValues = overrideValues ?? valuesRef.current;

      // Do not ping server or create phantom records if still blank and has no token
      if (!draftTokenRef.current && !hasAnySavedProgress(payloadValues, photos)) {
        return;
      }

      setSaveState("saving");
      try {
        const res = await fetch("/api/orders/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: draftTokenRef.current || undefined,
            values: payloadValues,
            honeypot,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          draftToken?: string;
          reference?: string;
          status?: string;
        };

        if (data.ok && data.draftToken) {
          if (!draftTokenRef.current || draftTokenRef.current !== data.draftToken) {
            draftTokenRef.current = data.draftToken;
            setDraftToken(data.draftToken);
            if (data.reference) {
              setOrderReference(data.reference);
            }
            if (typeof window !== "undefined") {
              window.localStorage.setItem(DRAFT_STORAGE_KEY, data.draftToken);
            }
          }
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
      } catch {
        setSaveState("idle");
      }
    },
    [honeypot, isAdmin, orderStatus, photos]
  );

  const triggerDebouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void persistDraftNow();
    }, 650);
  }, [persistDraftNow]);

  const validateSingleField = useCallback(
    (field: FieldConfig, currentVal: unknown) => {
      const strVal =
        typeof currentVal === "string" ? currentVal.trim() : "";
      const isOptionalEmpty =
        !field.required &&
        !field.conditional?.requiredWhenShown &&
        (currentVal === undefined ||
          currentVal === null ||
          strVal === "");

      if (isOptionalEmpty) {
        setFieldErrors((prev) => {
          if (!prev[field.key]) return prev;
          const copy = { ...prev };
          delete copy[field.key];
          return copy;
        });
        return;
      }

      const schema = buildFieldZodSchema(field);
      const parsed = schema.safeParse(currentVal);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        if (issue) {
          const currentGender = String(
            valuesRef.current["subject_gender"] || "Female"
          );
          setFieldErrors((prev) => ({
            ...prev,
            [field.key]: adaptCopyByGender(issue.message, currentGender),
          }));
        }
      } else {
        setFieldErrors((prev) => {
          if (!prev[field.key]) return prev;
          const copy = { ...prev };
          delete copy[field.key];
          return copy;
        });
      }
    },
    []
  );

  const handleFieldBlur = useCallback(
    (field: FieldConfig) => {
      validateSingleField(field, valuesRef.current[field.key]);
      triggerDebouncedSave();
    },
    [triggerDebouncedSave, validateSingleField]
  );

  const setFieldValue = useCallback((key: string, nextVal: unknown) => {
    userEditedBeforeInitRef.current = true;
    const processedVal =
      typeof nextVal === "string" &&
      key !== "email" &&
      key !== "phone_e164" &&
      key !== "birthday_date" &&
      key !== "photo_link_fallback"
        ? autoCapitalizeFirst(nextVal)
        : nextVal;

    setValues((prev) => {
      const updated = { ...prev, [key]: processedVal };
      valuesRef.current = updated;
      return updated;
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const handlePhotosChange = useCallback(
    (nextPhotos: UploadedPhotoItem[]) => {
      setPhotos((prevPhotos) => {
        if (nextPhotos.length > prevPhotos.length) {
          const addedCount = nextPhotos.length - prevPhotos.length;
          showEditorialToast(
            addedCount === 1
              ? "Photo added to your issue"
              : `${addedCount} photos added to your issue`,
            `${nextPhotos.length} photos saved to your private folder.`
          );
        }
        return nextPhotos;
      });
      const solo = nextPhotos.filter((p) => p.category !== "shared");
      const shared = nextPhotos.filter((p) => p.category === "shared");
      setFieldValue("photos", nextPhotos);
      setFieldValue("solo_photos", solo);
      setFieldValue("shared_photos", shared);
    },
    [setFieldValue, showEditorialToast]
  );

  const scrollToFirstInvalidField = (
    errors: Record<string, string>,
    nestedRowErrors: Record<string, Record<number, Record<string, string>>>
  ) => {
    if (typeof document === "undefined") return;
    const pageConfig = FORM_PAGES[currentStep];
    if (!pageConfig) return;

    for (const group of pageConfig.groups) {
      for (const field of group.fields) {
        if (errors[field.key] || nestedRowErrors[field.key]) {
          const el = document.getElementById(`field-container-${field.key}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = el.querySelector<HTMLElement>(
              "input, textarea, select, button"
            );
            focusable?.focus({ preventScroll: true });
            return;
          }
        }
      }
    }
  };

  const validateCurrentPage = (): boolean => {
    const pageConfig = FORM_PAGES[currentStep];
    if (!pageConfig) return true;

    const pageSchema = buildPageZodSchema(pageConfig);
    const soloPhotos = photos.filter((p) => p.category !== "shared");
    const sharedPhotos = photos.filter((p) => p.category === "shared");
    const pagePayload: Record<string, unknown> = {
      ...values,
      solo_photos: soloPhotos,
      shared_photos: sharedPhotos,
      photos,
    };

    const parsed = pageSchema.safeParse(pagePayload);
    if (parsed.success) {
      setValues((prev) => ({ ...prev, ...parsed.data }));
      setFieldErrors({});
      setRowErrors({});
      return true;
    }

    const nextFieldErrors: Record<string, string> = {};
    const nextRowErrors: Record<
      string,
      Record<number, Record<string, string>>
    > = {};

    for (const issue of parsed.error.issues) {
      const [firstKey, secondKey, thirdKey] = issue.path;
      const adaptedMsg = adaptCopyByGender(issue.message, selectedGender);
      if (typeof firstKey === "string") {
        if (typeof secondKey === "number" && typeof thirdKey === "string") {
          if (!nextRowErrors[firstKey]) nextRowErrors[firstKey] = {};
          if (!nextRowErrors[firstKey]![secondKey]) {
            nextRowErrors[firstKey]![secondKey] = {};
          }
          nextRowErrors[firstKey]![secondKey]![thirdKey] = adaptedMsg;
        } else if (!nextFieldErrors[firstKey]) {
          nextFieldErrors[firstKey] = adaptedMsg;
        }
      }
    }

    setFieldErrors(nextFieldErrors);
    setRowErrors(nextRowErrors);

    setTimeout(() => {
      scrollToFirstInvalidField(nextFieldErrors, nextRowErrors);
    }, 30);

    return false;
  };

  const handleNextPage = async () => {
    if (!isAdmin && !validateCurrentPage()) {
      showEditorialToast(
        "A quick detail needed",
        "Please check the highlighted field above before continuing.",
        "warning"
      );
      return;
    }
    if (hasAnySavedProgress(valuesRef.current, photos)) {
      void persistDraftNow();
    }
    const nextIdx = Math.min(FORM_PAGES.length, currentStep + 1);
    setHighestUnlockedStep((prev) => Math.max(prev, nextIdx));
    setCurrentStep(nextIdx);
    const completedNumber = currentStep + 1;
    const nextPage = FORM_PAGES[nextIdx];
    if (nextPage) {
      if (hasAnySavedProgress(valuesRef.current, photos)) {
        showEditorialToast(
          `Chapter ${completedNumber} saved`,
          `Up next: ${adaptCopyByGender(nextPage.title, selectedGender)}`
        );
      } else {
        showEditorialToast(
          `Chapter ${nextIdx + 1}: ${adaptCopyByGender(nextPage.title, selectedGender)}`,
          isAdmin ? "Viewing in Admin Inspection Mode" : "Step forward"
        );
      }
    } else {
      showEditorialToast(
        "Final Editorial Proof",
        "Take a moment to review the magazine brief layout."
      );
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBackPage = async () => {
    if (hasAnySavedProgress(valuesRef.current, photos)) {
      void persistDraftNow();
    }
    setFieldErrors({});
    setRowErrors({});
    setCurrentStep((prev) => Math.max(0, prev - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleJumpToStep = (targetIdx: number) => {
    const canJump = isDevMode || isAdmin || targetIdx <= highestUnlockedStep;
    if (!canJump) return;
    if (hasAnySavedProgress(valuesRef.current, photos)) {
      void persistDraftNow();
    }
    setFieldErrors({});
    setRowErrors({});
    setCurrentStep(targetIdx);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSendResumeEmail = async () => {
    setResumeEmailStatus(null);
    if (!resumeEmailInput.trim()) {
      setResumeEmailStatus("Please enter your email address first.");
      return;
    }
    try {
      const res = await fetch("/api/orders/resume-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: draftTokenRef.current || undefined,
          email: resumeEmailInput.trim(),
          values: valuesRef.current,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        draftToken?: string;
        reference?: string;
        message?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        setResumeEmailStatus(
          data.error?.message || "Could not send resume link."
        );
        return;
      }

      if (data.draftToken) {
        draftTokenRef.current = data.draftToken;
        setDraftToken(data.draftToken);
        if (data.reference) {
          setOrderReference(data.reference);
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DRAFT_STORAGE_KEY, data.draftToken);
        }
      }

      setFieldValue("email", resumeEmailInput.trim());
      setIsBookmarked(true);
      setResumeEmailStatus(
        data.message || "I have sent your private resume link to your email."
      );
      showEditorialToast(
        "Private resume link sent",
        `Check ${resumeEmailInput.trim()} whenever you are ready to continue.`
      );
    } catch {
      setResumeEmailStatus("Could not send resume link. Please try again.");
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    showEditorialToast(
      "Sending to the Editorial Desk",
      "Finalizing your magazine brief and locking in your photos...",
      "progress",
      0
    );

    try {
      let activeToken = draftTokenRef.current;
      const soloPhotos = photos.filter((p) => p.category !== "shared");
      const sharedPhotos = photos.filter((p) => p.category === "shared");
      if (!activeToken) {
        const saveRes = await fetch("/api/orders/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values: {
              ...valuesRef.current,
              solo_photos: soloPhotos,
              shared_photos: sharedPhotos,
              photos,
            },
            honeypot,
          }),
        });
        const saveData = (await saveRes.json()) as {
          ok?: boolean;
          draftToken?: string;
          reference?: string;
        };
        if (saveData.ok && saveData.draftToken) {
          activeToken = saveData.draftToken;
          draftTokenRef.current = activeToken;
          setDraftToken(activeToken);
          if (saveData.reference) setOrderReference(saveData.reference);
        }
      }

      if (!activeToken) {
        throw new Error("Could not initialize your order before submission.");
      }

      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          values: {
            ...valuesRef.current,
            solo_photos: soloPhotos,
            shared_photos: sharedPhotos,
            photos,
          },
          honeypot,
        }),
      });

      const data = (await res.json()) as {
        reference?: string;
        herName?: string;
        error?: {
          message?: string;
          details?: { field: string; message: string }[];
        };
      };

      if (!res.ok || !data.reference) {
        const detailText = data.error?.details
          ?.map((d) => adaptCopyByGender(d.message, selectedGender))
          .slice(0, 3)
          .join(" ");
        const errMsg =
          detailText ||
          data.error?.message ||
          "Please review your answers and make sure all required fields are complete.";
        setSubmitError(errMsg);
        showEditorialToast("Please review your brief", errMsg, "warning", 5000);
        setIsSubmitting(false);
        return;
      }

      setOrderReference(data.reference);
      setOrderStatus("submitted");
      showEditorialToast(
        "Magazine brief submitted",
        `Order ${data.reference} has been received.`
      );
      const herParam = String(values["her_name"] || "").trim();
      router.push(
        `/thank-you?ref=${encodeURIComponent(data.reference)}${
          herParam ? `&her=${encodeURIComponent(herParam)}` : ""
        }`
      );
    } catch {
      const errMsg =
        "Something went wrong while submitting your order. Please try again.";
      setSubmitError(errMsg);
      showEditorialToast("Submission interrupted", errMsg, "warning", 5000);
      setIsSubmitting(false);
    }
  };

  if (isResumingFromUrl) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center space-y-3 animate-editorial-in">
        <div className="flex justify-center">
          <BrandLogoMark className="h-12 w-12" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#9E4765]">
          Custom Magazine
        </p>
        <p className="font-serif italic text-2xl text-[#1F1619]">
          Restoring your saved magazine brief...
        </p>
      </div>
    );
  }

  if (orderStatus !== "draft") {
    return (
      <div className="py-8 animate-editorial-in">
        <ThankYouView
          reference={orderReference}
          herName={String(values["her_name"] || "")}
        />
      </div>
    );
  }

  const totalSteps = FORM_PAGES.length; // 9 pages + review
  const isReviewStep = currentStep === totalSteps;
  const activePage = FORM_PAGES[currentStep];
  const progressPercent = isReviewStep
    ? 100
    : Math.round(((currentStep + 1) / (totalSteps + 1)) * 100);

  const resumeUrl =
    typeof window !== "undefined" && draftToken
      ? `${window.location.origin}/?resume=${encodeURIComponent(draftToken)}`
      : "";

  const renderFieldInput = (field: FieldConfig) => {
    const fieldError = fieldErrors[field.key];
    const rawValue = values[field.key];
    const adaptedPlaceholder = adaptCopyByGender(
      field.placeholder,
      selectedGender
    );

    switch (field.type) {
      case "shortText": {
        const strVal = typeof rawValue === "string" ? rawValue : "";
        return (
          <div className="relative">
            <Input
              id={field.key}
              value={strVal}
              maxLength={field.maxLength}
              placeholder={adaptedPlaceholder}
              disableAutoCapitalize={field.key === "photo_link_fallback"}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? `${field.key}-error` : undefined}
              onChange={(e) => setFieldValue(field.key, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              className={cn(
                "pr-16",
                fieldError ? "border-[#B91C1C]" : undefined
              )}
            />
            {strVal.length > 0 && (
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[#A39197]">
                {strVal.length}/{field.maxLength}
              </span>
            )}
          </div>
        );
      }

      case "longText": {
        const strVal = typeof rawValue === "string" ? rawValue : "";
        return (
          <div className="space-y-1.5">
            <Textarea
              id={field.key}
              value={strVal}
              maxLength={field.maxLength}
              placeholder={adaptedPlaceholder}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? `${field.key}-error` : undefined}
              onChange={(e) => setFieldValue(field.key, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              className={cn(fieldError ? "border-[#B91C1C]" : undefined)}
            />
            <div className="flex items-center justify-between text-[11px] text-[#96838A] px-1">
              <span>
                {field.minLength
                  ? `At least ${field.minLength} characters`
                  : "Share as much detail as you like"}
              </span>
              <span>
                {strVal.length} / {field.maxLength}
              </span>
            </div>
          </div>
        );
      }

      case "number": {
        const strVal =
          rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
        return (
          <Input
            id={field.key}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={strVal}
            placeholder={adaptedPlaceholder}
            aria-invalid={Boolean(fieldError)}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
              setFieldValue(field.key, digitsOnly);
            }}
            onBlur={() => handleFieldBlur(field)}
            className={cn(
              "max-w-[180px]",
              fieldError ? "border-[#B91C1C]" : undefined
            )}
          />
        );
      }

      case "date": {
        const strVal = typeof rawValue === "string" ? rawValue : "";
        return (
          <EditorialDatePicker
            id={field.key}
            value={strVal}
            onChange={(nextIso) => setFieldValue(field.key, nextIso)}
            onBlur={() => handleFieldBlur(field)}
            hasError={Boolean(fieldError)}
          />
        );
      }

      case "radio": {
        const selected =
          typeof rawValue === "string" && rawValue
            ? rawValue
            : field.key === "subject_gender"
              ? "Female"
              : "";

        // Render a sleek segmented pill toggle for subject_gender
        if (field.key === "subject_gender") {
          return (
            <div
              role="radiogroup"
              aria-label={field.label}
              className="inline-flex rounded-full border border-[#EAE0DA] bg-[#FCF9F7] p-1 gap-1"
            >
              {field.options.map((opt) => {
                const isSelected = selected === opt;
                const pronounHint =
                  opt === "Female"
                    ? "She / Her"
                    : opt === "Male"
                      ? "He / Him"
                      : "They / Them";
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setFieldValue(field.key, opt);
                      triggerDebouncedSave();
                    }}
                    className={cn(
                      "rounded-full px-5 py-2 text-xs font-medium transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#9E4765] text-white shadow-xs"
                        : "text-[#5C4950] hover:text-[#1F1619]"
                    )}
                  >
                    <span>{opt}</span>
                    <span
                      className={cn(
                        "ml-1.5 text-[10px]",
                        isSelected ? "text-white/85" : "text-[#96838A]"
                      )}
                    >
                      ({pronounHint})
                    </span>
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <div
            role="radiogroup"
            aria-label={adaptCopyByGender(field.label, selectedGender)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
          >
            {field.options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <label
                  key={opt}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-sm cursor-pointer transition-all duration-200",
                    isSelected
                      ? "border-[#9E4765] bg-[#FDF7FA] text-[#1F1619] font-medium shadow-2xs"
                      : "border-[#EAE0DA] bg-[#FCF9F7]/60 text-[#4A3A40] hover:bg-white hover:border-[#D5B8C4]"
                  )}
                >
                  <input
                    type="radio"
                    name={field.key}
                    value={opt}
                    checked={isSelected}
                    onChange={() => {
                      setFieldValue(field.key, opt);
                      triggerDebouncedSave();
                    }}
                    className="h-4 w-4 accent-[#9E4765]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "email": {
        const strVal = typeof rawValue === "string" ? rawValue : "";
        return (
          <Input
            id={field.key}
            type="email"
            disableAutoCapitalize
            value={strVal}
            placeholder={adaptedPlaceholder}
            aria-invalid={Boolean(fieldError)}
            onChange={(e) => {
              setFieldValue(field.key, e.target.value);
              setResumeEmailInput(e.target.value);
            }}
            onBlur={() => handleFieldBlur(field)}
            className={cn(fieldError ? "border-[#B91C1C]" : undefined)}
          />
        );
      }

      case "phone": {
        const strVal = typeof rawValue === "string" ? rawValue : "";
        return (
          <PhoneFieldInput
            id={field.key}
            value={strVal}
            defaultCountry={field.defaultCountry}
            placeholder={adaptedPlaceholder}
            onChange={(val) => setFieldValue(field.key, val)}
            onBlur={() => handleFieldBlur(field)}
            hasError={Boolean(fieldError)}
          />
        );
      }

      case "checkbox": {
        const checked = rawValue === true;
        return (
          <label className="flex items-start gap-3.5 rounded-xl border border-[#EAE0DA] bg-[#FCF9F7] p-4 cursor-pointer hover:border-[#D5B8C4] transition-colors">
            <input
              id={field.key}
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setFieldValue(field.key, e.target.checked);
                triggerDebouncedSave();
              }}
              className="mt-0.5 h-4 w-4 accent-[#9E4765]"
            />
            <span className="text-sm text-[#1F1619] leading-snug">
              {adaptCopyByGender(field.checkboxLabel, selectedGender)}
            </span>
          </label>
        );
      }

      case "repeatableRows": {
        const rows = Array.isArray(rawValue)
          ? (rawValue as Record<string, string>[])
          : [];
        return (
          <RepeatableRowsField
            field={field}
            rows={rows}
            onChange={(nextRows) => setFieldValue(field.key, nextRows)}
            onBlurSave={triggerDebouncedSave}
            errorMessage={fieldError}
            rowErrors={rowErrors[field.key]}
            gender={selectedGender}
          />
        );
      }

      case "photoUpload": {
        const category =
          field.category ?? (field.key === "shared_photos" ? "shared" : "solo");
        const categoryPhotos = photos.filter((p) =>
          category === "shared" ? p.category === "shared" : p.category !== "shared"
        );

        return (
          <PhotoUploader
            key={field.key}
            draftToken={draftToken}
            category={category}
            minPhotos={field.minPhotos}
            maxPhotos={field.maxPhotos}
            photos={categoryPhotos}
            onChange={(nextCategoryPhotos) => {
              const otherCategoryPhotos = photos.filter((p) =>
                category === "shared" ? p.category !== "shared" : p.category === "shared"
              );
              const updatedAll = [...otherCategoryPhotos, ...nextCategoryPhotos].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
              );
              handlePhotosChange(updatedAll);
            }}
            errorMessage={fieldError}
            gender={selectedGender}
            onDraftCreated={(token, reference) => {
              draftTokenRef.current = token;
              setDraftToken(token);
              if (reference) {
                setOrderReference(reference);
              }
              if (typeof window !== "undefined") {
                window.localStorage.setItem(DRAFT_STORAGE_KEY, token);
              }
            }}
          />
        );
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Admin Inspection Mode Banner */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8D1DC] bg-[#FAF0F4] px-4 py-3 text-xs text-[#7A2E48] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] bg-[#9E4765] text-white px-2 py-0.5 rounded-full shadow-2xs">
              Admin Mode
            </span>
            <span className="font-medium">
              All 9 chapters &amp; review unlocked. You can jump directly to any section unobstructed.
            </span>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-[#9E4765] hover:text-[#7A2E48] hover:underline"
          >
            Editorial Desk &rarr;
          </Link>
        </div>
      )}

      {/* Sleek Wide Editorial Progress Bar (All Sections on One Line) */}
      <div className="rounded-2xl border border-[#EFE6E0] bg-white/95 backdrop-blur-md px-4 sm:px-5 py-4 shadow-[0_4px_24px_-8px_rgba(31,22,25,0.05)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium tracking-wider uppercase text-[#9E4765]">
              {isReviewStep
                ? "Final Proof"
                : `Chapter ${currentStep + 1} of ${totalSteps}`}
            </span>
            {activePage && (
              <span className="text-xs text-[#8C7A80] hidden sm:inline">
                &mdash; {adaptCopyByGender(activePage.title, selectedGender)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8C7A80]">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "saved"
                  ? "Saved"
                  : orderReference
                    ? `Ref ${orderReference}`
                    : "Autosave on"}
            </span>
            <button
              type="button"
              aria-pressed={showResumeDrawer || isBookmarked}
              onClick={() => {
                const nextOpen = !showResumeDrawer;
                setShowResumeDrawer(nextOpen);
                setIsBookmarked(true);
                void persistDraftNow();
                if (nextOpen) {
                  showEditorialToast(
                    "Draft bookmarked for later",
                    "Copy your private link or email it to yourself to continue anytime."
                  );
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                showResumeDrawer
                  ? "border-[#9E4765] bg-[#9E4765] text-white shadow-2xs"
                  : isBookmarked
                    ? "border-[#9E4765] bg-[#FDF2F6] text-[#873954]"
                    : "border-[#EAE0DA] bg-[#FCF9F7] text-[#4A3A40] hover:border-[#9E4765] hover:text-[#9E4765]"
              )}
            >
              <Bookmark
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  showResumeDrawer
                    ? "fill-current text-white scale-110"
                    : isBookmarked
                      ? "fill-current text-[#9E4765] scale-110"
                      : "text-[#9E4765]"
                )}
              />
              <span>
                {showResumeDrawer || isBookmarked
                  ? "Saved for later"
                  : "Save for later"}
              </span>
            </button>
          </div>
        </div>

        {/* Minimalist Hairline Progress */}
        <div className="w-full h-1 rounded-full bg-[#F2EAE4] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#9E4765] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Interactive Section Navigation Bar (Single Line on Desktop) */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-1 pt-1">
          {FORM_PAGES.map((p, idx) => {
            const isCurrent = idx === currentStep;
            const isUnlocked = isDevMode || isAdmin || idx <= highestUnlockedStep;
            const isCompleted = idx < currentStep || idx < highestUnlockedStep;
            const adaptedTitle = adaptCopyByGender(p.title, selectedGender);
            const SectionIcon = getSectionIcon(p.id);

            return (
              <button
                key={p.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => handleJumpToStep(idx)}
                title={`${p.pageNumber}. ${adaptedTitle}`}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] whitespace-nowrap transition-all",
                  isCurrent
                    ? "bg-[#1F1619] text-white font-semibold shadow-2xs"
                    : isUnlocked
                      ? "text-[#7A2E48] hover:bg-[#F6EBF0] cursor-pointer"
                      : "text-[#C2B2B8] cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition-all",
                    isCurrent
                      ? "bg-white/20 text-white"
                      : isCompleted
                        ? "bg-[#F6EBF0] text-[#9E4765]"
                        : isUnlocked
                          ? "bg-[#F2EAE4] text-[#5C4950]"
                          : "bg-[#F5EFEA] text-[#B5A3A9]"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    <SectionIcon className="h-3 w-3" />
                  )}
                </span>
                <span>{adaptedTitle}</span>
              </button>
            );
          })}

          {/* Review Tab Pill */}
          {(isDevMode || isAdmin || highestUnlockedStep >= totalSteps) && (
            <button
              type="button"
              onClick={() => handleJumpToStep(totalSteps)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] whitespace-nowrap transition-all cursor-pointer",
                isReviewStep
                  ? "bg-[#1F1619] text-white font-semibold"
                  : "text-[#7A2E48] hover:bg-[#F6EBF0]"
              )}
            >
              <span>Review</span>
            </button>
          )}
        </div>

        {/* Save & Resume Drawer */}
        {showResumeDrawer && (
          <div className="border-t border-[#EFE6E0] pt-4 mt-2 space-y-3 rounded-xl bg-[#FCF9F7] p-4 animate-editorial-in">
            <div className="space-y-1">
              <p className="font-serif text-base font-medium text-[#1F1619]">
                Continue the magazine whenever you are ready
              </p>
              <p className="text-xs text-[#6E5A61] leading-relaxed">
                Your answers and uploaded photos are saved automatically. Copy your private link or email it to yourself to pick up right where you left off.
              </p>
            </div>

            {resumeUrl && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  disableAutoCapitalize
                  value={resumeUrl}
                  aria-label="Resume order link"
                  className="h-9 text-xs bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(resumeUrl);
                    setIsBookmarked(true);
                    setCopiedResumeLink(true);
                    showEditorialToast(
                      "Private resume link copied",
                      "Keep it somewhere safe to pick up right where you left off."
                    );
                    setTimeout(() => setCopiedResumeLink(false), 2000);
                  }}
                >
                  {copiedResumeLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#15803D]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <Input
                type="email"
                disableAutoCapitalize
                value={resumeEmailInput}
                onChange={(e) => setResumeEmailInput(e.target.value)}
                placeholder="Your email address"
                className="h-9 text-xs bg-white flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSendResumeEmail()}
              >
                <Send className="h-3.5 w-3.5" />
                Email Link
              </Button>
            </div>

            {resumeEmailStatus && (
              <p className="text-xs text-[#7A2E48] font-medium">
                {resumeEmailStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Honeypot field (hidden from real users) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website_url_hp">Leave this field blank</label>
        <input
          id="website_url_hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Main Content: Either Active Form Page or Review Step */}
      {isReviewStep ? (
        <div className="mx-auto max-w-3xl animate-editorial-in">
          <ReviewStep
            values={values}
            photos={photos}
            gender={selectedGender}
            onEditPage={(pageIndex) => {
              setCurrentStep(pageIndex);
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            onToggleConsent={(checked) => {
              setFieldValue("permission_consent", checked);
              triggerDebouncedSave();
            }}
            onBack={() => setCurrentStep(totalSteps - 1)}
            onSubmit={() => void handleFinalSubmit()}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        </div>
      ) : activePage ? (
        <form
          key={activePage.id}
          onSubmit={(e) => {
            e.preventDefault();
            void handleNextPage();
          }}
          noValidate
          className="mx-auto max-w-3xl space-y-8 animate-editorial-in"
        >
          {/* Editorial Chapter Heading */}
          <div className="text-center space-y-2.5 pt-2">
            {(() => {
              const ActiveIcon = getSectionIcon(activePage.id);
              return (
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765] shadow-2xs">
                  <ActiveIcon className="h-5 w-5" />
                </div>
              );
            })()}
            <p className="font-serif italic text-lg sm:text-xl text-[#9E4765]">
              {adaptCopyByGender(activePage.subtitle, selectedGender)}
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#1F1619]">
              {adaptCopyByGender(activePage.title, selectedGender)}
            </h1>
          </div>

          {/* Flowing Group Cards */}
          <div className="space-y-6">
            {activePage.groups.map((group) => (
              <section
                key={group.id}
                className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-9 shadow-[0_8px_30px_-12px_rgba(31,22,25,0.06)] space-y-6"
              >
                <div className="border-b border-[#F3ECE7] pb-3.5">
                  <h2 className="font-serif text-2xl font-normal text-[#1F1619]">
                    {adaptCopyByGender(group.title, selectedGender)}
                  </h2>
                  {group.description && (
                    <p className="text-xs text-[#6E5A61] mt-1">
                      {adaptCopyByGender(group.description, selectedGender)}
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  {group.fields.map((field) => {
                    if (field.conditional) {
                      const triggerVal = values[field.conditional.fieldKey];
                      if (triggerVal !== field.conditional.equals) {
                        return null;
                      }
                    }

                    const isRequired =
                      field.required ||
                      Boolean(field.conditional?.requiredWhenShown);
                    const err = fieldErrors[field.key];

                    return (
                      <div
                        key={field.key}
                        id={`field-container-${field.key}`}
                        className="space-y-2 scroll-mt-28"
                      >
                        <div className="space-y-1">
                          <Label
                            htmlFor={field.key}
                            className="flex items-center justify-between gap-2 text-sm font-medium text-[#2B1F23]"
                          >
                            <span>
                              {adaptCopyByGender(field.label, selectedGender)}
                            </span>
                            {isRequired ? (
                              <span className="inline-flex items-center rounded-full border border-[#EAD4DF] bg-[#F8EEF3] px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-[#873954]">
                                Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-[#EFE6E0] bg-[#FAF6F3] px-2.5 py-0.5 text-[10px] font-normal text-[#96838A]">
                                Optional
                              </span>
                            )}
                          </Label>
                          {field.helpText && (
                            <p className="text-xs text-[#7A686E] leading-relaxed">
                              {adaptCopyByGender(
                                field.helpText,
                                selectedGender
                              )}
                            </p>
                          )}
                        </div>

                        {renderFieldInput(field)}

                        {err &&
                          field.type !== "repeatableRows" &&
                          field.type !== "photoUpload" && (
                            <p
                              id={`${field.key}-error`}
                              role="alert"
                              aria-live="polite"
                              className="text-xs text-[#B91C1C]"
                            >
                              {err}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Page Validation Notice */}
          {Object.keys(fieldErrors).length > 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-2xl border border-[#F5C2C7] bg-[#FFF5F6] px-5 py-3.5 text-xs text-[#9E2A3A]"
            >
              Please check the highlighted detail above before continuing.
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void handleBackPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Page
              </Button>
            ) : (
              <div />
            )}

            <Button type="submit" size="lg" className="ml-auto">
              {currentStep === totalSteps - 1 ? (
                <>
                  Review Magazine
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}

      {/* Subtle Floating Editorial Toast */}
      {editorialToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full sm:w-auto rounded-2xl border border-[#EFE6E0] bg-white/95 backdrop-blur-md p-4 shadow-[0_16px_45px_-12px_rgba(31,22,25,0.18)] flex items-start gap-3.5 animate-editorial-in"
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
              editorialToast.tone === "warning"
                ? "border-[#F5C2C7] bg-[#FFF5F6] text-[#9E2A3A]"
                : "border-[#EAD4DF] bg-[#FDF8FA] text-[#9E4765]"
            )}
          >
            {editorialToast.tone === "progress" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {editorialToast.tone === "warning" && (
              <AlertCircle className="h-4 w-4" />
            )}
            {editorialToast.tone === "default" && (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="font-serif text-sm font-medium text-[#1F1619]">
              {editorialToast.title}
            </p>
            <p className="text-xs text-[#6E5A61] mt-0.5 leading-relaxed">
              {editorialToast.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditorialToast(null)}
            className="text-[#A39197] hover:text-[#1F1619] transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
