import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getChannelStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required.");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID format.");
  }
  const totalVideos = await Video.countDocuments({ owner: channelId });

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const totalViews = await Video.aggregate([
    { $match: { owner: channelId } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ]);

  const totalLikes = await Like.countDocuments({ video: { $in: totalVideos } });

  res.status(200).json({
    message: "Channel stats fetched successfully.",
    stats: {
      totalVideos,
      totalSubscribers,
      totalViews: totalViews.length ? totalViews[0].totalViews : 0,
      totalLikes,
    },
  });
});

export const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!isValidObjectId(channelId) || !channelId) {
    throw new ApiError(400, "Channel ID is required.");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortType === "desc" ? -1 : 1 },
  };

  const videos = await Video.paginate({ owner: channelId }, options);

  if (videos.docs.length === 0) {
    throw new ApiError(404, "No videos found for the channel.");
  }

  res.status(200).json({
    message: "Channel videos fetched successfully.",
    data: videos.docs,
    pagination: {
      totalPages: videos.totalPages,
      currentPage: videos.page,
      totalDocs: videos.totalDocs,
      limit: videos.limit,
    },
  });
});

export { getChannelStats, getChannelVideos };
