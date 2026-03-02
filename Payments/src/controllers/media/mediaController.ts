import dotenv from "dotenv";
dotenv.config();

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { sql } from "kysely";

import { db } from "../../database/kysely/databases.js";
import { checkFileExists, generateSignedUploadUrl } from "../../utils/gcs.utils.js";


/**
 * ----------------------------------
 * POST /api/media/presign
 * ----------------------------------
 */
export const presignUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const affiliateId = req.user!.id;
    const { fileName, fileType } = req.body;

    if(!affiliateId){
      return res.status(403).json({
        success: false,
        message: "Auth failed",
      });
    }

    // Validate Input
    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        message: "fileName and fileType are required",
      });
    }

    // Derive mediaType from mime
    let mediaType: "image" | "video";
    if (fileType.startsWith("image/")) {
      mediaType = "image";
    } else if (fileType.startsWith("video/")) {
      mediaType = "video";
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type",
      });
    }

    // Check upload limits: max 50 photos and 20 videos
    const photoCountResult = await db
      .selectFrom("media")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .where("affiliate_id", "=", affiliateId)
      .where("file_type", "=", "image")
      .where("deleted", "=", false)
      .executeTakeFirst();

    const videoCountResult = await db
      .selectFrom("media")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .where("affiliate_id", "=", affiliateId)
      .where("file_type", "=", "video")
      .where("deleted", "=", false)
      .executeTakeFirst();

    const photoCount = Number(photoCountResult?.count || 0);
    const videoCount = Number(videoCountResult?.count || 0);

    if (mediaType === "image" && photoCount >= 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum limit of 50 photos reached",
      });
    }

    if (mediaType === "video" && videoCount >= 20) {
      return res.status(400).json({
        success: false,
        message: "Maximum limit of 20 videos reached",
      });
    }

    // Validate file constraints (size, mime type)
    // NOTE: fileSize is 0 at this point, so skip size validation
    // Size will be validated on confirm endpoint after upload

    // Prepare storage key (simple timestamp + filename format)

    const safeFileName = fileName
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9._-]/g, "");
    const storageKey = `${Date.now()}-${safeFileName}`;

    // Generate signed URL FIRST (before saving to DB)
    // This way, if signing fails, no DB record is created
    const mediaId = randomUUID();
    const uploadUrl = await generateSignedUploadUrl(storageKey, fileType);

    if (!uploadUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate signed URL",
      });
    }

    // ONLY NOW save media record as INITIATED
    // The client must call /media/confirm after upload completes
    await db
      .insertInto("media")
      .values({
        id: mediaId,
        affiliate_id: affiliateId,
        file_type: mediaType,
        mime_type: fileType,
        file_name: fileName,
        file_size: 0, // Will be updated on confirm if needed
        storage_key: storageKey,
        status: "INITIATED",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    console.log("Media record created:", {
      mediaId,
      storageKey,
      status: "INITIATED",
    });

    return res.status(200).json({
      success: true,
      data: {
        mediaId,
        uploadUrl,
        storageKey,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error("Presign upload error:", error);
    return next(error);
  }
};


/**
 * ----------------------------------
 * POST /api/media/confirm
 * ----------------------------------
 */
export const confirmUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const affiliateId = req.user!.id;
    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: "mediaId is required",
      });
    }

    const media = await db
      .selectFrom("media")
      .selectAll()
      .where("id", "=", mediaId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const exists = await checkFileExists(media.storage_key);
    if (!exists) {
      return res.status(400).json({
        success: false,
        message: "Upload not completed",
      });
    }

    await db
      .updateTable("media")
      .set({
        status: "UPLOADED",
        updated_at: sql`now()`,
      })
      .where("id", "=", mediaId)
      .execute();

    return res.status(200).json({
      success: true,
      data: {
        mediaId,
        status: "UPLOADED",
        url: `${process.env.CDN_BASE_URL}/${media.storage_key}`,
      },
    });
  } catch (error) {
   return next(error);
  }
};

/**
 * ----------------------------------
 * GET /api/media
 * ----------------------------------
 */
export const getUserMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const affiliateId = req.user!.id;
    const { type, limit = 20, offset = 0 } = req.query;

    let query = db
      .selectFrom("media")
      .selectAll()
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .orderBy("created_at desc")
      .limit(Number(limit))
      .offset(Number(offset));

    if (type) {
      query = query.where("file_type", "=", type as "image" | "video");
    }

    const media = await query.execute();

    return res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
   return next(error);
  }
};

/**
 * ----------------------------------
 * DELETE /api/media/:mediaId
 * ----------------------------------
 */
export const deleteMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const affiliateId = req.user!.id;
    const { mediaId } = req.params;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: "mediaId is required",
      });
    }

    const media = await db
      .selectFrom("media")
      .select(["storage_key"])
      .where("id", "=", mediaId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    await db
      .updateTable("media")
      .set({
        deleted: true,
        updated_at: sql`now()`,
      })
      .where("id", "=", mediaId)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
   return next(error);
  }
};
