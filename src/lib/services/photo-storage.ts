import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { google } from "googleapis";
import { env } from "@/env";
import { PHOTO_UPLOAD_CONFIG } from "@/config/form";

export interface UploadSessionFileMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  origin?: string;
}

export interface UploadSessionResult {
  sessionId: string;
  uploadUrl: string;
  storageProvider: "local" | "drive";
  expiresAt: string;
}

export interface FinalizedPhotoMeta {
  storageProvider: "local" | "drive";
  storageFileId: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
}

export interface StoredPhotoInfo {
  storageFileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PhotoStorageAdapter {
  readonly providerName: "local" | "drive";
  createOrderFolder(orderId: string, label: string): Promise<string>;
  renameOrderFolder(driveFolderId: string, newLabel: string): Promise<void>;
  saveOrderManifest(driveFolderId: string, fileName: string, content: string): Promise<void>;
  getFolderUrl(orderId: string, driveFolderId?: string | null): Promise<string>;
  createUploadSession(
    orderId: string,
    fileMeta: UploadSessionFileMeta,
    driveFolderId?: string | null
  ): Promise<UploadSessionResult>;
  finalizeUpload(
    orderId: string,
    sessionId: string,
    storageFileId?: string
  ): Promise<FinalizedPhotoMeta>;
  listPhotos(orderId: string, driveFolderId?: string | null): Promise<StoredPhotoInfo[]>;
  getThumbnail(fileId: string, orderId?: string): Promise<{ buffer: Buffer; mimeType: string }>;
  getFile(fileId: string, orderId?: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }>;
  deleteFile(fileId: string, orderId?: string): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// 1. LOCAL DISK STORAGE ADAPTER (writes to ./.local-uploads)
// ============================================================================
interface LocalUploadSession {
  sessionId: string;
  orderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tempFilePath: string;
  finalFileId: string;
  createdAt: number;
}

const globalForStorage = globalThis as unknown as {
  localSessions: Map<string, LocalUploadSession> | undefined;
};

const localSessions =
  globalForStorage.localSessions ?? new Map<string, LocalUploadSession>();
globalForStorage.localSessions = localSessions;

export class LocalDiskStorage implements PhotoStorageAdapter {
  readonly providerName = "local" as const;
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(process.cwd(), ".local-uploads");
  }

  private getOrderDir(orderId: string): string {
    // Sanitize orderId to prevent path traversal
    const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(this.baseDir, safeOrderId);
  }

  async createOrderFolder(orderId: string, label: string): Promise<string> {
    const dir = this.getOrderDir(orderId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "_folder_meta.json"),
      JSON.stringify({ orderId, label, createdAt: new Date().toISOString() }, null, 2)
    );
    return `local-folder:${orderId}`;
  }

