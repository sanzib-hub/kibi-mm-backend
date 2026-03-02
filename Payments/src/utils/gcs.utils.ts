import { Storage } from "@google-cloud/storage";

/**
 * Application Default Credentials (ADC)
 * - Cloud Run
 * - GCE
 * - Local via GOOGLE_APPLICATION_CREDENTIALS
 */
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME!;
const SIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Strict file rules (CRUCIAL)
 */
export type FileType = "image" | "video";
const ALLOWED_MIME_TYPES: Record<FileType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/quicktime"],
};
const MAX_FILE_SIZE: Record<FileType, number> = {
  image: 5 * 1024 * 1024,      // 5 MB
  video: 200 * 1024 * 1024,    // 200 MB
};

/**
 * Validate file type, mime type & size
 * MUST be called before presign
 */
export const validateFileConstraints = (
  fileType: FileType,
  mimeType: string,
  fileSize: number
): void => {
  if (!ALLOWED_MIME_TYPES[fileType]?.includes(mimeType)) {
    throw new Error(`Invalid mime type for ${fileType}`);
  }
  if (fileSize > MAX_FILE_SIZE[fileType]) {
    throw new Error(
      `${fileType} file size exceeds allowed limit`
    );
  }
};

/**
 * Generate signed upload URL (PUT) with proper headers configuration
 * CRITICAL: Use contentType option for proper signature
 */
export const generateSignedUploadUrl = async (
  storageKey: string,
  mimeType: string
): Promise<string> => {
  try {
    console.log(`Generating signed URL for: ${storageKey}, mimeType: ${mimeType}`);

    const [url] = await storage
      .bucket(BUCKET_NAME)
      .file(storageKey)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
        contentType: mimeType,
      });

    console.log(`Generated signed URL with Content-Type: ${mimeType}`);
    console.log(`URL: ${url}`);

    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};

/**
 * Check if file exists in bucket
 */
export const checkFileExists = async (
  storageKey: string
): Promise<boolean> => {
  try {
    const [exists] = await storage
      .bucket(BUCKET_NAME)
      .file(storageKey)
      .exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    throw error;
  }
};

/**
 * Delete file from bucket
 * Used when media is deleted or upload fails
 */
export const deleteFileFromGCS = async (
  storageKey: string
): Promise<void> => {
  try {
    await storage
      .bucket(BUCKET_NAME)
      .file(storageKey)
      .delete({ ignoreNotFound: true });
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw error;
  }
};

/**
 * Public/CDN URL generator
 * (bucket stays private, CDN or LB in front)
 */
export const getPublicMediaUrl = (
  storageKey: string
): string => {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${storageKey}`;
};
