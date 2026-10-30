"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  RefreshCw,
  Star,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import {
  PHOTO_UPLOAD_CONFIG,
  adaptCopyByGender,
  autoCapitalizeFirst,
  type UploadedPhotoItem,
} from "@/config/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UploadingFileState {
  tempId: string;
  file: File;
  fileName: string;
  sizeBytes: number;
  progress: number;
  status: "uploading" | "paused" | "error";
  errorMessage?: string;
  sessionId?: string;
  uploadUrl?: string;
  storageProvider?: "local" | "drive";
  uploadedBytes: number;
  localPreviewUrl?: string;
}

interface PhotoUploaderProps {
  draftToken: string;
  photos: UploadedPhotoItem[];
  onChange: (nextPhotos: UploadedPhotoItem[]) => void;
  errorMessage?: string;
  gender?: string;
  onDraftCreated?: (token: string, reference: string) => void;
  category?: "solo" | "shared";
  minPhotos?: number;
  maxPhotos?: number;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB chunks for resumable upload

async function createClientPreviewUrl(file: File): Promise<string | undefined> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
    try {
      const heic2anyModule = await import("heic2any");
      const heic2any = heic2anyModule.default;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.7,
      });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch {
      return undefined;
    }
  }
  return URL.createObjectURL(file);
}