  async renameOrderFolder(driveFolderId: string, newLabel: string): Promise<void> {
    const orderId = driveFolderId.replace(/^local-folder:/, "");
    const dir = this.getOrderDir(orderId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "_folder_meta.json"),
      JSON.stringify({ orderId, label: newLabel, updatedAt: new Date().toISOString() }, null, 2)
    );
  }

  async saveOrderManifest(driveFolderId: string, fileName: string, content: string): Promise<void> {
    const orderId = driveFolderId.replace(/^local-folder:/, "");
    const dir = this.getOrderDir(orderId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), content, "utf-8");
  }

  async getFolderUrl(orderId: string): Promise<string> {
    return `${env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}#photos`;
  }

  async createUploadSession(
    orderId: string,
    fileMeta: UploadSessionFileMeta
  ): Promise<UploadSessionResult> {
    if (fileMeta.sizeBytes > PHOTO_UPLOAD_CONFIG.maxFileSizeBytes) {
      throw new Error(
        `File exceeds maximum size of ${PHOTO_UPLOAD_CONFIG.maxFileSizeMB} MB.`
      );
    }

    const orderDir = this.getOrderDir(orderId);
    await fs.mkdir(orderDir, { recursive: true });

    const sessionId = crypto.randomUUID();
    const ext = path.extname(fileMeta.fileName).toLowerCase() || ".jpg";
    const safeBase = path
      .basename(fileMeta.fileName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const finalFileId = `${Date.now()}-${ crypto.randomBytes(4).toString("hex") }-${safeBase}${ext}`;
    const tempFilePath = path.join(orderDir, `.part-${sessionId}`);

    // Create empty temp file for resumable chunk writes
    await fs.writeFile(tempFilePath, Buffer.alloc(0));

    localSessions.set(sessionId, {
      sessionId,
      orderId,
      fileName: fileMeta.fileName,
      mimeType: fileMeta.mimeType || "image/jpeg",
      sizeBytes: fileMeta.sizeBytes,
      tempFilePath,
      finalFileId,
      createdAt: Date.now(),
    });

    return {
      sessionId,
      uploadUrl: `/api/uploads/local-chunk?sessionId=${encodeURIComponent(sessionId)}`,
      storageProvider: "local",
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async appendChunk(sessionId: string, chunk: Buffer, offset?: number): Promise<{ receivedBytes: number }> {
    const session = localSessions.get(sessionId);
    if (!session) {
      throw new Error("Upload session expired or not found.");
    }

    if (offset !== undefined && offset === 0) {
      await fs.writeFile(session.tempFilePath, chunk);
    } else {
      await fs.appendFile(session.tempFilePath, chunk);
    }

    const stat = await fs.stat(session.tempFilePath);
    if (stat.size > PHOTO_UPLOAD_CONFIG.maxFileSizeBytes) {
      await fs.unlink(session.tempFilePath).catch(() => {});
      localSessions.delete(sessionId);
      throw new Error("Uploaded data exceeds maximum allowed file size.");
    }

    return { receivedBytes: stat.size };
  }

  async getSessionOffset(sessionId: string): Promise<number> {
    const session = localSessions.get(sessionId);
    if (!session) {
      throw new Error("Upload session not found.");
    }
    try {
      const stat = await fs.stat(session.tempFilePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  async finalizeUpload(
    orderId: string,
    sessionId: string
  ): Promise<FinalizedPhotoMeta> {
    const session = localSessions.get(sessionId);
    if (!session || session.orderId !== orderId) {
      throw new Error("Invalid or expired upload session.");
    }

    const orderDir = this.getOrderDir(orderId);
    const finalPath = path.join(orderDir, session.finalFileId);

    const stat = await fs.stat(session.tempFilePath);
    await fs.rename(session.tempFilePath, finalPath);
    localSessions.delete(sessionId);

    return {
      storageProvider: "local",
      storageFileId: session.finalFileId,
      originalName: session.fileName,
      mime: session.mimeType,
      sizeBytes: stat.size,
    };
  }

  async listPhotos(orderId: string): Promise<StoredPhotoInfo[]> {
    const orderDir = this.getOrderDir(orderId);
    try {
      const entries = await fs.readdir(orderDir);
      const result: StoredPhotoInfo[] = [];
      for (const name of entries) {
        if (name.startsWith(".") || name === "_folder_meta.json") continue;
        const stat = await fs.stat(path.join(orderDir, name));
        if (stat.isFile()) {
          result.push({
            storageFileId: name,
            name,
            mimeType: name.endsWith(".png")
              ? "image/png"
              : name.endsWith(".heic")
                ? "image/heic"
                : "image/jpeg",
            sizeBytes: stat.size,
          });
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  async getThumbnail(
    fileId: string,
    orderId?: string
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const file = await this.getFile(fileId, orderId);
    return { buffer: file.buffer, mimeType: file.mimeType };
  }

  async getFile(
    fileId: string,
    orderId?: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const safeFileId = path.basename(fileId);
    let filePath: string | null = null;

    if (orderId) {
      filePath = path.join(this.getOrderDir(orderId), safeFileId);
    } else {
      // Search order directories
      const dirs = await fs.readdir(this.baseDir).catch(() => []);
      for (const d of dirs) {
        const candidate = path.join(this.baseDir, d, safeFileId);
        try {
          await fs.access(candidate);
          filePath = candidate;
          break;
        } catch {
          // continue
        }
      }
    }

    if (!filePath) {
      throw new Error(`Photo file not found: ${safeFileId}`);
    }

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(safeFileId).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".heic"
          ? "image/heic"
          : ext === ".heif"
            ? "image/heif"
            : "image/jpeg";

    return { buffer, mimeType, fileName: safeFileId };
  }

  async deleteFile(fileId: string, orderId?: string): Promise<void> {
    if (!orderId) return;
    const safeFileId = path.basename(fileId);
    const filePath = path.join(this.getOrderDir(orderId), safeFileId);
    await fs.unlink(filePath).catch(() => {});
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      return {
        ok: true,
        message: `LocalDiskStorage active and writable at ${this.baseDir}`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Failed to write to local disk",
      };
    }
  }
}

// ============================================================================
// 2. GOOGLE DRIVE STORAGE ADAPTER (OAuth2 Refresh Token + Resumable Uploads)
// ============================================================================
export class DriveStorage implements PhotoStorageAdapter {
  readonly providerName = "drive" as const;

  private getOAuthClient() {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  private getDriveClient() {
    return google.drive({ version: "v3", auth: this.getOAuthClient() });
  }

  async createOrderFolder(_orderId: string, label: string): Promise<string> {
    const drive = this.getDriveClient();
    const res = await drive.files.create({
      requestBody: {
        name: label,
        mimeType: "application/vnd.google-apps.folder",
        parents: env.DRIVE_ROOT_FOLDER_ID ? [env.DRIVE_ROOT_FOLDER_ID] : undefined,
      },
      fields: "id",
    });

    if (!res.data.id) {
      throw new Error("Google Drive did not return a folder ID.");
    }
    return res.data.id;
  }

  async renameOrderFolder(driveFolderId: string, newLabel: string): Promise<void> {
    if (!driveFolderId || driveFolderId.startsWith("local-folder:")) return;
    const drive = this.getDriveClient();
    await drive.files
      .update({
        fileId: driveFolderId,
        requestBody: { name: newLabel },
      })
      .catch(() => {});
  }

  async saveOrderManifest(
    driveFolderId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    if (!driveFolderId || driveFolderId.startsWith("local-folder:")) return;
    const drive = this.getDriveClient();
    await drive.files
      .create({
        requestBody: {
          name: fileName,
          mimeType: "text/markdown",
          parents: [driveFolderId],
        },
        media: {
          mimeType: "text/markdown",
          body: content,
        },
      })
      .catch(() => {});
  }

  async getFolderUrl(_orderId: string, driveFolderId?: string | null): Promise<string> {
    const folderId = driveFolderId || env.DRIVE_ROOT_FOLDER_ID || "";
    return `https://drive.google.com/drive/folders/${folderId}`;
  }

  async createUploadSession(
    orderId: string,
    fileMeta: UploadSessionFileMeta,
    driveFolderId?: string | null
  ): Promise<UploadSessionResult> {
    const auth = this.getOAuthClient();
    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error("Could not obtain Google Drive access token from refresh token.");
    }

    const parentFolder = driveFolderId || env.DRIVE_ROOT_FOLDER_ID;
    const metadata = {
      name: fileMeta.fileName,
      mimeType: fileMeta.mimeType,
      ...(parentFolder ? { parents: [parentFolder] } : {}),
      appProperties: {
        orderId,
      },
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": fileMeta.mimeType,
      "X-Upload-Content-Length": String(fileMeta.sizeBytes),
    };

    if (fileMeta.origin) {
      headers["Origin"] = fileMeta.origin;
    }

    const initRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size",
      {
        method: "POST",
        headers,
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Failed to initiate Google Drive resumable upload: ${errText}`);
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) {
      throw new Error("Google Drive resumable session did not return a Location header.");
    }

    return {
      sessionId: crypto.randomUUID(),
      uploadUrl,
      storageProvider: "drive",
      expiresAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    };
  }

  async finalizeUpload(
    _orderId: string,
    _sessionId: string,
    storageFileId?: string
  ): Promise<FinalizedPhotoMeta> {
    if (!storageFileId) {
      throw new Error("storageFileId is required to finalize a Google Drive upload.");
    }
    const drive = this.getDriveClient();
    const res = await drive.files.get({
      fileId: storageFileId,
      fields: "id,name,mimeType,size",
    });

    return {
      storageProvider: "drive",
      storageFileId: res.data.id ?? storageFileId,
      originalName: res.data.name ?? "photo.jpg",
      mime: res.data.mimeType ?? "image/jpeg",
      sizeBytes: Number(res.data.size ?? 0),
    };
  }

  async listPhotos(
    _orderId: string,
    driveFolderId?: string | null
  ): Promise<StoredPhotoInfo[]> {
    const folderId = driveFolderId || env.DRIVE_ROOT_FOLDER_ID;
    if (!folderId) return [];

    const drive = this.getDriveClient();
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size)",
      pageSize: 50,
    });

    return (res.data.files ?? []).map((f) => ({
      storageFileId: f.id ?? "",
      name: f.name ?? "",
      mimeType: f.mimeType ?? "image/jpeg",
      sizeBytes: Number(f.size ?? 0),
    }));
  }

  async getThumbnail(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const drive = this.getDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: "thumbnailLink,mimeType",
    });

    if (meta.data.thumbnailLink) {
      const auth = this.getOAuthClient();
      const tokenRes = await auth.getAccessToken();
      const thumbRes = await fetch(meta.data.thumbnailLink, {
        headers: tokenRes.token ? { Authorization: `Bearer ${tokenRes.token}` } : {},
      });
      if (thumbRes.ok) {
        const arr = await thumbRes.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: thumbRes.headers.get("content-type") ?? "image/jpeg",
        };
      }
    }

    const full = await this.getFile(fileId);
    return { buffer: full.buffer, mimeType: full.mimeType };
  }

  async getFile(
    fileId: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const drive = this.getDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: "name,mimeType",
    });

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: meta.data.mimeType ?? "image/jpeg",
      fileName: meta.data.name ?? `${fileId}.jpg`,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const drive = this.getDriveClient();
    await drive.files.delete({ fileId }).catch(() => {});
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const drive = this.getDriveClient();
      const folderId = env.DRIVE_ROOT_FOLDER_ID;
      if (!folderId) {
        return { ok: false, message: "DRIVE_ROOT_FOLDER_ID is not configured." };
      }
      const res = await drive.files.get({
        fileId: folderId,
        fields: "id,name",
      });
      return {
        ok: true,
        message: `Connected to Google Drive root folder "${res.data.name}" (${res.data.id})`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Google Drive test failed",
      };
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================
const localStorageInstance = new LocalDiskStorage();
const driveStorageInstance = new DriveStorage();

export function getPhotoStorage(): PhotoStorageAdapter {
  const isDriveConfigured = Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_DRIVE_REFRESH_TOKEN &&
      env.DRIVE_ROOT_FOLDER_ID
  );
  return isDriveConfigured ? driveStorageInstance : localStorageInstance;
}

export function getLocalDiskStorage(): LocalDiskStorage {
  return localStorageInstance;
}
