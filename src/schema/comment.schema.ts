import { z } from "zod";

export const videoIdParamSchema = z.object({
  videoId: z.string().trim().min(1, "Video ID is required"),
});

export const tweetIdParamSchema = z.object({
  tweetId: z.string().trim().min(1, "Tweet ID is required"),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().trim().min(1, "Comment ID is required"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment content is required."),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment content is required."),
});
