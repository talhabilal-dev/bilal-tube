import { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  commentIdParamSchema,
  videoIdParamSchema,
  tweetIdParamSchema,
} from "../schema/like.schema.js";

type ToggleVideoLikeRequest = AppRequest<{ videoId: string }, unknown>;

export const toggleVideoLike = async (
  req: ToggleVideoLikeRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const { videoId } = parsedParams.data;

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Video ID is required");
    }

    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({
        message: "Like removed successfully",
      });
    }
    const newLike = await Like.create({ video: videoId, likedBy: userId });
    return res.status(201).json({
      message: "Like added successfully",
      like: newLike,
    });
  } catch (error) {
    next(error);
  }
};

type ToggleCommentLikeRequest = AppRequest<{ commentId: string }, unknown>;

export const toggleCommentLike = async (
  req: ToggleCommentLikeRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = commentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid comment ID parameter");
    }

    const { commentId } = parsedParams.data;

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Comment ID is required");
    }

    const existingLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({
        message: "Like removed successfully",
      });
    }

    const newLike = await Like.create({ comment: commentId, likedBy: userId });
    return res.status(201).json({
      message: "Like added successfully",
      like: newLike,
    });
  } catch (error) {
    next(error);
  }
};

type ToggleTweetLikeRequest = AppRequest<{ tweetId: string }, unknown>;

export const toggleTweetLike = async (
  req: ToggleTweetLikeRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = tweetIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid tweet ID parameter");
    }

    const { tweetId } = parsedParams.data;

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Tweet ID is required");
    }

    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({
        message: "Like removed successfully",
      });
    }

    const newLike = await Like.create({ tweet: tweetId, likedBy: userId });
    return res.status(201).json({
      message: "Like added successfully",
      like: newLike,
    });
  } catch (error) {
    next(error);
  }
};

type GetLikedVideosRequest = AppRequest<{}, unknown>;

export const getLikedVideos = async (
  req: GetLikedVideosRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }
    const likedVideos = await Like.find({
      likedBy: userId,
      video: { $exists: true },
    })
      .populate("video", "title description thumbnail videoFile createdAt")
      .select("-likedBy -comment -tweet");

    if (!likedVideos || likedVideos.length === 0) {
      return res.status(404).json({
        message: "No liked videos found",
      });
    }

    res.status(200).json({
      message: "Liked videos fetched successfully",
      videos: likedVideos,
    });
  } catch (error) {
    next(error);
  }
};
