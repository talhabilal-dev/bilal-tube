import mongoose, { isValidObjectId } from "mongoose";
import type { NextFunction, Response } from "express";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import type { AppRequest } from "../types/request.js";
import {
  deleteFileFromCloudinary,
  cloudinaryUpload,
} from "../utils/cloudinary.js";
import {
  getAllVideosQuerySchema,
  publishVideoSchema,
  updateVideoSchema,
  videoIdParamSchema,
} from "../schema/video.schema.js";

type GetAllVideosRequest = AppRequest<Record<string, string>, unknown>;

export const getAllVideos = async (
  req: GetAllVideosRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedQuery = getAllVideosQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const message = parsedQuery.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid videos query params");
    }

    const { page, limit, query, sortBy, sortType, userId } = parsedQuery.data;
    const currentPage = page;
    const perPage = limit;

    const filter: Record<string, unknown> = {};

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    if (userId) {
      filter.owner = userId;
    }

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortType === "asc" ? 1 : -1,
    };

    const videos = await Video.find(filter)
      .sort(sortOptions)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalVideos = await Video.countDocuments(filter);

    const pagination = {
      currentPage,
      perPage,
      totalPages: Math.ceil(totalVideos / perPage),
      totalVideos,
    };

    res.status(200).json({
      message: "Videos fetched successfully.",
      videos,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

type PublishAVideoRequest = AppRequest<Record<string, string>, unknown>;

export const publishAVideo = async (
  req: PublishAVideoRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = publishVideoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid publish payload");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const files = req.files;
    if (!files || Array.isArray(files)) {
      throw new ApiError(400, "Video and thumbnail files are required!");
    }

    const videoLocalPath = files.video?.[0]?.path;
    const thumbnailLocalPath = files.thumbnail?.[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
      throw new ApiError(400, "Video and thumbnail files are required!");
    }

    const { title, description, duration, isPublished } = parsedBody.data;

    let video, thumbnail;

    try {
      [video, thumbnail] = await Promise.all([
        cloudinaryUpload(videoLocalPath),
        cloudinaryUpload(thumbnailLocalPath),
      ]);

      if (!video || !thumbnail) {
        throw new Error("Error uploading the video or thumbnail");
      }
    } catch (uploadError) {
      throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    try {
      const newVideo = await Video.create({
        videoFile: { url: video.secure_url, public_id: video.public_id },
        thumbnail: {
          url: thumbnail.secure_url,
          public_id: thumbnail.public_id,
        },
        title,
        description,
        duration,
        isPublished: isPublished ?? true,
        owner: req.user._id,
      });

      return res.status(201).json({
        message: "Video published successfully.",
        newVideo,
      });
    } catch (dbError) {
      await Promise.all([
        deleteFileFromCloudinary(video?.public_id),
        deleteFileFromCloudinary(thumbnail?.public_id),
      ]);
      throw new ApiError(500, "Failed to save video details to the database.");
    }
  } catch (error) {
    next(error);
  }
};

type VideoIdRequest = AppRequest<{ videoId: string }, unknown>;

export const getVideoById = async (
  req: VideoIdRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const { videoId } = parsedParams.data;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid VideoId format!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found!");
    }

    res.status(200).json({
      message: "Video fetched successfully.",
      video,
    });
  } catch (error) {
    next(error);
  }
};

type UpdateVideoRequest = AppRequest<{ videoId: string }, unknown>;

export const updateVideo = async (
  req: UpdateVideoRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const parsedBody = updateVideoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid update payload");
    }

    const { videoId } = parsedParams.data;
    const { title, description } = parsedBody.data;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID!");
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video not found!");
    }

    let thumbnailUrl = video.thumbnail;

    if (req.file && req.file.path) {
      const uploadedThumbnail = await cloudinaryUpload(req.file.path);
      if (!uploadedThumbnail) {
        throw new ApiError(500, "Error uploading new thumbnail!");
      }

      const deleteThumbnailResult = await deleteFileFromCloudinary(
        video.thumbnail.public_id
      );

      if (!deleteThumbnailResult || deleteThumbnailResult.result !== "ok") {
        throw new ApiError(
          500,
          "Error deleting the old thumbnail from Cloudinary!"
        );
      }

      thumbnailUrl = {
        url: uploadedThumbnail.secure_url,
        public_id: uploadedThumbnail.public_id,
      };
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: thumbnailUrl,
        },
      },
      { returnDocument: "after" }
    );

    res.status(200).json({
      message: "Video updated successfully.",
      video: updatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (
  req: VideoIdRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const { videoId } = parsedParams.data;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video does not exist!");
    }

    if (!video.videoFile || !video.videoFile.public_id) {
      throw new ApiError(400, "Video file information is missing or invalid.");
    }

    const cloudinaryResult = await Promise.all([
      deleteFileFromCloudinary(video.videoFile.public_id, "video"),
      deleteFileFromCloudinary(video.thumbnail.public_id, "image"),
    ]);

    if (cloudinaryResult.some((result) => result.result !== "ok")) {
      throw new ApiError(500, "Error deleting video files from Cloudinary!");
    }

    const [likesResult, commentsResult] = await Promise.all([
      Like.deleteMany({ video: videoId }),
      Comment.deleteMany({ contentId: videoId, contentType: "Video" }),
    ]);

    await Video.findByIdAndDelete(videoId);

    res.status(200).json({
      message: "Video and associated data deleted successfully.",
      details: {
        likesDeleted: likesResult.deletedCount,
        commentsDeleted: commentsResult.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const togglePublishStatus = async (
  req: VideoIdRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const { videoId } = parsedParams.data;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video does not exist!");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $set: { isPublished: !video.isPublished } },
      { returnDocument: "after" }
    );

    res.status(200).json({
      message: "Video status updated successfully.",
      video: updatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

export const incrementVideoView = async (
  req: VideoIdRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = videoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      const message = parsedParams.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid video ID parameter");
    }

    const { videoId } = parsedParams.data;

    if (!videoId || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid or missing Video ID.");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found.");
    }

    video.views += 1;
    await video.save();

    res.status(200).json({
      message: "Video view count updated successfully.",
      views: video.views,
    });
  } catch (error) {
    next(error);
  }
};
