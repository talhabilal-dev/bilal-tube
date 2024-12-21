import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId) || !videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse("Like removed successfully"));
  }
  const newLike = await Like.create({ video: videoId, likedBy: userId });
  return res
    .status(201)
    .json(new ApiResponse("Like added successfully", newLike));
});

export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId) || !commentId) {
    throw new ApiError(400, "Comment ID is required");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse("Like removed successfully"));
  }

  const newLike = await Like.create({ comment: commentId, likedBy: userId });
  return res
    .status(201)
    .json(new ApiResponse("Like added successfully", newLike));
});

export const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId) || !tweetId) {
    throw new ApiError(400, "Tweet ID is required");
  }

  const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse("Like removed successfully"));
  } else {
    const newLike = await Like.create({ tweet: tweetId, likedBy: userId });
    return res
      .status(201)
      .json(new ApiResponse("Like added successfully", newLike));
  }
});

export const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }
  const likedVideos = await Like.find({
    likedBy: userId,
    video: { $exists: true },
  })
    .populate("video", "title description thumbnail createdAt")
    .select("-likedBy -comment -tweet");

  if (!likedVideos || likedVideos.length === 0) {
    return res.status(404).json(new ApiResponse("No liked videos found"));
  }

  res
    .status(200)
    .json(new ApiResponse("Liked videos fetched successfully", likedVideos));
});
