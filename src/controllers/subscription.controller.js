import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";

export const toggleSubscription = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

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

export const getUserChannelSubscribers = async (req, res, next) => {
  try {
    const { channelId } = req.params;

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

    console.log(subscribers);

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

export const getSubscribedChannels = async (req, res, next) => {
  try {
    const { subscriberId } = req.params;

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
