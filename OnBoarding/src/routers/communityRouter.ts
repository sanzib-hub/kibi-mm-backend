import express from "express";
import { affiliateOnly } from "../middlewares/auth.js";
import { CommunityController } from "../controllers/CommunityController.js";

const communityRouter = express.Router();
const communityController = new CommunityController();

// Public feed (no auth required)
communityRouter.get("/feed/public", communityController.getPublicFeed);

// Public comments (no auth required)
communityRouter.get("/posts/:postId/comments", communityController.getComments);

// Protected routes (affiliate only)
communityRouter.post("/posts", affiliateOnly, communityController.createPost);
communityRouter.get("/feed", affiliateOnly, communityController.getFeed);
communityRouter.get("/posts/:postId", affiliateOnly, communityController.getPostById);
communityRouter.delete("/posts/:postId", affiliateOnly, communityController.deletePost);

// Likes
communityRouter.post("/posts/:postId/like", affiliateOnly, communityController.likePost);
communityRouter.delete("/posts/:postId/like", affiliateOnly, communityController.unlikePost);
communityRouter.get("/posts/:postId/likes", affiliateOnly, communityController.getPostLikes);

// Comments
communityRouter.post("/posts/:postId/comments", affiliateOnly, communityController.addComment);
communityRouter.delete("/comments/:commentId", affiliateOnly, communityController.deleteComment);

// Reports
communityRouter.post("/report", affiliateOnly, communityController.reportContent);

export default communityRouter;
