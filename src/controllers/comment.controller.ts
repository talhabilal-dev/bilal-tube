import { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  commentIdParamSchema,
  createCommentSchema,
  paginationQuerySchema,
  tweetIdParamSchema,
  updateCommentSchema,
  videoIdParamSchema,
} from "../schema/comment.schema.js";

type GetVideoCommentsRequest = AppRequest<{ videoId: string }, unknown>;

export const getVideoComments = async (
  req: GetVideoCommentsRequest,
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

    const parsedQuery = paginationQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const message = parsedQuery.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid pagination query params");
    }

    const { videoId } = parsedParams.data;
    const { page, limit } = parsedQuery.data;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID format.");
    }

    const currentPage = page;
    const perPage = limit;

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

type GetTweetCommentsRequest = AppRequest<{ tweetId: string }, unknown>;

export const getTweetComments = async (
  req: GetTweetCommentsRequest,
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

    const parsedQuery = paginationQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const message = parsedQuery.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid pagination query params");
    }

    const { tweetId } = parsedParams.data;
    const { page, limit } = parsedQuery.data;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid Tweet ID format.");
    }

    const currentPage = page;
    const perPage = limit;

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

type AddCommentToVideoRequest = AppRequest<{ videoId: string }, unknown>;

export const addCommentToVideo = async (
  req: AddCommentToVideoRequest,
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

    const parsedBody = createCommentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid comment payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { videoId } = parsedParams.data;
    const { content } = parsedBody.data;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Video ID is required.");
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

type AddCommentToTweetRequest = AppRequest<{ tweetId: string }, unknown>;

export const addCommentToTweet = async (
  req: AddCommentToTweetRequest,
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

    const parsedBody = createCommentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid comment payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { tweetId } = parsedParams.data;
    const { content } = parsedBody.data;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Tweet ID is required.");
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

type UpdateCommentRequest = AppRequest<{ commentId: string }, unknown>;

export const updateComment = async (
  req: UpdateCommentRequest,
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

    const parsedBody = updateCommentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid comment payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { commentId } = parsedParams.data;
    const { content } = parsedBody.data;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Comment ID is required.");
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

type DeleteCommentRequest = AppRequest<{ commentId: string }, unknown>;

export const deleteComment = async (
  req: DeleteCommentRequest,
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

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { commentId } = parsedParams.data;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
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
