import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import {
  cloudinaryUpload,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";

/**
 * Registers a new user by creating a user account with provided details.
 * Validates input fields and checks for existing users with the same
 * username or email. Uploads avatar and cover image to a cloud storage
 * service. Handles errors during registration and ensures cleanup of 
 * uploaded files in case of failure.
 *
 * @param {Object} req - Express request object, containing user details
 * and files for avatar and cover image.
 * @param {Object} res - Express response object, used to send the 
 * registration status and user details.
 * @param {Function} next - Express next middleware function, called in 
 * case of an error.
 *
 * @throws {ApiError} 400 - If any required field is missing or if a user
 * with the same username or email already exists.
 * @throws {ApiError} 500 - If there is an error uploading the avatar or 
 * cover image.
 */

export const registerUser = async (req, res, next) => {
  let avatar = null;
  let coverImage = null;

  try {
    const { username, email, fullName, password } = req.body;

    if (
      [username, email, fullName, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ApiError(
        400,
        `User with username ${username} or email ${email} already exists.`
      );
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required");
    }

    [avatar, coverImage] = await Promise.all([
      cloudinaryUpload(avatarLocalPath),
      cloudinaryUpload(coverImageLocalPath),
    ]);

    if (!avatar) {
      throw new ApiError(500, "Error uploading avatar");
    }

    if (!coverImage) {
      throw new ApiError(500, "Error uploading coverImage");
    }

    const newUser = await User.create({
      username,
      email,
      fullName,
      password,
      avatar: { url: avatar.secure_url, public_id: avatar.public_id },
      coverImage: {
        url: coverImage.secure_url,
        public_id: coverImage.public_id,
      },
    });

    const checkUser = await User.findById(newUser._id).select(
      "-password -refreshToken"
    );

    res.status(201).json({
      message: "User created successfully",
      user: checkUser,
    });
  } catch (error) {
    if (avatar?.public_id) {
      await deleteFileFromCloudinary(avatar.public_id);
    }
    if (coverImage?.public_id) {
      await deleteFileFromCloudinary(coverImage.public_id);
    }
    next(error);
  }
};

/**
 * Authenticates a user with the provided email and password, generating
 * access and refresh tokens if successful. Updates the user's record
 * with the new refresh token and sends both tokens as HTTP-only cookies
 * in the response.
 *
 * @param {Object} req - Express request object containing email and
 * password in the body.
 * @param {Object} res - Express response object used to send the login
 * status, tokens, and user information.
 *
 * @throws {ApiError} 400 - If email or password is missing.
 * @throws {ApiError} 401 - If the credentials are invalid.
 * @throws {ApiError} 500 - For any other errors during the login process.
 */

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await user.isValidPassword(password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: true,
    };

    const userWithoutPassword = user.toObject();

    delete userWithoutPassword.password;
    delete userWithoutPassword.refreshToken;

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "User logged in successfully",
        user: userWithoutPassword,
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs out the user by removing the refresh token from the user's
 * record and clearing the access and refresh tokens from the request.
 *
 * @param {Object} req - Express request object containing the user's
 * information in the user object.
 * @param {Object} res - Express response object used to send the logout
 * status.
 *
 * @throws {ApiError} 500 - For any errors during the logout process.
 */
export const logOutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        message: "User logged out successfully",
      });
  } catch (error) {
    return next(error);
  }
};

/**
 * Refreshes an access token using the provided refresh token. Checks if the
 * incoming refresh token matches the one stored in the user's record and
 * generates a new access and refresh token if the check passes.
 *
 * @param {Object} req - Express request object containing the refresh token
 * in the body or as a cookie.
 * @param {Object} res - Express response object used to send the refreshed
 * access and refresh tokens.
 *
 * @throws {ApiError} 401 - If the refresh token is invalid or unauthorized.
 * @throws {ApiError} 500 - For any other errors during the refresh process.
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is required");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const accessToken = generateAccessToken(user);

    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;

    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json({
        message: "Access token refreshed successfully",
        accessToken,
        refreshToken: newRefreshToken,
      });
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Unauthorized request",
    });
  }
};

/**
 * Changes the password of the logged in user by validating the old password
 * and updating the user's record with the new password.
 *
 * @param {Object} req - Express request object containing the old and new
 * passwords in the body.
 * @param {Object} res - Express response object used to send the change
 * password status.
 *
 * @throws {ApiError} 404 - If the user is not found.
 * @throws {ApiError} 401 - If the old password is invalid or unauthorized.
 * @throws {ApiError} 500 - For any other errors during the change password
 * process.
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, currentPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isValidPassword(oldPassword);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid old password");
    }

    user.password = currentPassword;
    user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal Server Error");
  }
};

/**
 * Returns the logged in user's details.
 *
 * @param {Object} req - Express request object containing the user's details.
 * @param {Object} res - Express response object used to send the user's
 * details.
 *
 * @throws {ApiError} 500 - For any other errors during the user fetch process.
 */
export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      message: "User fetched successfully.",
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal Server Error");
  }
};

