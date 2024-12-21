import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";

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

    const commentsAggregate = Comment.aggregate([
      { $match: { video: videoId } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: parseInt(limit) }],
          total: [{ $count: "total" }],
        },
      },
    ]);

    const [comments, totalResult] = await Promise.all(commentsAggregate);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
      message: "Comments fetched successfully.",
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

export const addComment = async (req, res) => {
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
      video: videoId,
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
