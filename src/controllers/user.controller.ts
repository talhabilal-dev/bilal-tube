import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import type { NextFunction, Request, Response } from "express";
import {
  changePasswordSchema,
  loginUserSchema,
  refreshAccessTokenSchema,
  registerUserSchema,
  updateAccountDetailsSchema,
} from "../schema/user.schema.js";
import {
  cloudinaryUpload,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";
import { ENV } from "../config/env.config.js";
import type { AppRequest } from "../types/request.js";

type UploadedAsset = {
  secure_url: string;
  public_id: string;
};

type RegisterRequest = AppRequest<{}, unknown>;

export const registerUser = async (
  req: RegisterRequest,
  res: Response,
  next: NextFunction
) => {
  let uploadedAvatar: UploadedAsset | null = null;
  let uploadedCoverImage: UploadedAsset | null = null;

  try {
    const parsedBody = registerUserSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid registration data");
    }

    const { username, email, fullName, password } = parsedBody.data;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ApiError(
        400,
        `User with username ${username} or email ${email} already exists.`
      );
    }

    const files = req.files as
      | {
          avatar?: Express.Multer.File[];
          coverImage?: Express.Multer.File[];
        }
      | undefined;

    const avatarLocalPath = files?.avatar?.[0]?.path;
    const coverImageLocalPath = files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required");
    }

    uploadedAvatar = await cloudinaryUpload(avatarLocalPath);

    if (!uploadedAvatar) {
      throw new ApiError(500, "Error uploading avatar");
    }

    if (coverImageLocalPath) {
      uploadedCoverImage = await cloudinaryUpload(coverImageLocalPath);

      if (!uploadedCoverImage) {
        throw new ApiError(500, "Error uploading coverImage");
      }
    }

    const newUser = await User.create({
      username,
      email,
      fullName,
      password,
      avatar: {
        url: uploadedAvatar.secure_url,
        public_id: uploadedAvatar.public_id,
      },
      coverImage: {
        url: uploadedCoverImage?.secure_url ?? uploadedAvatar.secure_url,
        public_id: uploadedCoverImage?.public_id ?? uploadedAvatar.public_id,
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
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return next(new ApiError(409, "User already exists"));
    }

    try {
      if (uploadedAvatar?.public_id) {
        await deleteFileFromCloudinary(uploadedAvatar.public_id);
      }
      if (
        uploadedCoverImage?.public_id &&
        uploadedCoverImage.public_id !== uploadedAvatar?.public_id
      ) {
        await deleteFileFromCloudinary(uploadedCoverImage.public_id);
      }
    } catch {
      // Do not swallow original registration error when cleanup fails.
    }

    next(error);
  }
};

type LoginRequest = AppRequest<{}, unknown>;

export const loginUser = async (
  req: LoginRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = loginUserSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid login data");
    }

    const { email, password } = parsedBody.data;

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

    const userObject = user.toObject();
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...safeUser
    } = userObject;

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "User logged in successfully",
        user: safeUser,
      });
  } catch (error) {
    next(error);
  }
};

type LogOutRequest = AppRequest;

export const logOutUser = async (
  req: LogOutRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const updatedUser = await User.findByIdAndUpdate(
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

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

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
    next(error);
  }
};

type RefreshAccessTokenRequest = AppRequest<{}, unknown>;

type RefreshTokenPayload = JwtPayload & {
  _id: string;
};

const isRefreshTokenPayload = (
  payload: string | JwtPayload
): payload is RefreshTokenPayload => {
  return typeof payload !== "string" && typeof payload._id === "string";
};

export const refreshAccessToken = async (
  req: RefreshAccessTokenRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = refreshAccessTokenSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid refresh token payload");
    }

    const incomingRefreshToken =
      req.cookies?.refreshToken || parsedBody.data.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is required");
    }

    if (!ENV.REFRESH_TOKEN_SECRET) {
      throw new ApiError(500, "Refresh token secret is not configured");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      ENV.REFRESH_TOKEN_SECRET
    );

    if (!isRefreshTokenPayload(decodedToken)) {
      throw new ApiError(401, "Invalid refresh token payload");
    }

    const user = await User.findById(decodedToken._id);

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
    next(error);
  }
};

type ChangePasswordRequest = AppRequest<{}, unknown>;

