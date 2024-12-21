import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createTweet = asyncHandler(async (req, res) => {
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

  res.status(201).json(new ApiResponse("Tweet created successfully.", tweet));
});

export const getUserTweets = asyncHandler(async (req, res) => {
  const tweet = await Tweet.find({ owner: req.user._id });
  res
    .status(200)
    .json(new ApiResponse("User tweets fetched successfully.", tweet));
});

export const updateTweet = asyncHandler(async (req, res) => {
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

  res.status(200).json(new ApiResponse("Tweet updated successfully.", tweet));
});

export const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id!");
  }

  const tweet = await Tweet.findOneAndDelete({ _id: tweetId });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found!");
  }

  res.status(200).json(new ApiResponse("Tweet deleted successfully."));
});
