import { Request, Response, NextFunction } from "express";
import {
  BadRequestError,
  NotFoundError,
} from "../utils/errors/AppError.js";
import { db } from "../database/kysely/databases.js";
import { sql } from "kysely";

export class CommunityController {
  /**
   * Create a new post
   */
  createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const { content, media_urls, post_type, sport_category, visibility } = req.body;

      if (!content && (!media_urls || media_urls.length === 0)) {
        return res.status(400).json({
          success: false,
          message: "Content or media_urls is required",
        });
      }

      const post = await db
        .insertInto("posts" as any)
        .values({
          affiliate_id: affiliateId,
          content: content || null,
          media_urls: media_urls || null,
          post_type: post_type || "TEXT",
          sport_category: sport_category || null,
          visibility: visibility || "PUBLIC",
          likes_count: 0,
          comments_count: 0,
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();

      return res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error: any) {
      console.error("Create post error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get personalized feed (posts from followed users + own posts)
   */
  getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      const posts = await sql`
        SELECT
          p.id, p.affiliate_id, p.content, p.media_urls, p.post_type,
          p.sport_category, p.visibility, p.likes_count, p.comments_count,
          p.created_at, p.updated_at,
          a.name as author_name, a."profilePicture" as author_profile_picture,
          CASE WHEN pl.affiliate_id IS NOT NULL THEN true ELSE false END as liked_by_me
        FROM posts p
        INNER JOIN affiliates a ON a.id = p.affiliate_id
        LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.affiliate_id = ${affiliateId}
        WHERE p.is_deleted = false
          AND a.deleted = false
          AND (
            p.affiliate_id = ${affiliateId}
            OR p.affiliate_id IN (
              SELECT following_id FROM affiliate_follows WHERE follower_id = ${affiliateId}
            )
          )
          AND (
            p.visibility = 'PUBLIC'
            OR p.affiliate_id = ${affiliateId}
            OR (p.visibility = 'FOLLOWERS_ONLY' AND p.affiliate_id IN (
              SELECT following_id FROM affiliate_follows WHERE follower_id = ${affiliateId}
            ))
          )
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Feed fetched successfully",
        count: posts.rows.length,
        data: posts.rows,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get a single post by ID
   */
  getPostById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      const post = await sql`
        SELECT
          p.id, p.affiliate_id, p.content, p.media_urls, p.post_type,
          p.sport_category, p.visibility, p.likes_count, p.comments_count,
          p.created_at, p.updated_at,
          a.name as author_name, a."profilePicture" as author_profile_picture,
          CASE WHEN pl.affiliate_id IS NOT NULL THEN true ELSE false END as liked_by_me
        FROM posts p
        INNER JOIN affiliates a ON a.id = p.affiliate_id
        LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.affiliate_id = ${affiliateId}
        WHERE p.id = ${postId}
          AND p.is_deleted = false
          AND a.deleted = false
      `.execute(db);

      if (post.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Post fetched successfully",
        data: post.rows[0],
      });
    } catch (error: any) {
      console.error("Get post by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Soft delete a post (only author can delete)
   */
  deletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      // Verify post exists and user is the author
      const post = await db
        .selectFrom("posts" as any)
        .select(["id", "affiliate_id"])
        .where("id", "=", postId)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      if ((post as any).affiliate_id !== affiliateId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own posts",
        });
      }

      await db
        .updateTable("posts" as any)
        .set({ is_deleted: true, updated_at: new Date() })
        .where("id", "=", postId)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete post error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Like a post
   */
  likePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      // Verify post exists
      const post = await db
        .selectFrom("posts" as any)
        .select(["id"])
        .where("id", "=", postId)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // Check if already liked
      const existingLike = await db
        .selectFrom("post_likes" as any)
        .select(["post_id"])
        .where("post_id", "=", postId)
        .where("affiliate_id", "=", affiliateId)
        .executeTakeFirst();

      if (existingLike) {
        return res.status(409).json({
          success: false,
          message: "You have already liked this post",
        });
      }

      // Insert like and increment count
      await db
        .insertInto("post_likes" as any)
        .values({
          post_id: postId,
          affiliate_id: affiliateId,
          created_at: new Date(),
        })
        .execute();

      await sql`UPDATE posts SET likes_count = likes_count + 1 WHERE id = ${postId}`.execute(db);

      return res.status(201).json({
        success: true,
        message: "Post liked successfully",
      });
    } catch (error: any) {
      console.error("Like post error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Unlike a post
   */
  unlikePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      const result = await db
        .deleteFrom("post_likes" as any)
        .where("post_id", "=", postId)
        .where("affiliate_id", "=", affiliateId)
        .executeTakeFirst();

      if (Number(result?.numDeletedRows ?? 0) === 0) {
        return res.status(404).json({
          success: false,
          message: "Like not found",
        });
      }

      await sql`UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${postId}`.execute(db);

      return res.status(200).json({
        success: true,
        message: "Post unliked successfully",
      });
    } catch (error: any) {
      console.error("Unlike post error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get users who liked a post
   */
  getPostLikes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = Number(req.params.postId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      const likes = await db
        .selectFrom("post_likes as pl" as any)
        .innerJoin("affiliates as a", "a.id", "pl.affiliate_id" as any)
        .select([
          "a.id" as any,
          "a.name" as any,
          "a.profilePicture" as any,
          "pl.created_at" as any,
        ])
        .where("pl.post_id" as any, "=", postId)
        .where("a.deleted", "=", false)
        .orderBy("pl.created_at" as any, "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Post likes fetched successfully",
        count: likes.length,
        data: likes,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get post likes error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Add a comment to a post
   */
  addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const postId = Number(req.params.postId);
      const { content, parent_comment_id } = req.body;

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment content is required",
        });
      }

      // Verify post exists
      const post = await db
        .selectFrom("posts" as any)
        .select(["id"])
        .where("id", "=", postId)
        .where("is_deleted", "=", false)
        .executeTakeFirst();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // If replying to a comment, verify parent comment exists
      if (parent_comment_id) {
        const parentComment = await db
          .selectFrom("post_comments" as any)
          .select(["id"])
          .where("id", "=", Number(parent_comment_id))
          .where("post_id", "=", postId)
          .where("is_deleted", "=", false)
          .executeTakeFirst();

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            message: "Parent comment not found",
          });
        }
      }

      const comment = await db
        .insertInto("post_comments" as any)
        .values({
          post_id: postId,
          affiliate_id: affiliateId,
          content: content.trim(),
          parent_comment_id: parent_comment_id ? Number(parent_comment_id) : null,
          is_deleted: false,
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();

      await sql`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ${postId}`.execute(db);

      return res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: comment,
      });
    } catch (error: any) {
      console.error("Add comment error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get comments for a post (with 1-level nested replies)
   */
  getComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = Number(req.params.postId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      if (!postId || isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Valid post ID is required",
        });
      }

      // Get top-level comments
      const comments = await sql`
        SELECT
          c.id, c.post_id, c.affiliate_id, c.content, c.parent_comment_id,
          c.created_at,
          a.name as author_name, a."profilePicture" as author_profile_picture
        FROM post_comments c
        INNER JOIN affiliates a ON a.id = c.affiliate_id
        WHERE c.post_id = ${postId}
          AND c.is_deleted = false
          AND c.parent_comment_id IS NULL
          AND a.deleted = false
        ORDER BY c.created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      // Get replies for these comments (1 level deep)
      const commentIds = comments.rows.map((c: any) => c.id);
      let replies: any[] = [];

      if (commentIds.length > 0) {
        const repliesResult = await sql`
          SELECT
            c.id, c.post_id, c.affiliate_id, c.content, c.parent_comment_id,
            c.created_at,
            a.name as author_name, a."profilePicture" as author_profile_picture
          FROM post_comments c
          INNER JOIN affiliates a ON a.id = c.affiliate_id
          WHERE c.parent_comment_id = ANY(${commentIds}::int[])
            AND c.is_deleted = false
            AND a.deleted = false
          ORDER BY c.created_at ASC
        `.execute(db);
        replies = repliesResult.rows;
      }

      // Nest replies under parent comments
      const commentsWithReplies = comments.rows.map((comment: any) => ({
        ...comment,
        replies: replies.filter((r: any) => r.parent_comment_id === comment.id),
      }));

      return res.status(200).json({
        success: true,
        message: "Comments fetched successfully",
        count: commentsWithReplies.length,
        data: commentsWithReplies,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get comments error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Delete a comment (only comment author or post author can delete)
   */
  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const commentId = Number(req.params.commentId);

      if (!commentId || isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          message: "Valid comment ID is required",
        });
      }

      // Get comment with post info
      const comment = await sql`
        SELECT c.id, c.affiliate_id, c.post_id, p.affiliate_id as post_author_id
        FROM post_comments c
        INNER JOIN posts p ON p.id = c.post_id
        WHERE c.id = ${commentId} AND c.is_deleted = false
      `.execute(db);

      if (comment.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      const commentData = comment.rows[0] as any;

      // Only comment author or post author can delete
      if (commentData.affiliate_id !== affiliateId && commentData.post_author_id !== affiliateId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own comments or comments on your posts",
        });
      }

      await db
        .updateTable("post_comments" as any)
        .set({ is_deleted: true })
        .where("id", "=", commentId)
        .execute();

      await sql`UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ${commentData.post_id}`.execute(db);

      return res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete comment error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Report content (post or comment)
   */
  reportContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const { post_id, comment_id, reason, description } = req.body;

      if (!post_id && !comment_id) {
        return res.status(400).json({
          success: false,
          message: "Either post_id or comment_id is required",
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Reason is required",
        });
      }

      const validReasons = ["SPAM", "INAPPROPRIATE", "HARASSMENT", "FAKE", "OTHER"];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({
          success: false,
          message: `Reason must be one of: ${validReasons.join(", ")}`,
        });
      }

      const report = await db
        .insertInto("post_reports" as any)
        .values({
          post_id: post_id ? Number(post_id) : null,
          comment_id: comment_id ? Number(comment_id) : null,
          reported_by: affiliateId,
          reason,
          description: description || null,
          status: "PENDING",
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();

      return res.status(201).json({
        success: true,
        message: "Content reported successfully",
        data: report,
      });
    } catch (error: any) {
      console.error("Report content error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get public feed (popular recent public posts, no auth required)
   */
  getPublicFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      const posts = await sql`
        SELECT
          p.id, p.affiliate_id, p.content, p.media_urls, p.post_type,
          p.sport_category, p.visibility, p.likes_count, p.comments_count,
          p.created_at, p.updated_at,
          a.name as author_name, a."profilePicture" as author_profile_picture
        FROM posts p
        INNER JOIN affiliates a ON a.id = p.affiliate_id
        WHERE p.is_deleted = false
          AND p.visibility = 'PUBLIC'
          AND a.deleted = false
          AND p.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY p.likes_count DESC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Public feed fetched successfully",
        count: posts.rows.length,
        data: posts.rows,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get public feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}