export const changePassword = async (
  req: ChangePasswordRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = changePasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid password payload");
    }

    const { oldPassword, currentPassword } = parsedBody.data;

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isValidPassword(oldPassword);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid old password");
    }

    user.password = currentPassword;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

type AuthenticatedRequest = AppRequest;

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(req.user._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res.status(200).json({
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

type UpdateAccountDetailsRequest = AppRequest<{}, unknown>;

export const updateAccountDetails = async (
  req: UpdateAccountDetailsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedBody = updateAccountDetailsSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new ApiError(400, message || "Invalid account details payload");
    }

    const { username, fullName, email } = parsedBody.data;

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
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
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      message: "Account details updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

type UpdateAvatarRequest = AppRequest<{}, unknown>;

export const updateAvatar = async (
  req: UpdateAvatarRequest,
  res: Response,
  next: NextFunction
) => {
  let newAvatar: UploadedAsset | null = null;

  try {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!req.file?.path) {
      throw new ApiError(400, "Avatar is required!");
    }

    const avatarLocalPath = req.file.path;

    newAvatar = await cloudinaryUpload(avatarLocalPath);
    if (!newAvatar) {
      throw new ApiError(500, "Error uploading the avatar!");
    }

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

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const oldAvatarPublicId = req.user.avatar?.public_id;
    if (oldAvatarPublicId && oldAvatarPublicId !== newAvatar.public_id) {
      const deleteAvatar = await deleteFileFromCloudinary(oldAvatarPublicId);
      if (deleteAvatar?.result !== "ok") {
        throw new ApiError(500, "Error deleting the old avatar!");
      }
    }

    res.status(200).json({
      message: "Avatar updated successfully.",
      user,
    });
  } catch (error) {
    if (newAvatar?.public_id) {
      try {
        await deleteFileFromCloudinary(newAvatar.public_id);
      } catch {
        // Preserve original update error when cleanup fails.
      }
    }

    next(error);
  }
};

type UpdateCoverImageRequest = AppRequest<{}, unknown>;

export const updateCoverImage = async (
  req: UpdateCoverImageRequest,
  res: Response,
  next: NextFunction
) => {
  let newCoverImage: UploadedAsset | null = null;

  try {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!req.file?.path) {
      throw new ApiError(400, "CoverImage is required!");
    }

    const coverImageLocalPath = req.file.path;

    newCoverImage = await cloudinaryUpload(coverImageLocalPath);
    if (!newCoverImage) {
      throw new ApiError(500, "Error uploading the cover image!");
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

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const oldCoverImagePublicId = req.user.coverImage?.public_id;
    if (
      oldCoverImagePublicId &&
      oldCoverImagePublicId !== newCoverImage.public_id
    ) {
      const deleteCoverImage = await deleteFileFromCloudinary(
        oldCoverImagePublicId
      );
      if (deleteCoverImage?.result !== "ok") {
        throw new ApiError(500, "Error deleting the old cover image!");
      }
    }

    res.status(200).json({
      message: "CoverImage updated successfully.",
      user,
    });
  } catch (error) {
    if (newCoverImage?.public_id) {
      try {
        await deleteFileFromCloudinary(newCoverImage.public_id);
      } catch {
        // Preserve original update error when cleanup fails.
      }
    }

    next(error);
  }
};

type GetUserChannelProfileRequest = AppRequest<{ username: string }, unknown>;

export const getUserChannelProfile = async (
  req: GetUserChannelProfileRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const username = req.params.username?.trim().toLowerCase();

    if (!username) {
      throw new ApiError(400, "Valid username is required!");
    }

    const requesterObjectId =
      req.user?._id && isValidObjectId(req.user._id)
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    const channel = await User.aggregate([
      {
        $match: {
          username,
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
            $cond: [
              requesterObjectId
                ? { $in: [requesterObjectId, "$subscribers.subscriber"] }
                : false,
              true,
              false,
            ],
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

type GetWatchHistoryRequest = AppRequest<{}, unknown>;

export const getWatchHistory = async (
  req: GetWatchHistoryRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      throw new ApiError(401, "Unauthorized request");
    }

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

    const watchHistory = user[0]?.watchHistory ?? [];

    return res.status(200).json({
      message: "Watch history fetched successfully.",
      watchHistory,
    });
  } catch (error) {
    next(error);
  }
};
