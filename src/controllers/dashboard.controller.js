import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";

export const getChannelStats = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    if (!channelId) {
      throw new ApiError(400, "Channel ID is required.");
    }

    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid Channel ID format.");
    }

    const totalVideos = await Video.find({ owner: channelId }).select("_id");

    const totalSubscribers = await Subscription.countDocuments({
      channel: channelId,
    });

    const totalViews = await Video.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    const totalLikes = await Like.countDocuments({
      video: { $in: totalVideos.map((video) => video._id) },
    });

    res.status(200).json({
      message: "Channel stats fetched successfully.",
      stats: {
        totalVideos: totalVideos.length,
        totalSubscribers,
        totalViews: totalViews.length ? totalViews[0].totalViews : 0,
        totalLikes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelVideos = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortType = "desc",
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(channelId) || !channelId) {
      throw new ApiError(400, "Invalid Channel ID format.");
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);

    const sortOptions = {
      [sortBy]: sortType === "desc" ? -1 : 1,
    };

    const totalVideos = await Video.countDocuments({ owner: channelId });

    if (totalVideos === 0) {
      throw new ApiError(404, "No videos found for the channel.");
    }

    const videos = await Video.find({ owner: channelId })
      .sort(sortOptions)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Channel videos fetched successfully.",
      data: videos,
      pagination: {
        totalDocs: totalVideos,
        totalPages: Math.ceil(totalVideos / perPage),
        currentPage,
        limit: perPage,
      },
    });
  } catch (error) {
    next(error);
  }
};
