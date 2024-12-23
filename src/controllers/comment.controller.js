import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";

export const getVideoComments = async (req, res, next) => {
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

    const comments = await Comment.find({
      contentId: videoId,
      contentType: "Video",
    })
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalComments = await Comment.countDocuments({
      contentId: videoId,
      contentType: "Video",
    });

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
    next(error);
  }
};

export const getTweetComments = async (req, res, next) => {
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

    const comments = await Comment.find({
      contentId: tweetId,
      contentType: "Tweet",
    })
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalComments = await Comment.countDocuments({
      contentId: tweetId,
      contentType: "Tweet",
    });

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
    next(error);
  }
};

export const addCommentToVideo = async (req, res, next) => {
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
    next(error);
  }
};

export const addCommentToTweet = async (req, res, next) => {
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
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
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
    next(error);
  }
};
export const deleteComment = async (req, res, next) => {
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
    next(error);
  }
};
