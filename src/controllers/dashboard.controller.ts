import mongoose, { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  channelIdParamSchema,
  channelVideosQuerySchema,
} from "../schema/dashboard.schema.js";

type GetChannelStatsRequest = AppRequest<{ channelId: string }, unknown>;

export const getChannelStats = async (
  req: GetChannelStatsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = channelIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid channel ID parameter");
    }

    const { channelId } = parsedParams.data;

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

type GetChannelVideosRequest = AppRequest<{ channelId: string }, unknown>;

export const getChannelVideos = async (
  req: GetChannelVideosRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = channelIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid channel ID parameter");
    }

    const parsedQuery = channelVideosQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const message = parsedQuery.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid query parameters");
    }

    const { channelId } = parsedParams.data;
    const { page, limit, sortBy, sortType } = parsedQuery.data;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid Channel ID format.");
    }

    const currentPage = page;
    const perPage = limit;

    const sortOptions: Record<string, 1 | -1> = {
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
