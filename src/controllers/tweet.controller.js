import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";

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
    const tweet = await Tweet.find({ owner: req.user._id });
    res.status(200).json({
      success: true,
      message: "Tweets fetched successfully.",
      tweet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
      throw new ApiError(400, "Invalid tweet id!");
    }

    const tweet = await Tweet.findOneAndDelete({ _id: tweetId });

    if (!tweet) {
      throw new ApiError(404, "Tweet not found!");
    }

    res.status(200).json({
      success: true,
      message: "Tweet deleted successfully.",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
