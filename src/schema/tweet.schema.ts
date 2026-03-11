import { z } from "zod";

export const createTweetSchema = z.object({
  content: z
    .string({ error: "Content is required" })
    .trim()
    .min(1, "Content is required")
    .max(280, "Content must not exceed 280 characters"),
});

export const updateTweetSchema = z.object({
  content: z
    .string({ error: "Content is required" })
    .trim()
    .min(1, "Content is required")
    .max(280, "Content must not exceed 280 characters"),
});

export const getUserTweetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().trim().min(1).default("createdAt"),
  sortType: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTweetInput = z.infer<typeof createTweetSchema>;
export type UpdateTweetInput = z.infer<typeof updateTweetSchema>;
export type GetUserTweetsQueryInput = z.infer<typeof getUserTweetsQuerySchema>;
