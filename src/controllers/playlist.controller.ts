import mongoose, { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  createPlaylistSchema,
  playlistIdParamSchema,
  playlistVideoParamsSchema,
  updatePlaylistSchema,
  userIdParamSchema,
} from "../schema/playlist.schema.js";

type CreatePlaylistRequest = AppRequest<Record<string, string>, unknown>;

export const createPlaylist = async (
  req: CreatePlaylistRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = createPlaylistSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { name, description } = parsedBody.data;

    const playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });

    if (!playlist) {
      throw new ApiError(500, "Error creating playlist!");
    }

    res.status(201).json({
      message: "Playlist created successfully.",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

type GetUserPlaylistsRequest = AppRequest<{ userId: string }, unknown>;

export const getUserPlaylists = async (
  req: GetUserPlaylistsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = userIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid user ID parameter");
    }

    const { userId } = parsedParams.data;

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId format!");
    }

    const playlists = await Playlist.find({ owner: userId });

    if (playlists.length === 0) {
      throw new ApiError(404, "Playlists not found!");
    }

    res.status(200).json({
      message: "Playlists fetched successfully.",
      playlists,
    });
  } catch (error) {
    next(error);
  }
};

type GetPlaylistByIdRequest = AppRequest<{ playlistId: string }, unknown>;

export const getPlaylistById = async (
  req: GetPlaylistByIdRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = playlistIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist ID parameter");
    }

    const { playlistId } = parsedParams.data;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    res.status(200).json({
      message: "Playlist fetched successfully.",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

type AddVideoToPlaylistRequest = AppRequest<
  { playlistId: string; videoId: string },
  unknown
>;

export const addVideoToPlaylist = async (
  req: AddVideoToPlaylistRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = playlistVideoParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist/video parameters");
    }

    const { playlistId, videoId } = parsedParams.data;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    if (
      playlist.videos.some(
        (playlistVideoId) => String(playlistVideoId) === videoId
      )
    ) {
      throw new ApiError(400, "Video is already in the playlist!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found!");
    }

    playlist.videos.push(new mongoose.Types.ObjectId(videoId));
    await playlist.save();

    res.status(200).json({
      message: "Video added to playlist successfully.",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

type RemoveVideoFromPlaylistRequest = AppRequest<
  { playlistId: string; videoId: string },
  unknown
>;

export const removeVideoFromPlaylist = async (
  req: RemoveVideoFromPlaylistRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = playlistVideoParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist/video parameters");
    }

    const { playlistId, videoId } = parsedParams.data;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { returnDocument: "after" }
    );

    if (!updatedPlaylist) {
      throw new ApiError(500, "Error removing video from playlist!");
    }

    res.status(200).json({
      message: "Video removed from playlist successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

type DeletePlaylistRequest = AppRequest<{ playlistId: string }, unknown>;

export const deletePlaylist = async (
  req: DeletePlaylistRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = playlistIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist ID parameter");
    }

    const { playlistId } = parsedParams.data;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
      throw new ApiError(500, "Error deleting playlist!");
    }

    res.status(200).json({
      message: "Playlist deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

type UpdatePlaylistRequest = AppRequest<{ playlistId: string }, unknown>;

export const updatePlaylist = async (
  req: UpdatePlaylistRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = playlistIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist ID parameter");
    }

    const parsedBody = updatePlaylistSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid playlist payload");
    }

    const { playlistId } = parsedParams.data;
    const { name, description } = parsedBody.data;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $set: { name, description } },
      { returnDocument: "after" }
    );

    if (!updatedPlaylist) {
      throw new ApiError(500, "Error updating playlist!");
    }

    res.status(200).json({
      message: "Playlist updated successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};
