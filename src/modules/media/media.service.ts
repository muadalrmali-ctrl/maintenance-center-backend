import { db } from "../../db";
import { mediaAssets } from "../../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { env } from "../../config/env";

type CreateMediaInput = {
  entityType: string;
  entityId: number;
  fileUrl: string;
  fileType: string;
};

type UploadCaseMediaFileInput = {
  entityType: "case";
  entityId: number;
  mediaCategory: "post_repair" | "damaged_part" | "waiting_part";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  contentBase64: string;
};

type MediaAsset = {
  id: number;
  entityType: string;
  entityId: number;
  fileUrl: string;
  fileType: string;
  uploadedBy: number;
  createdAt: Date | null;
};

const MAX_UPLOAD_SIZE_BYTES: Record<"image" | "video" | "audio", number> = {
  image: 5 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
};

const ALLOWED_MIME_TYPES: Record<"image" | "video" | "audio", string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
  audio: ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm"],
};

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const sanitizeSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";

const getMediaKind = (mimeType: string): "image" | "video" | "audio" => {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  for (const [mediaKind, allowedMimeTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (allowedMimeTypes.includes(normalizedMimeType)) {
      return mediaKind as "image" | "video" | "audio";
    }
  }

  throw new Error("Unsupported file type. Please upload a supported image, video, or audio file.");
};

const decodeBase64 = (contentBase64: string) => {
  try {
    return Buffer.from(contentBase64, "base64");
  } catch {
    throw new Error("Uploaded file content is invalid.");
  }
};

const ensureSupabaseConfig = () => {
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured.");
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  if (!env.SUPABASE_STORAGE_BUCKET_CASE_MEDIA) {
    throw new Error("SUPABASE_STORAGE_BUCKET_CASE_MEDIA is not configured.");
  }
};

const buildStoragePath = (input: UploadCaseMediaFileInput) => {
  const now = new Date();
  const safeFileName = sanitizeSegment(input.fileName.replace(/\.[^.]+$/, ""));
  const extension = sanitizeSegment(input.fileName.split(".").pop() || input.mimeType.split("/").pop() || "bin");
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return [
    "cases",
    String(input.entityId),
    input.mediaCategory,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${uniqueSuffix}-${safeFileName}.${extension}`,
  ].join("/");
};

const encodeStoragePath = (value: string) =>
  trimSlashes(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

export const mediaService = {
  async uploadMedia(input: CreateMediaInput, uploadedBy: number): Promise<MediaAsset> {
    // Validate fileType
    const allowedTypes = ["image", "video", "audio", "pdf"];
    if (!allowedTypes.includes(input.fileType)) {
      throw new Error("Only image, video, audio, and pdf file types are allowed");
    }

    const newMedia = await db
      .insert(mediaAssets)
      .values({
        ...input,
        uploadedBy,
      })
      .returning();

    return newMedia[0];
  },

  async uploadCaseMediaFile(input: UploadCaseMediaFileInput, uploadedBy: number) {
    ensureSupabaseConfig();

    const mediaKind = getMediaKind(input.mimeType);
    const fileBuffer = decodeBase64(input.contentBase64);

    if (!fileBuffer.length) {
      throw new Error("Uploaded file is empty.");
    }

    const maxUploadSizeBytes = MAX_UPLOAD_SIZE_BYTES[mediaKind];

    if (fileBuffer.length > maxUploadSizeBytes || input.fileSizeBytes > maxUploadSizeBytes) {
      const maxUploadSizeMegabytes = Math.floor(maxUploadSizeBytes / (1024 * 1024));
      throw new Error(`File is too large. The maximum allowed size is ${maxUploadSizeMegabytes} MB.`);
    }

    const objectPath = buildStoragePath(input);
    const encodedBucket = encodeURIComponent(trimSlashes(env.SUPABASE_STORAGE_BUCKET_CASE_MEDIA));
    const encodedObjectPath = encodeStoragePath(objectPath);
    const supabaseBaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
    const uploadUrl = `${supabaseBaseUrl}/storage/v1/object/${encodedBucket}/${encodedObjectPath}`;
    const publicUrl = `${supabaseBaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedObjectPath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true",
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Supabase upload failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`
      );
    }

    const newMedia = await db
      .insert(mediaAssets)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        fileUrl: publicUrl,
        fileType: mediaKind,
        uploadedBy,
      })
      .returning();

    return {
      ...newMedia[0],
      publicUrl,
      mediaCategory: input.mediaCategory,
      mimeType: input.mimeType,
      fileSizeBytes: fileBuffer.length,
    };
  },

  async getMediaByEntity(entityType: string, entityId: number): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.entityType, entityType), eq(mediaAssets.entityId, entityId)))
      .orderBy(desc(mediaAssets.createdAt));
  },
};
