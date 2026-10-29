import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
} from "docx";
import { jsPDF } from "jspdf";
import { FORM_PAGES, adaptCopyByGender, type FieldConfig } from "@/config/form";

export interface EditorialExportOrder {
  id: string;
  reference: string;
  status: string;
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

export interface EditorialExportPhoto {
  id: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  caption: string;
  isCover: boolean;
  sortOrder: number;
  uploadedAt: string;
}

const HUMAN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_progress: "In Progress",
  awaiting_photos: "Awaiting Photos",
  in_design: "In Design",
  ready: "Ready for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function formatOrderStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return (
    HUMAN_STATUS_LABELS[status] ||
    status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function hasAnyAnswerInOrder(
  values: Record<string, unknown>,
  photos: EditorialExportPhoto[]
): boolean {
  if (photos.length > 0) return true;
  for (const page of FORM_PAGES) {
    for (const group of page.groups) {
      for (const field of group.fields) {
        if (field.key === "subject_gender" || field.type === "photoUpload") {
          continue;
        }
        const lines = getFormattedFieldLines(field, values);
        if (lines.length > 0) return true;
      }
    }
  }
  return false;
}

function getFormattedFieldLines(
  field: FieldConfig,
  values: Record<string, unknown>
): string[] {
  const raw = values[field.key];
  if (field.type === "repeatableRows") {
    const rows = Array.isArray(raw) ? (raw as Record<string, string>[]) : [];
    const filled = rows.filter((r) =>
      field.subFields.some((sf) => (r[sf.key] ?? "").trim().length > 0)
    );
    if (filled.length === 0) return [];
    return filled.map((row, idx) => {
      const joined = field.subFields
        .map((sf) => (row[sf.key] ?? "").trim())
        .filter(Boolean)
        .join(" — ");
      return `${idx + 1}. ${joined}`;
    });
  }

  if (field.type === "checkbox") {
    return raw === true ? ["Confirmed (Yes)"] : [];
  }

  const str =
    raw !== undefined && raw !== null && String(raw).trim() !== ""
      ? String(raw).trim()
      : "";
  return str ? [str] : [];
}

// ============================================================================
// 1. WORD (.DOCX) EDITORIAL EXPORT
// ============================================================================
export async function generateOrderWordBlob(
  order: EditorialExportOrder,
  values: Record<string, unknown>,
  photos: EditorialExportPhoto[],
  driveFolderUrl: string
): Promise<Blob> {
  const gender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  const starName = order.herName || "Featured Star";
  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];

  const children: (Paragraph | Table)[] = [];

