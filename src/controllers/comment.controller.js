import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import {Tweet} from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @function getVideoComments
 * @description Fetches comments for a given video, with optional query string filters.
 * @param {Object} req - The request object containing the video ID.
 * @param {Object} res - The response object used to send the comment data.
 * @param {string} [req.query.page=1] - The page number.
 * @param {string} [req.query.limit=10] - The number of items per page.
 * @throws {ApiError} 400 - If the video ID is missing or invalid.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */
export const getVideoComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!videoId) {
      throw new ApiError(400, "Video ID is required.");
    }

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID format.");
    }

    const currentPage = parseInt(page, 10);
    const perPage = parseInt(limit, 10);

    if (currentPage <= 0 || perPage <= 0) {
      throw new ApiError(400, "Page and limit must be positive integers.");
    }


    const comments = await Comment.find({ contentId: videoId, contentType: "Video" })
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalComments = await Comment.countDocuments({ contentId: videoId, contentType: "Video" });

    res.status(200).json({
      message: "Comments fetched successfully.",
      data: comments,
      pagination: {
        page: currentPage,
        limit: perPage,
        total: totalComments,
        totalPages: Math.ceil(totalComments / perPage),
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * @function getTweetComments
 * @description Fetches comments for a given tweet, with optional query string filters.
 * @param {Object} req - The request object containing the tweet ID.
 * @param {Object} res - The response object used to send the comment data.
 * @param {string} [req.query.page=1] - The page number.
 * @param {string} [req.query.limit=10] - The number of items per page.
 * @throws {ApiError} 400 - If the tweet ID is missing or invalid.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */
export const getTweetComments = async (req, res) => {
  try {
    const { tweetId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!tweetId) {
      throw new ApiError(400, "Tweet ID is required.");
    }

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid Tweet ID format.");
    }

    const currentPage = parseInt(page, 10);
    const perPage = parseInt(limit, 10);

    if (currentPage <= 0 || perPage <= 0) {
      throw new ApiError(400, "Page and limit must be positive integers.");
    }


    const comments = await Comment.find({ contentId: tweetId , contentType: "Tweet"})
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalComments = await Comment.countDocuments({ contentId: tweetId , contentType: "Tweet"});

    res.status(200).json({
      message: "Comments fetched successfully.",
      data: comments,
      pagination: {
        page: currentPage,
        limit: perPage,
        total: totalComments,
        totalPages: Math.ceil(totalComments / perPage),
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * @function addCommentToVideo
 * @description Adds a comment to a video by its ID.
 * @param {Object} req - The request object containing the video ID and comment content.
 * @param {Object} res - The response object used to send the comment data.
 * @throws {ApiError} 400 - If the video ID or comment content is missing or invalid.
 * @throws {ApiError} 404 - If the video is not found.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */
export const addCommentToVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(videoId) || !content || !videoId) {
      throw new ApiError(400, "Video ID and comment content are required.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video not found.");
    }

    const newComment = await Comment.create({
      content,
      contentId: videoId,
      contentType: "Video",
      owner: userId,
    });

    if (!newComment) {
      throw new ApiError(500, "Failed to add the comment.");
    }

    res.status(201).json({
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * @function addCommentToTweet
 * @description Adds a comment to a tweet by its ID.
 * @param {Object} req - The request object containing the tweet ID and comment content.
 * @param {Object} res - The response object used to send the comment data.
 * @throws {ApiError} 400 - If the tweet ID or comment content is missing or invalid.
 * @throws {ApiError} 404 - If the tweet is not found.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */

export const addCommentToTweet = async (req, res) => {
  try {
    const { tweetId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId) || !content || !tweetId) {
      throw new ApiError(400, "Tweet ID and comment content are required.");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new ApiError(404, "Tweet not found.");
    }

    const newComment = await Comment.create({
      content,
      contentId: tweetId,
      contentType: "Tweet",
      owner: userId,
    });

    if (!newComment) {
      throw new ApiError(500, "Failed to add the comment.");
    }

    res.status(201).json({
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * Updates a comment by its ID.
 *
 * @param {Object} req - The request object containing the comment ID and content.
 * @param {Object} res - The response object used to send the updated comment data.
 * @param {Function} next - The next middleware function to call in case of an error.
 * @throws {ApiError} 400 - If the comment ID or content is missing or invalid.
 * @throws {ApiError} 404 - If the comment is not found.
 * @throws {ApiError} 403 - If the current user is not authorized to update the comment.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(commentId) || !commentId) {
      throw new ApiError(400, "Comment ID is required.");
    }

    if (!content) {
      throw new ApiError(400, "Comment content is required.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found.");
    }

    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to update this comment.");
    }

    comment.content = content;
    const updatedComment = await comment.save();

    if (!updatedComment) {
      throw new ApiError(500, "Failed to update the comment.");
    }

    res.status(200).json({
      message: "Comment updated successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * Deletes a comment by its ID.
 *
 * @param {Object} req - The request object containing the comment ID.
 * @param {Object} res - The response object used to send the status of the deletion.
 * @throws {ApiError} 400 - If the comment ID is missing or invalid.
 * @throws {ApiError} 404 - If the comment is not found.
 * @throws {ApiError} 403 - If the current user is not authorized to delete the comment.
 * @throws {ApiError} 500 - For any internal server error.
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId) || !commentId) {
      throw new ApiError(400, "Comment ID is required.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found.");
    }

    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to delete this comment.");
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
      message: "Comment deleted successfully.",
      commentId,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};
