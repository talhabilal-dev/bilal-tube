import { z } from "zod";

export const channelIdParamSchema = z.object({
  channelId: z.string().trim().min(1, "Channel ID is required"),
});

export const channelVideosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "views", "title", "duration"])
    .default("createdAt"),
  sortType: z.enum(["asc", "desc"]).default("desc"),
});
