import { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import type { AppRequest } from "../types/request.js";
import {
  createTweetSchema,
  getUserTweetsQuerySchema,
  updateTweetSchema,
} from "../schema/tweet.schema.js";

type CreateTweetRequest = AppRequest<{}, unknown>;

export const createTweet = async (
  req: CreateTweetRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = createTweetSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid tweet payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const { content } = parsedBody.data;

    const tweet = await Tweet.create({
      content,
      owner: req.user._id,
    });

    if (!tweet) {
      throw new ApiError(500, "Error creating tweet!");
    }

    res.status(201).json({
      success: true,
      message: "Tweet created successfully.",
      tweet,
    });
  } catch (error) {
    next(error);
  }
};

type GetUserTweetsRequest = AppRequest<{ userId: string }, unknown>;

export const getUserTweets = async (
  req: GetUserTweetsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const parsedQuery = getUserTweetsQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      const message = parsedQuery.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid tweets query params");
    }

    const { page, limit, sortBy, sortType } = parsedQuery.data;

    if (!userId) {
      throw new ApiError(400, "User ID is required.");
    }

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid User ID format.");
    }

    const currentPage = page;
    const perPage = limit;

    if (currentPage <= 0 || perPage <= 0) {
      throw new ApiError(400, "Page and limit must be positive integers.");
    }

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortType === "asc" ? 1 : -1,
    };

    const tweets = await Tweet.find({ owner: userId })
      .sort(sortOptions)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalTweets = await Tweet.countDocuments({ owner: userId });

    res.status(200).json({
      message: "User tweets fetched successfully.",
      data: tweets,
      pagination: {
        page: currentPage,
        limit: perPage,
        total: totalTweets,
        totalPages: Math.ceil(totalTweets / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

type UpdateTweetRequest = AppRequest<{ tweetId: string }, unknown>;

export const updateTweet = async (
  req: UpdateTweetRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = updateTweetSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid tweet payload");
    }

    const { content } = parsedBody.data;
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid tweet id!");
    }

    const tweet = await Tweet.findOneAndUpdate(
      { _id: tweetId },
      { $set: { content } },
      { new: true }
    );

    if (!tweet) {
      throw new ApiError(404, "Tweet not found!");
    }

    res.status(200).json({
      success: true,
      message: "Tweet updated successfully.",
      tweet,
    });
  } catch (error) {
    next(error);
  }
};

type DeleteTweetRequest = AppRequest<{ tweetId: string }, unknown>;

export const deleteTweet = async (
  req: DeleteTweetRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid tweet ID!");
    }

    const tweet = await Tweet.findOneAndDelete({ _id: tweetId });

    if (!tweet) {
      throw new ApiError(404, "Tweet not found!");
    }

    const [likesResult, commentsResult] = await Promise.all([
      Like.deleteMany({ tweet: tweetId }),
      Comment.deleteMany({ tweet: tweetId }),
    ]);

    res.status(200).json({
      success: true,
      message: "Tweet and associated data deleted successfully.",
      details: {
        likesDeleted: likesResult.deletedCount,
        commentsDeleted: commentsResult.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
