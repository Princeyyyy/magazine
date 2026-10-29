import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check your answers and try again.",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      },
      { status: 422 }
    );
  }

  console.error("Unexpected API error:", error);
  void import("./services/admin-notifier")
    .then(({ getAdminNotifier }) =>
      getAdminNotifier().notifyCriticalIssue({
        context: "Unhandled Server API Error",
        summary:
          error instanceof Error
            ? error.message
            : "Unexpected server exception",
        details: error instanceof Error ? error.stack : String(error),
      })
    )
    .catch(() => {});

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our end. Please try again in a moment.",
      },
    },
    { status: 500 }
  );
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
