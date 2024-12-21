import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  deleteFileFromCloudinary,
  cloudinaryUpload,
} from "../utils/cloudinary.js";

export const getAllVideos = async (req, res) => {
  try {
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

    res.status(200).json({
      message: "Videos fetched successfully.",
      videos,
      pagination,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch videos.");
  }
};

export const publishAVideo = async (req, res) => {
  try {
    const { title, description, duration, isPublished } = req.body;

    if (!title || !description) {
      throw new ApiError(400, "Title and description are required!");
    }

    if (!req.files || !req.files.video || !req.files.thumbnail) {
      throw new ApiError(400, "Video and thumbnail files are required!");
    }

    const videolocalPath = req.files.video[0].path;
    const thumbnailLocalPath = req.files.thumbnail[0].path;

    const [video, thumbnail] = await Promise.all([
      cloudinaryUpload(videolocalPath),
      cloudinaryUpload(thumbnailLocalPath),
    ]);

    if (!video || !thumbnail) {
      throw new ApiError(500, "Error uploading the video or thumbnail!");
    }

    const newVideo = await Video.create({
      videoFile: { url: video.secure_url, public_id: video.public_id },
      thumbnail: { url: thumbnail.secure_url, public_id: thumbnail.public_id },
      title,
      description,
      duration,
      isPublished,
      owner: req.user.id,
    });

    res.status(201).json({
      message: "Video published successfully.",
      newVideo,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to publish the video.");
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      throw new ApiError(400, "VideoId is required!");
    }

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
    throw new ApiError(500, "Internal server error!");
  }
};

export const updateVideo = async (req, res) => {
  try {
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

      const deleteThumbnailResult = await deleteFileFromCloudinary(publicId);

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

    res.status(200).json({
      message: "Video updated successfully.",
      video: updatedVideo,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error!");
  }
};

export const deleteVideo = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "VideoId is required!");
  }

  try {
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

    if (cloudinaryResult[0].result !== "ok") {
      throw new ApiError(500, "Failed to delete video file from Cloudinary.");
    }

    await Video.findByIdAndDelete(videoId);

    res.status(200).json({
      message: "Video deleted successfully.",
    });
  } catch (error) {
    console.error("Error during Cloudinary deletion:", error);
    throw new ApiError(500, "Failed to delete video.");
  }
};

export const togglePublishStatus = async (req, res) => {
  try {
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

    res.status(200).json({
      message: "Video status updated successfully.",
      video: updatedVideo,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error!",
    });
  }
};

export const incrementVideoView = async (req, res) => {
  try {
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
  } catch (error) {
    throw new ApiError(500, "Internal server error!");
  }
};
