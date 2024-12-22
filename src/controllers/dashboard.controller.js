import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @function getChannelStats
 * @description Fetches the total number of videos, subscribers, views, and likes for a given channel.
 * @param {Object} req - The request object containing the channel ID.
 * @param {Object} res - The response object used to send the channel stats.
 * @throws {ApiError} 400 - If the channel ID is missing or invalid.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */
export const getChannelStats = async (req, res) => {
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
    console.error("Error fetching channel stats:", error);
    res.status(500).json({
      message: "Internal server error!",
    });
  }
};

/**
 * @function getChannelVideos
 * @description Fetches videos for a specified channel with pagination and sorting options.
 * @param {Object} req - The request object containing channel ID and query parameters.
 * @param {Object} res - The response object used to send the video data.
 * @param {string} [req.query.page=1] - The page number for pagination.
 * @param {string} [req.query.limit=10] - The number of videos per page.
 * @param {string} [req.query.sortBy="createdAt"] - The field to sort the videos by.
 * @param {string} [req.query.sortType="desc"] - The sorting order: 'asc' or 'desc'.
 * @throws {ApiError} 400 - If the channel ID is invalid.
 * @throws {ApiError} 404 - If no videos are found for the channel.
 * @throws {ApiError} 500 - For any internal server error.
 * @returns {Promise<void>}
 */

export const getChannelVideos = async (req, res) => {
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
    throw new ApiError(500, "Internal server error.", error);
  }
};