export function PhotoUploader({
  draftToken,
  photos,
  onChange,
  errorMessage,
  gender = "Female",
  onDraftCreated,
  category = "solo",
  minPhotos,
  maxPhotos,
}: PhotoUploaderProps) {
  const isSolo = category === "solo";
  const minRequired =
    minPhotos ??
    (isSolo
      ? PHOTO_UPLOAD_CONFIG.soloMinFiles
      : PHOTO_UPLOAD_CONFIG.sharedMinFiles);
  const maxAllowed =
    maxPhotos ??
    (isSolo
      ? PHOTO_UPLOAD_CONFIG.soloMaxFiles
      : PHOTO_UPLOAD_CONFIG.sharedMaxFiles);

  const [queue, setQueue] = useState<UploadingFileState[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<UploadedPhotoItem[]>(photos);
  photosRef.current = photos;
  const draftTokenRef = useRef(draftToken);
  draftTokenRef.current = draftToken;
  const onDraftCreatedRef = useRef(onDraftCreated);
  onDraftCreatedRef.current = onDraftCreated;

  const updatePhotos = useCallback(
    (updater: (prev: UploadedPhotoItem[]) => UploadedPhotoItem[]) => {
      const next = updater(photosRef.current);
      photosRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  const uploadSingleFile = useCallback(
    async (item: UploadingFileState) => {
      setQueue((prev) =>
        prev.map((q) =>
          q.tempId === item.tempId
            ? { ...q, status: "uploading", errorMessage: undefined }
            : q
        )
      );

      try {
        let sessionId = item.sessionId;
        let uploadUrl = item.uploadUrl;
        let storageProvider = item.storageProvider;
        let startByte = item.uploadedBytes || 0;

        // 1. Create resumable upload session if not already created
        if (!sessionId || !uploadUrl) {
          const sessionRes = await fetch("/api/uploads/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draftToken: draftTokenRef.current || undefined,
              fileName: item.file.name,
              mimeType: item.file.type || "image/jpeg",
              sizeBytes: item.file.size,
              category,
            }),
          });

          const sessionData = (await sessionRes.json()) as {
            session?: {
              sessionId: string;
              uploadUrl: string;
              storageProvider: "local" | "drive";
              draftToken?: string;
              reference?: string;
            };
            error?: { message?: string };
          };

          if (!sessionRes.ok || !sessionData.session) {
            throw new Error(
              sessionData.error?.message || "Could not start upload session."
            );
          }

          if (
            sessionData.session.draftToken &&
            sessionData.session.draftToken !== draftTokenRef.current
          ) {
            draftTokenRef.current = sessionData.session.draftToken;
            onDraftCreatedRef.current?.(
              sessionData.session.draftToken,
              sessionData.session.reference ?? ""
            );
          }

          sessionId = sessionData.session.sessionId;
          uploadUrl = sessionData.session.uploadUrl;
          storageProvider = sessionData.session.storageProvider;
          startByte = 0;

          setQueue((prev) =>
            prev.map((q) =>
              q.tempId === item.tempId
                ? { ...q, sessionId, uploadUrl, storageProvider }
                : q
            )
          );
        } else if (storageProvider === "local") {
          // Query server offset to resume interrupted upload
          const offsetRes = await fetch(uploadUrl);
          if (offsetRes.ok) {
            const offsetData = (await offsetRes.json()) as { offset?: number };
            if (typeof offsetData.offset === "number") {
              startByte = offsetData.offset;
            }
          }
        }

        // 2. Upload chunks with progress tracking
        const totalSize = item.file.size;
        let driveFileId: string | undefined;

        while (startByte < totalSize) {
          const endByte = Math.min(startByte + CHUNK_SIZE, totalSize);
          const chunkBlob = item.file.slice(startByte, endByte);

          const chunkRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": item.file.type || "application/octet-stream",
              "Content-Range": `bytes ${startByte}-${endByte - 1}/${totalSize}`,
            },
            body: chunkBlob,
          });

          // Google Drive returns 308 Resume Incomplete for intermediate chunks, and 200/201 on completion
          if (
            !chunkRes.ok &&
            chunkRes.status !== 308
          ) {
            const errJson = (await chunkRes.json().catch(() => ({}))) as {
              error?: { message?: string };
            };
            throw new Error(
              errJson.error?.message ||
                `Upload interrupted (HTTP ${chunkRes.status}). Tap Retry to resume.`
            );
          }

          if (storageProvider === "drive" && (chunkRes.status === 200 || chunkRes.status === 201)) {
            const driveData = (await chunkRes.json().catch(() => ({}))) as {
              id?: string;
            };
            driveFileId = driveData.id;
          }

          startByte = endByte;
          const progressPct = Math.round((startByte / totalSize) * 95);

          setQueue((prev) =>
            prev.map((q) =>
              q.tempId === item.tempId
                ? { ...q, uploadedBytes: startByte, progress: progressPct }
                : q
            )
          );
        }

        // 3. Finalize upload on server
        const finalRes = await fetch("/api/uploads/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftToken: draftTokenRef.current,
            sessionId,
            storageFileId: driveFileId,
            caption: "",
            category,
          }),
        });

        const finalData = (await finalRes.json()) as {
          photo?: UploadedPhotoItem;
          error?: { message?: string };
        };

        if (!finalRes.ok || !finalData.photo) {
          throw new Error(
            finalData.error?.message || "Failed to finalize photo upload."
          );
        }

        const finalizedPhoto: UploadedPhotoItem = {
          ...finalData.photo,
          category,
          previewUrl: item.localPreviewUrl || finalData.photo.previewUrl,
        };

        updatePhotos((prev) => [...prev, finalizedPhoto]);
        setQueue((prev) => prev.filter((q) => q.tempId !== item.tempId));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload failed. Please retry.";
        setQueue((prev) =>
          prev.map((q) =>
            q.tempId === item.tempId
              ? { ...q, status: "error", errorMessage: msg }
              : q
          )
        );
      }
    },
    [category, updatePhotos]
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList | File[]) => {
      setGlobalError(null);
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const currentTotal = photosRef.current.length + queue.length;
      if (currentTotal + incoming.length > maxAllowed) {
        setGlobalError(
          `You can upload a maximum of ${maxAllowed} ${isSolo ? "solo" : "shared"} photos. You currently have ${currentTotal}.`
        );
        return;
      }

      const validItems: UploadingFileState[] = [];

      for (const file of incoming) {
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        const allowedExts: readonly string[] =
          PHOTO_UPLOAD_CONFIG.acceptedExtensions;

        if (!allowedExts.includes(ext)) {
          setGlobalError(
            `"${file.name}" is not supported. Accepted formats: JPG, JPEG, PNG, HEIC, HEIF.`
          );
          continue;
        }

        if (file.size > PHOTO_UPLOAD_CONFIG.maxFileSizeBytes) {
          setGlobalError(
            `"${file.name}" exceeds the ${PHOTO_UPLOAD_CONFIG.maxFileSizeMB} MB size limit.`
          );
          continue;
        }

        const localPreviewUrl = await createClientPreviewUrl(file);
        validItems.push({
          tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          fileName: file.name,
          sizeBytes: file.size,
          progress: 5,
          status: "uploading",
          uploadedBytes: 0,
          localPreviewUrl,
        });
      }

      if (validItems.length === 0) return;

      setQueue((prev) => [...prev, ...validItems]);

      // Run uploads sequentially or in small batches to keep connection smooth on mobile
      for (const item of validItems) {
        await uploadSingleFile(item);
      }
    },
    [isSolo, maxAllowed, queue.length, uploadSingleFile]
  );

  const handleSetCover = async (photoId: string) => {
    if (!isSolo) return;
    updatePhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isCover: p.id === photoId,
      }))
    );

    if (draftTokenRef.current) {
      await fetch(`/api/uploads/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftToken: draftTokenRef.current, isCover: true }),
      }).catch(() => {});
    }
  };

  const handleCaptionChange = (photoId: string, caption: string) => {
    const capped = autoCapitalizeFirst(caption);
    updatePhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption: capped } : p))
    );
  };

  const handleCaptionBlur = async (photoId: string, caption: string) => {
    if (draftTokenRef.current) {
      await fetch(`/api/uploads/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftToken: draftTokenRef.current, caption }),
      }).catch(() => {});
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    const remaining = photosRef.current.filter((p) => p.id !== photoId);
    if (isSolo) {
      const firstRemaining = remaining[0];
      if (remaining.length > 0 && !remaining.some((p) => p.isCover) && firstRemaining) {
        remaining[0] = { ...firstRemaining, isCover: true };
      }
    }
    updatePhotos(() => remaining);

    if (draftTokenRef.current) {
      await fetch(
        `/api/uploads/${photoId}?draftToken=${encodeURIComponent(draftTokenRef.current)}`,
        { method: "DELETE" }
      ).catch(() => {});
    }
  };

  const count = photos.length;
  const meetsMinimum = count >= minRequired;

  return (
    <div className="space-y-6">
      {/* Live Counter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-xl font-normal text-[#1F1619]">
              {count} of {minRequired} minimum {isSolo ? "solo photos" : "shared photos"}
            </span>
            {meetsMinimum ? (
              <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready for layout
              </span>
            ) : (
              <span className="text-xs text-[#9E4765] font-medium">
                (Maximum {maxAllowed} photos)
              </span>
            )}
          </div>
          {!meetsMinimum && (
            <p className="text-xs text-[#7A686E]">
              {isSolo
                ? "Solo portraits and candid shots make the best cover and feature spreads"
                : "Photos together with family, partner, or friends for memory spreads"}
            </p>
          )}
        </div>

        <div className="w-full sm:w-48 rounded-full bg-[#EFE6E0] h-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              meetsMinimum ? "bg-[#15803D]" : "bg-[#9E4765]"
            )}
            style={{
              width: `${Math.min(100, Math.round((count / minRequired) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            void handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className={cn(
          "rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200",
          isDragging
            ? "border-[#9E4765] bg-[#FDF7FA]"
            : "border-[#E6DAD3] bg-[#FCF9F7]/60 hover:bg-white hover:border-[#C5A4B1]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              void handleFilesSelected(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F6EBF0] text-[#9E4765] mb-3.5">
          <Upload className="h-5 w-5" />
        </div>
        <p className="font-serif text-xl text-[#1F1619] mb-1">
          {isSolo
            ? adaptCopyByGender(
                "Drag and drop her solo photos here, or browse from your phone or computer",
                gender
              )
            : adaptCopyByGender(
                "Drag and drop shared photos of her with others here, or browse from your phone or computer",
                gender
              )}
        </p>
        <p className="text-xs text-[#7A686E] mb-5">
          {isSolo
            ? `Min ${minRequired}, Max ${maxAllowed} &bull; Accepts JPG, PNG, HEIC &bull; Up to ${PHOTO_UPLOAD_CONFIG.maxFileSizeMB} MB per photo`
            : `Min ${minRequired}, Max ${maxAllowed} &bull; Accepts JPG, PNG, HEIC &bull; Up to ${PHOTO_UPLOAD_CONFIG.maxFileSizeMB} MB per photo`}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={count >= maxAllowed}
        >
          Choose Photos
        </Button>
      </div>

      {/* Global / Validation Error */}
      {(globalError || errorMessage) && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 border border-[#F5C2C7] bg-[#FFF5F6] p-3.5 text-xs text-[#9E2A3A]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{globalError || errorMessage}</span>
        </div>
      )}

      {/* Active Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#7A686E]">
            Uploading ({queue.length})
          </p>
          {queue.map((item) => (
            <div
              key={item.tempId}
              className="flex items-center gap-3 border border-[#E3D4CC] bg-white p-3"
            >
              <div className="h-12 w-12 shrink-0 bg-[#F5ECE8] flex items-center justify-center overflow-hidden">
                {item.localPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.localPreviewUrl}
                    alt={item.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[#96838A]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#1F1619] truncate">
                    {item.fileName}
                  </span>
                  <span className="text-[#7A686E]">
                    {item.status === "error" ? "Interrupted" : `${item.progress}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#EFE6E1] overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      item.status === "error" ? "bg-[#B91C1C]" : "bg-[#9E4765]"
                    )}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                {item.errorMessage && (
                  <p className="text-[11px] text-[#B91C1C] mt-1">
                    {item.errorMessage}
                  </p>
                )}
              </div>
              {item.status === "error" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void uploadSingleFile(item)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Retry
                </Button>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.fileName}`}
                onClick={() =>
                  setQueue((prev) => prev.filter((q) => q.tempId !== item.tempId))
                }
                className="p-1.5 text-[#7A686E] hover:text-[#1F1619]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Photos Grid with Cover Selection & Inline Captions */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-[#7A686E]">
              {isSolo
                ? `Uploaded Solo Photos (${photos.length}) — Click any photo to mark it as the cover`
                : `Uploaded Shared Photos (${photos.length})`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={cn(
                  "group border bg-white transition-all flex flex-col",
                  isSolo && photo.isCover
                    ? "border-[#9E4765] ring-1 ring-[#9E4765]"
                    : "border-[#E3D4CC]"
                )}
              >
                <div
                  onClick={() => {
                    if (isSolo) void handleSetCover(photo.id);
                  }}
                  role={isSolo ? "button" : undefined}
                  tabIndex={isSolo ? 0 : undefined}
                  onKeyDown={
                    isSolo
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void handleSetCover(photo.id);
                          }
                        }
                      : undefined
                  }
                  aria-label={
                    isSolo
                      ? `Select ${photo.originalName} as magazine cover`
                      : photo.originalName
                  }
                  className={cn(
                    "relative aspect-[4/5] w-full bg-[#F5ECE8] overflow-hidden",
                    isSolo ? "cursor-pointer" : ""
                  )}
                >
                  {photo.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || photo.originalName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-xs text-[#7A686E]">
                      <ImageIcon className="h-7 w-7 mb-1.5 text-[#9E4765]" />
                      <span className="truncate max-w-full">{photo.originalName}</span>
                    </div>
                  )}

                  {/* Cover Badge / Button (Solo only) */}
                  {isSolo && (
                    <div className="absolute top-2.5 left-2.5">
                      {photo.isCover ? (
                        <span className="inline-flex items-center gap-1 bg-[#9E4765] text-white text-[11px] font-medium px-2.5 py-1 shadow-xs">
                          <Star className="h-3 w-3 fill-current" />
                          Cover Photo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-white/90 text-[#1F1619] text-[11px] font-medium px-2 py-0.5 opacity-90 group-hover:bg-[#9E4765] group-hover:text-white transition-colors">
                          Use as cover
                        </span>
                      )}
                    </div>
                  )}

                  {/* Delete Photo Button */}
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRemovePhoto(photo.id);
                    }}
                    className="absolute top-2.5 right-2.5 h-7 w-7 bg-white/90 text-[#1F1619] hover:bg-[#B91C1C] hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline Caption / Date Field */}
                <div className="p-2.5 border-t border-[#EFE6E1] bg-white">
                  <Input
                    type="text"
                    value={photo.caption}
                    maxLength={200}
                    placeholder="Caption or date (e.g. Zanzibar, Aug 2024)"
                    aria-label={`Caption or date for photo ${index + 1}`}
                    onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                    onBlur={(e) => void handleCaptionBlur(photo.id, e.target.value)}
                    className="h-8 text-xs px-2.5 border-[#E3D4CC]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