/**
 * Updates the account details of the logged in user.
 *
 * @param {Object} req - Express request object containing the updated account
 * details in the body.
 * @param {Object} res - Express response object used to send the updated user's
 * details.
 *
 * @throws {ApiError} 400 - If any of the required fields are missing or empty.
 * @throws {ApiError} 500 - For any other errors during the account update
 * process.
 */
export const updateAccountDetails = async (req, res) => {
  try {
    const { username, fullName, email } = req.body;

    if (!username || !fullName || !email) {
      throw new ApiError(400, "All fields are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          username,
          email,
          fullName,
        },
      },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Account details updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to update account details.",
      error: error.message,
    });
  }
};

/**
 * Updates the avatar of the authenticated user.
 *
 * This function handles the upload of a new avatar to Cloudinary, deletes the
 * old avatar, and updates the user's avatar information in the database.
 *
 * @param {Object} req - Express request object, containing the user's file
 * path and user information.
 * @param {Object} res - Express response object used to send the status of
 * the avatar update.
 *
 * @throws {ApiError} 400 - If the avatar file is missing.
 * @throws {ApiError} 500 - For errors during avatar upload, deletion, or
 * database update process.
 */

export const updateAvatar = async (req, res) => {
  let newAvatar = null;

  try {
    if (!req.file?.path) {
      throw new ApiError(400, "Avatar is required!");
    }

    const avatarLocalPath = req.file.path;

    // Upload new avatar
    newAvatar = await cloudinaryUpload(avatarLocalPath);
    if (!newAvatar) {
      throw new ApiError(500, "Error uploading the avatar!");
    }

    // Delete old avatar
    const deleteAvatar = await deleteFileFromCloudinary(req.user.avatar.public_id);
    if (deleteAvatar?.result !== "ok") {
      throw new ApiError(500, "Error deleting the old avatar!");
    }

    // Update user record
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          avatar: {
            public_id: newAvatar.public_id,
            url: newAvatar.secure_url,
          },
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      message: "Avatar updated successfully.",
      user,
    });
  } catch (error) {
    // Clean up newly uploaded avatar if an error occurs
    if (newAvatar?.public_id) {
      await deleteFileFromCloudinary(newAvatar.public_id);
    }

    console.error(error);
    res.status(error.status || 500).json({
      message: error.message,
    });
  }
};

/**
 * Updates a user's cover image.
 *
 * @param {Object} req - Express request object, containing the user's file
 * path and user information.
 * @param {Object} res - Express response object used to send the status of
 * the cover image update.
 *
 * @throws {ApiError} 400 - If the cover image file is missing.
 * @throws {ApiError} 500 - For errors during cover image upload, deletion, or
 * database update process.
 */
export const updateCoverImage = async (req, res) => {
  let newCoverImage = null;

  try {
    if (!req.file?.path) {
      throw new ApiError(400, "CoverImage is required!");
    }

    const coverImageLocalPath = req.file.path;

    newCoverImage = await cloudinaryUpload(coverImageLocalPath);
    if (!newCoverImage) {
      throw new ApiError(500, "Error uploading the cover image!");
    }

    const deleteCoverImage = await deleteFileFromCloudinary(req.user.coverImage.public_id);
    if (deleteCoverImage?.result !== "ok") {
      throw new ApiError(500, "Error deleting the old cover image!");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          coverImage: {
            public_id: newCoverImage.public_id,
            url: newCoverImage.secure_url,
          },
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      message: "CoverImage updated successfully.",
      user,
    });
  } catch (error) {

    if (newCoverImage?.public_id) {
      await deleteFileFromCloudinary(newCoverImage.public_id);
    }

    res.status(error.status || 500).json({
      message: error.message,
    });
  }
};

/**
 * Gets a user's channel profile, including their full name, username, number
 * of subscribers, number of channels they subscribe to, whether the current
 * user is subscribed to them, and their avatar and cover image URLs.
 *
 * @param {Object} req - Express request object, containing the user's username.
 * @param {Object} res - Express response object used to send the channel profile.
 * @param {Function} next - Express next middleware function.
 *
 * @throws {ApiError} 400 - If the username is invalid.
 * @throws {ApiError} 404 - If the channel is not found.
 */
export const getUserChannelProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (typeof username !== "string" || !username.trim()) {
      throw new ApiError(400, "Valid username is required!");
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
          channelsSubscribedToCount: { $size: "$subscribedTo" },
          isSubscribed: {
            $cond: {
              if: { $and: [req.user, { $in: [req.user._id, "$subscribers.subscriber"] }] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    if (!channel.length) {
      throw new ApiError(404, "Channel not found!");
    }

    return res.status(200).json({
      message: "User fetched successfully.",
      channel: channel[0],
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @function getWatchHistory
 * @description Fetch the watch history of the currently logged in user
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<Response>} A promise resolving to the response object
 * @throws {ApiError} If an error occurs while fetching the watch history
 */
export const getWatchHistory = async (req, res) => {
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    return res.status(200).json({
      message: "Watch history fetched successfully.",
      watchHistory: user[0].watchHistory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error fetching watch history",
    });
  }
};
