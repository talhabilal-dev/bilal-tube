import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Toggles a like on a video.
 *
 * @function toggleVideoLike
 * @param {Object} req - The request object containing the video ID.
 * @param {Object} res - The response object used to send the status of the like toggle.
 * @throws {ApiError} 400 - If the video ID is missing or invalid.
 * @throws {ApiError} 404 - If the video is not found.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const toggleVideoLike = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId) || !videoId) {
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
    res.status(500).json({
      message: "An error occurred while toggling video like",
      error: error.message,
    });
  }
};

/**
 * Toggles a like on a comment.
 *
 * @function toggleCommentLike
 * @param {Object} req - The request object containing the comment ID.
 * @param {Object} res - The response object used to send the status of the like toggle.
 * @throws {ApiError} 400 - If the comment ID is missing or invalid.
 * @throws {ApiError} 404 - If the comment is not found.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const toggleCommentLike = async (req, res) => {
  try {
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
    res.status(500).json({
      message: "An error occurred while toggling comment like",
      error: error.message,
    });
  }
};

/**
 * Toggles a like on a tweet.
 *
 * @function toggleTweetLike
 * @param {Object} req - The request object containing the tweet ID.
 * @param {Object} res - The response object used to send the status of the like toggle.
 * @throws {ApiError} 400 - If the tweet ID is missing or invalid.
 * @throws {ApiError} 404 - If the tweet is not found.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const toggleTweetLike = async (req, res) => {
  try {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId) || !tweetId) {
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
    } else {
      const newLike = await Like.create({ tweet: tweetId, likedBy: userId });
      return res.status(201).json({
        message: "Like added successfully",
        like: newLike,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while toggling tweet like",
      error: error.message,
    });
  }
};

/**
 * @function getLikedVideos
 * @description Fetches all liked videos for the authenticated user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @throws {ApiError} 401 - If the user is not authenticated.
 * @throws {ApiError} 404 - If no liked videos are found.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const getLikedVideos = async (req, res) => {
  try {
    const userId = req.user._id;

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
    res.status(500).json({
      message: "An error occurred while fetching liked videos",
      error: error.message,
    });
  }
};
