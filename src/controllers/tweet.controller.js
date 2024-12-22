import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import {Like} from "../models/like.model.js"; 
import {Comment} from "../models/comment.model.js";

export const createTweet = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(400, "Content is required!");
    }

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
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserTweets = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

    if (!userId) {
      throw new ApiError(400, "User ID is required.");
    }

    const currentPage = parseInt(page, 10);
    const perPage = parseInt(limit, 10);

    if (currentPage <= 0 || perPage <= 0) {
      throw new ApiError(400, "Page and limit must be positive integers.");
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortType.toLowerCase() === "asc" ? 1 : -1;

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
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error.",
    });
  }
};

export const updateTweet = async (req, res) => {
  try {
    const { content } = req.body;
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid tweet id!");
    }

    if (!content) {
      throw new ApiError(400, "Content is required!");
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
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTweet = async (req, res) => {
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
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
