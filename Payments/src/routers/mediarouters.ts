import express from "express";
import {
  presignUpload,
  confirmUpload,
  getUserMedia,
  deleteMedia,
} from "../controllers/media/mediaController";
import { affiliateOnly } from "../middlewares/auth.js";

const mediaRouter = express.Router();

/**
 * Media Upload
 */

// 1️⃣ Get signed upload URL
mediaRouter.post("/presign",affiliateOnly, presignUpload);

// 2️⃣ Confirm upload completion
mediaRouter.post("/confirm",affiliateOnly, confirmUpload);

/**
 * Media Management
 */

// 3️⃣ List user media
mediaRouter.get("/", affiliateOnly,getUserMedia);

// 4️⃣ Delete media
mediaRouter.delete("/:mediaId", affiliateOnly,deleteMedia);

export { mediaRouter };
