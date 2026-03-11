import { z } from "zod";

const booleanFromInputSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const videoIdParamSchema = z.object({
  videoId: z.string().trim().min(1, "Video ID is required"),
});

export const getAllVideosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  query: z.string().trim().default(""),
  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "duration", "views"])
    .default("createdAt"),
  sortType: z.enum(["asc", "desc"]).default("desc"),
  userId: z.string().trim().min(1).optional(),
});

export const publishVideoSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  duration: z.coerce.number().positive("Duration must be greater than 0"),
  isPublished: booleanFromInputSchema.optional(),
});

export const updateVideoSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
});
