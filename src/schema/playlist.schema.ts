import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});

export const playlistIdParamSchema = z.object({
  playlistId: z.string().trim().min(1, "Playlist ID is required"),
});

export const playlistVideoParamsSchema = z.object({
  playlistId: z.string().trim().min(1, "Playlist ID is required"),
  videoId: z.string().trim().min(1, "Video ID is required"),
});

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1, "Playlist name is required"),
  description: z.string().trim().min(1, "Playlist description is required"),
});

export const updatePlaylistSchema = createPlaylistSchema;
