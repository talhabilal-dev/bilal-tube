import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";

export const createPlaylist = async (req, res,next) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      throw new ApiError(400, "Name and description are required!");
    }

    const playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });

    if (!playlist) {
      throw new ApiError(500, "Error creating playlist!");
    }

    res.status(201).json({
      message: "Playlist created successfully.",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPlaylists = async (req, res,next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId format!");
    }

    const playlists = await Playlist.find({ owner: userId });

    if (playlists.length === 0) {
      throw new ApiError(404, "Playlists not found!");
    }

    res.status(200).json({
      message: "Playlists fetched successfully.",
      playlists,
    });
  } catch (error) {
next(error);
  }
};

export const getPlaylistById = async (req, res,next) => {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    res.status(200).json({
      message: "Playlist fetched successfully.",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

export const addVideoToPlaylist = async (req, res,next) => {
  try {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format!");
    }


    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    if (playlist.videos.includes(videoId)) {
      throw new ApiError(400, "Video is already in the playlist!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found!");
    }


    playlist.videos.push(videoId);
    await playlist.save();

    res.status(200).json({
      message: "Video added to playlist successfully.",
      playlist,
    });
  } catch (error) {
next(error);
  }
};

export const removeVideoFromPlaylist = async (req, res,next) => {
  try {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true }
    );

    if (!updatedPlaylist) {
      throw new ApiError(500, "Error removing video from playlist!");
    }

    res.status(200).json({
      message: "Video removed from playlist successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlaylist = async (req, res,next) => {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
      throw new ApiError(500, "Error deleting playlist!");
    }

    res.status(200).json({
      message: "Playlist deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlaylist = async (req, res,next) => {
  try {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId format!");
    }

    if (!name || !description) {
      throw new ApiError(400, "Name and description are required!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $set: { name, description } },
      { new: true }
    );

    if (!updatedPlaylist) {
      throw new ApiError(500, "Error updating playlist!");
    }

    res.status(200).json({
      message: "Playlist updated successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};
