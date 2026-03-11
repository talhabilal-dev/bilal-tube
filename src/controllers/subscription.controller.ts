import mongoose, { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  channelIdParamSchema,
  subscriberIdParamSchema,
} from "../schema/subscription.schema.js";

type ToggleSubscriptionRequest = AppRequest<{ channelId: string }, unknown>;

export const toggleSubscription = async (
  req: ToggleSubscriptionRequest,
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

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const userId = String(req.user._id);

    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid Channel ID format.");
    }

    if (channelId === userId) {
      throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    let subscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (subscription) {
      await Subscription.deleteOne({ _id: subscription._id });
      return res.status(200).json({
        message: "Unsubscribed successfully",
      });
    } else {
      subscription = await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
      return res.status(201).json({
        message: "Subscribed successfully",
        subscription,
      });
    }
  } catch (error) {
    next(error);
  }
};

type GetUserChannelSubscribersRequest = AppRequest<
  { channelId: string },
  unknown
>;

export const getUserChannelSubscribers = async (
  req: GetUserChannelSubscribersRequest,
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

    const aggregationPipeline = [
      {
        $match: { channel: new mongoose.Types.ObjectId(channelId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriberDetails",
        },
      },
      {
        $unwind: "$subscriberDetails",
      },
      {
        $project: {
          subscriberId: "$subscriberDetails._id",
          subscriberName: "$subscriberDetails.fullName",
          subscriberEmail: "$subscriberDetails.email",
          subscribedAt: "$createdAt",
        },
      },
    ];

    const subscribers = await Subscription.aggregate(aggregationPipeline);

    if (subscribers.length === 0) {
      throw new ApiError(404, "No subscribers found");
    }

    res.status(200).json({
      message: "Subscribers fetched successfully",
      subscribers,
    });
  } catch (error) {
    next(error);
  }
};

type GetSubscribedChannelsRequest = AppRequest<
  { subscriberId: string },
  unknown
>;

export const getSubscribedChannels = async (
  req: GetSubscribedChannelsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = subscriberIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid subscriber ID parameter");
    }

    const { subscriberId } = parsedParams.data;

    if (!subscriberId || isValidObjectId(subscriberId) === false) {
      throw new ApiError(400, "Valid subscriber ID is required");
    }

    const aggregationPipeline = [
      { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channelDetails",
        },
      },
      { $unwind: "$channelDetails" },
      {
        $project: {
          channelId: "$channelDetails._id",
          channelName: "$channelDetails.fullName",
          subscribedAt: "$createdAt",
        },
      },
    ];

    const subscribedChannels =
      await Subscription.aggregate(aggregationPipeline);

    if (!subscribedChannels || subscribedChannels.length === 0) {
      throw new ApiError(404, "No subscribed channels found");
    }

    res.status(200).json({
      message: "Subscribed channels fetched successfully",
      channels: subscribedChannels,
    });
  } catch (error) {
    next(error);
  }
};
