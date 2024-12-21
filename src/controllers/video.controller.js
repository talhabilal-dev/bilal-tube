import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryDelete, cloudinaryUpload } from "../utils/cloudinary.js";
import { extractPublicId } from "../utils/cloudinary.js";

export const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const currentPage = parseInt(page, 10);
  const perPage = parseInt(limit, 10);

  if (currentPage <= 0 || perPage <= 0) {
    throw new ApiError(400, "Page and limit must be positive integers!");
  }

  const filter = {};

  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    filter.owner = userId;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortType.toLowerCase() === "asc" ? 1 : -1;

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

  res
    .status(200)
    .json(
      new ApiResponse("Videos fetched successfully.", { videos, pagination })
    );
});

export const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, duration, isPublished } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required!");
  }

  if (!req.files || !req.files.video || !req.files.thumbnail) {
    throw new ApiError(400, "Video and thumbnail files are required!");
  }

  const videoFile = req.files.video[0].path;
  const thumbnailFile = req.files.thumbnail[0].path;

  try {
    const [videoUrl, thumbnailUrl] = await Promise.all([
      cloudinaryUpload(videoFile),
      cloudinaryUpload(thumbnailFile),
    ]);

    if (!videoUrl || !thumbnailUrl) {
      throw new ApiError(500, "Error uploading the video or thumbnail!");
    }

    const video = await Video.create({
      videoFile: videoUrl,
      thumbnail: thumbnailUrl,
      title,
      description,
      duration,
      isPublished,
      owner: req.user.id,
    });

    res
      .status(201)
      .json(new ApiResponse("Video uploaded successfully.", video));
  } catch (error) {
    console.error("Error publishing video:", error);
    throw new ApiError(500, "Internal server error!");
  }
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "VideoId is required!");
  }

  if (!mongoose.Types.ObjectId.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId format!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  res.status(200).json(new ApiResponse("Video fetched successfully.", video));
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId || !title || !description) {
    throw new ApiError(400, "VideoId, title, and description are required!");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  let thumbnailUrl = video.thumbnail;

  if (req.file && req.file.path) {
    thumbnailUrl = await cloudinaryUpload(req.file.path);
    if (!thumbnailUrl) {
      throw new ApiError(500, "Error updating thumbnail!");
    }

    const publicId = extractPublicId(video.thumbnail);
    const deleteThumbnailResult = await cloudinaryDelete(publicId);

    if (deleteThumbnailResult.result !== "ok") {
      throw new ApiError(
        500,
        "Error deleting the old thumbnail from Cloudinary!"
      );
    }
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
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse("Video fields updated successfully.", updatedVideo));
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "VideoId is required!");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const video = await Video.findOneAndDelete({ _id: videoId }).session(
      session
    );

    if (!video) {
      throw new ApiError(404, "Video does not exist!");
    }

    const publicId = extractPublicId(video.video);

    const cloudinaryResult = await cloudinaryDelete(publicId);

    if (cloudinaryResult.result !== "ok") {
      throw new ApiError(500, "Failed to delete video file from Cloudinary.");
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(new ApiResponse("Video deleted successfully."));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "VideoId is required!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video does not exist!");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { isPublished: !video.isPublished } },
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse("Video status changed successfully.", updatedVideo));
});

export const incrementVideoView = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required.");
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
});