  // Masthead Eyebrow
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: "CUSTOM MAGAZINE  •  BESPOKE EDITORIAL BRIEF",
          font: "Georgia",
          size: 18,
          color: "9E4765",
          bold: true,
        }),
      ],
    })
  );

  // Main Cover Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: starName,
          font: "Georgia",
          size: 56,
          color: "1F1619",
          bold: true,
        }),
      ],
    })
  );

  // Subtitle / Cover Headline
  if (order.coverHeadline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 320 },
        children: [
          new TextRun({
            text: `“${order.coverHeadline}”`,
            font: "Georgia",
            italics: true,
            size: 26,
            color: "6E5A61",
          }),
        ],
      })
    );
  }

  // Metadata Summary Table
  const metaRows: [string, string][] = [
    ["Order Reference", order.reference],
    ["Order Status", formatOrderStatusLabel(order.status)],
    [
      "Featured Star",
      `${starName}${order.herNickname ? ` (${order.herNickname})` : ""} — ${gender}`,
    ],
    [
      "Birthday & Age Turning",
      `${order.birthdayDate || "—"}${order.ageTurning ? ` (Turning ${order.ageTurning})` : ""}`,
    ],
    ["Colour Direction", order.colourTheme || "—"],
    [
      "Ordered By",
      `${order.customerName || "—"} (${order.relationship || "Loved one"})`,
    ],
    ["Customer Email", order.email || "—"],
    ["Customer Phone", order.phoneE164 || "—"],
    [
      "Photos Uploaded",
      photos.length > 0
        ? `${photos.length} ${photos.length === 1 ? "Photo" : "Photos"}`
        : "No photos uploaded yet",
    ],
    ...(driveFolderUrl
      ? ([["Google Drive Folder Link", driveFolderUrl]] as [string, string][])
      : []),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows.map(
        ([label, val]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                shading: { fill: "FCF9F7", type: ShadingType.CLEAR, color: "auto" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 80, after: 80 },
                    children: [
                      new TextRun({
                        text: label,
                        font: "Georgia",
                        bold: true,
                        size: 20,
                        color: "7A2E48",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 66, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "EFE6E0" },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 80, after: 80 },
                    children: [
                      new TextRun({
                        text: val,
                        font: "Georgia",
                        size: 20,
                        color: "1F1619",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
    })
  );

  // Page Break after Cover Sheet
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Sections 1 to 9
  for (const page of FORM_PAGES) {
    const pageTitle = adaptCopyByGender(page.title, gender);
    const pageSubtitle = adaptCopyByGender(page.subtitle, gender);

    if (page.id === "photos") {
      const fallbackLink =
        typeof values["photo_link_fallback"] === "string"
          ? values["photo_link_fallback"].trim()
          : "";
      if (photos.length === 0 && !driveFolderUrl && !fallbackLink) {
        continue;
      }

      children.push(
        new Paragraph({
          spacing: { before: 320, after: 60 },
          children: [
            new TextRun({
              text: `CHAPTER ${page.pageNumber}  —  ${pageSubtitle.toUpperCase()}`,
              font: "Georgia",
              size: 18,
              bold: true,
              color: "9E4765",
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "E3D4CC" },
          },
          children: [
            new TextRun({
              text: pageTitle,
              font: "Georgia",
              size: 34,
              bold: true,
              color: "1F1619",
            }),
          ],
        })
      );

      if (driveFolderUrl) {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Google Drive Folder Link: ",
                font: "Georgia",
                bold: true,
                size: 21,
                color: "1F1619",
              }),
              new TextRun({
                text: driveFolderUrl,
                font: "Georgia",
                size: 21,
                color: "9E4765",
              }),
            ],
          })
        );
      }

      if (fallbackLink) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 120 },
            children: [
              new TextRun({
                text: "Shared Photo Link Fallback: ",
                font: "Georgia",
                bold: true,
                size: 21,
                color: "1F1619",
              }),
              new TextRun({
                text: fallbackLink,
                font: "Georgia",
                size: 21,
                color: "9E4765",
              }),
            ],
          })
        );
      }

      if (coverPhoto) {
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `Selected Cover Photo: ${coverPhoto.originalName}${coverPhoto.caption ? ` — “${coverPhoto.caption}”` : ""}`,
                font: "Georgia",
                bold: true,
                italics: true,
                size: 21,
                color: "7A2E48",
              }),
            ],
          })
        );
      }

      if (photos.length > 0) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["#", "File Name", "Role", "Customer Caption"].map(
                  (hdr) =>
                    new TableCell({
                      shading: {
                        fill: "F6EBF0",
                        type: ShadingType.CLEAR,
                        color: "auto",
                      },
                      children: [
                        new Paragraph({
                          spacing: { before: 60, after: 60 },
                          children: [
                            new TextRun({
                              text: hdr,
                              font: "Georgia",
                              bold: true,
                              size: 19,
                              color: "7A2E48",
                            }),
                          ],
                        }),
                      ],
                    })
                ),
              }),
              ...photos.map(
                (p, idx) =>
                  new TableRow({
                    children: [
                      String(idx + 1).padStart(2, "0"),
                      p.originalName,
                      p.isCover ? "COVER" : "Interior",
                      p.caption || "(No caption)",
                    ].map(
                      (cellText) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              spacing: { before: 60, after: 60 },
                              children: [
                                new TextRun({
                                  text: cellText,
                                  font: "Georgia",
                                  size: 19,
                                  color: "1F1619",
                                }),
                              ],
                            }),
                          ],
                        })
                    ),
                  })
              ),
            ],
          })
        );
      }
      continue;
    }

    // Collect only groups that have at least one answered field
    const populatedGroups = page.groups
      .map((group) => {
        const answeredFields = group.fields
          .filter((field) => {
            if (field.type === "photoUpload") return false;
            if (field.conditional) {
              if (
                values[field.conditional.fieldKey] !== field.conditional.equals
              ) {
                return false;
              }
            }
            return getFormattedFieldLines(field, values).length > 0;
          })
          .map((field) => ({
            label: adaptCopyByGender(field.label, gender),
            lines: getFormattedFieldLines(field, values),
          }));
        return {
          title: adaptCopyByGender(group.title, gender),
          fields: answeredFields,
        };
      })
      .filter((g) => g.fields.length > 0);

    if (populatedGroups.length === 0) {
      continue;
    }

    children.push(
      new Paragraph({
        spacing: { before: 320, after: 60 },
        children: [
          new TextRun({
            text: `CHAPTER ${page.pageNumber}  —  ${pageSubtitle.toUpperCase()}`,
            font: "Georgia",
            size: 18,
            bold: true,
            color: "9E4765",
          }),
        ],
      })
    );

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "E3D4CC" },
        },
        children: [
          new TextRun({
            text: pageTitle,
            font: "Georgia",
            size: 34,
            bold: true,
            color: "1F1619",
          }),
        ],
      })
    );

    for (const group of populatedGroups) {
      children.push(
        new Paragraph({
          spacing: { before: 220, after: 100 },
          children: [
            new TextRun({
              text: group.title,
              font: "Georgia",
              bold: true,
              italics: true,
              size: 25,
              color: "7A2E48",
            }),
          ],
        })
      );

      for (const field of group.fields) {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: field.label,
                font: "Georgia",
                bold: true,
                size: 20,
                color: "5C4950",
              }),
            ],
          })
        );

        for (const line of field.lines) {
          children.push(
            new Paragraph({
              spacing: { after: 80 },
              indent: { left: 240 },
              children: [
                new TextRun({
                  text: line,
                  font: "Georgia",
                  size: 21,
                  color: "1F1619",
                }),
              ],
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    creator: "Custom Magazine Editorial Desk",
    title: `Custom Magazine Brief - ${order.reference} (${starName})`,
    description: `Editorial Order Brief for ${starName} (${order.reference})`,
    sections: [
      {
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// ============================================================================
// 2. PDF (.PDF) EDITORIAL EXPORT
// ============================================================================
export function generateOrderPdfBlob(
  order: EditorialExportOrder,
  values: Record<string, unknown>,
  photos: EditorialExportPhoto[],
  driveFolderUrl: string
): Blob {
  const gender =
    typeof values["subject_gender"] === "string" && values["subject_gender"]
      ? values["subject_gender"]
      : "Female";

  const starName = order.herName || "Featured Star";
  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let y = 56;

  const drawPageBackgroundAndHeader = (isFirstPage: boolean) => {
    // Soft editorial cream page background
    doc.setFillColor(252, 249, 247);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Top rose accent bar
    doc.setFillColor(158, 71, 101);
    doc.rect(0, 0, pageWidth, 6, "F");

    if (!isFirstPage) {
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(140, 122, 128);
      doc.text(
        `Custom Magazine Editorial Brief  •  ${order.reference} (${starName})`,
        marginX,
        32
      );
      doc.setDrawColor(235, 224, 216);
      doc.setLineWidth(0.5);
      doc.line(marginX, 40, pageWidth - marginX, 40);
      y = 62;
    }
  };

  const ensureSpace = (neededPt: number) => {
    if (y + neededPt > pageHeight - 52) {
      doc.addPage();
      drawPageBackgroundAndHeader(false);
    }
  };

  drawPageBackgroundAndHeader(true);

  // Masthead Header
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(158, 71, 101);
  doc.text("CUSTOM MAGAZINE  •  BESPOKE EDITORIAL BRIEF", marginX, y);
  y += 26;

  doc.setFont("times", "normal");
  doc.setFontSize(28);
  doc.setTextColor(31, 22, 25);
  doc.text(starName, marginX, y);
  y += 18;

  if (order.coverHeadline) {
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(110, 90, 97);
    const headlineLines = doc.splitTextToSize(
      `“${order.coverHeadline}”`,
      contentWidth
    ) as string[];
    doc.text(headlineLines, marginX, y);
    y += headlineLines.length * 16 + 8;
  } else {
    y += 8;
  }

  // Summary Box
  const summaryItems: [string, string][] = [
    ["Order Reference:", order.reference],
    ["Order Status:", formatOrderStatusLabel(order.status)],
    ["Ordered By:", `${order.customerName || "—"} (${order.relationship || "Loved one"})`],
    ["Customer Email:", order.email || "—"],
    ["Customer Phone:", order.phoneE164 || "—"],
    ["Birthday & Age:", `${order.birthdayDate || "—"} ${order.ageTurning ? `(Turning ${order.ageTurning})` : ""}`],
    ["Colour Theme:", order.colourTheme || "—"],
    [
      "Photos Uploaded:",
      photos.length > 0
        ? `${photos.length} ${photos.length === 1 ? "Photo" : "Photos"}`
        : "No photos uploaded yet",
    ],
    ...(driveFolderUrl
      ? ([["Google Drive Link:", driveFolderUrl]] as [string, string][])
      : []),
  ];

  const boxHeight = summaryItems.length * 14.5 + 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(231, 218, 210);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, y, contentWidth, boxHeight, 8, 8, "FD");

  let sy = y + 20;
  for (const [k, v] of summaryItems) {
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(122, 46, 72);
    doc.text(k, marginX + 14, sy);

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(31, 22, 25);
    const clipped = doc.splitTextToSize(v, contentWidth - 130) as string[];
    doc.text(clipped[0] || "—", marginX + 115, sy);
    sy += 14.5;
  }

  y += boxHeight + 18;

  // Iterate through all 9 sections
  for (const page of FORM_PAGES) {
    const pageTitle = adaptCopyByGender(page.title, gender);
    const pageSubtitle = adaptCopyByGender(page.subtitle, gender);

    if (page.id === "photos") {
      const fallbackLink =
        typeof values["photo_link_fallback"] === "string"
          ? values["photo_link_fallback"].trim()
          : "";
      if (photos.length === 0 && !driveFolderUrl && !fallbackLink) {
        continue;
      }

      ensureSpace(75);
      y += 10;

      // Section Banner
      doc.setFillColor(246, 235, 240);
      doc.roundedRect(marginX, y, contentWidth, 38, 6, 6, "F");

      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(158, 71, 101);
      doc.text(
        `Chapter ${page.pageNumber} — ${pageSubtitle}`,
        marginX + 12,
        y + 14
      );

      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(31, 22, 25);
      doc.text(pageTitle, marginX + 12, y + 30);

      y += 52;

      if (driveFolderUrl) {
        ensureSpace(40);
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(122, 46, 72);
        doc.text("Google Drive Order Folder:", marginX, y);
        y += 14;

        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(31, 22, 25);
        const urlLines = doc.splitTextToSize(
          driveFolderUrl,
          contentWidth
        ) as string[];
        doc.text(urlLines, marginX, y);
        y += urlLines.length * 13 + 8;
      }

      if (fallbackLink) {
        ensureSpace(36);
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(122, 46, 72);
        doc.text("Shared Photo Link Fallback:", marginX, y);
        y += 14;

        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(31, 22, 25);
        const fbLines = doc.splitTextToSize(
          fallbackLink,
          contentWidth
        ) as string[];
        doc.text(fbLines, marginX, y);
        y += fbLines.length * 13 + 8;
      }

      if (coverPhoto) {
        ensureSpace(24);
        doc.setFont("times", "bolditalic");
        doc.setFontSize(10);
        doc.setTextColor(158, 71, 101);
        doc.text(
          `Selected Cover Photo: ${coverPhoto.originalName}${coverPhoto.caption ? ` — "${coverPhoto.caption}"` : ""}`,
          marginX,
          y
        );
        y += 18;
      }

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]!;
        const line = `${String(i + 1).padStart(2, "0")}. ${p.originalName}${p.isCover ? " [COVER]" : ""} — ${p.caption || "(No caption)"}`;
        const wrapped = doc.splitTextToSize(line, contentWidth - 12) as string[];
        ensureSpace(wrapped.length * 13 + 6);
        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(45, 34, 38);
        doc.text(wrapped, marginX + 8, y);
        y += wrapped.length * 13 + 4;
      }
      continue;
    }

    const populatedGroups = page.groups
      .map((group) => {
        const answeredFields = group.fields
          .filter((field) => {
            if (field.type === "photoUpload") return false;
            if (field.conditional) {
              if (
                values[field.conditional.fieldKey] !== field.conditional.equals
              ) {
                return false;
              }
            }
            return getFormattedFieldLines(field, values).length > 0;
          })
          .map((field) => ({
            label: adaptCopyByGender(field.label, gender),
            lines: getFormattedFieldLines(field, values),
          }));
        return {
          title: adaptCopyByGender(group.title, gender),
          fields: answeredFields,
        };
      })
      .filter((g) => g.fields.length > 0);

    if (populatedGroups.length === 0) {
      continue;
    }

    ensureSpace(75);
    y += 10;

    // Section Banner
    doc.setFillColor(246, 235, 240);
    doc.roundedRect(marginX, y, contentWidth, 38, 6, 6, "F");

    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(158, 71, 101);
    doc.text(
      `Chapter ${page.pageNumber} — ${pageSubtitle}`,
      marginX + 12,
      y + 14
    );

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 22, 25);
    doc.text(pageTitle, marginX + 12, y + 30);

    y += 52;

    for (const group of populatedGroups) {
      ensureSpace(40);
      doc.setFont("times", "bolditalic");
      doc.setFontSize(12);
      doc.setTextColor(122, 46, 72);
      doc.text(group.title, marginX, y);
      y += 6;
      doc.setDrawColor(235, 224, 216);
      doc.setLineWidth(0.5);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 14;

      for (const field of group.fields) {
        const wrappedAnswers: string[] = [];
        for (const ans of field.lines) {
          const split = doc.splitTextToSize(ans, contentWidth - 14) as string[];
          wrappedAnswers.push(...split);
        }

        ensureSpace(16 + wrappedAnswers.length * 13 + 10);

        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(92, 73, 80);
        doc.text(field.label, marginX, y);
        y += 13;

        doc.setFont("times", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(31, 22, 25);
        doc.text(wrappedAnswers, marginX + 10, y);
        y += wrappedAnswers.length * 13.5 + 8;
      }
    }
  }

  // Add page numbers at bottom of every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(140, 122, 128);
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 24,
      { align: "right" }
    );
  }

  return doc.output("blob");
}
