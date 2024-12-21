import { User } from "../models/user.model.js";
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

export const registerUser = async (req, res, next) => {
  try {
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

      const [avatar, coverImage] = await Promise.all([
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
      await Promise.all([
        deleteFileFromCloudinary(avatar?.public_id),
        deleteFileFromCloudinary(coverImage?.public_id),
      ]);

      throw error;
    }
  } catch (error) {
    next(error);
  }
};

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

export const updateAvatar = async (req, res) => {
  try {
    const avatarLocalPath = req.file.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required!");
    }

    const newAvatar = await cloudinaryUpload(avatarLocalPath);

    if (!newAvatar) {
      throw new ApiError(500, "Error updating the avatar!");
    }

    const deleteAvatar = await deleteFileFromCloudinary(
      req.user.avatar.public_id
    );

    if (!deleteAvatar.result === "ok" || !deleteAvatar) {
      throw new ApiError(500, "Error deleting the avatar!");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: newAvatar,
      },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      message: "Avatar updated Succesfully.",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      message: error.message,
    });
  }
};

export const updateCoverImage = async (req, res) => {
  try {
    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
      throw new ApiError(400, "CoverImage is required!");
    }

    const newCoverImage = await cloudinaryUpload(coverImageLocalPath);

    if (!newCoverImage) {
      throw new ApiError(500, "Error updating the coverImage!");
    }

    const deleteCoverImage = await deleteFileFromCloudinary(
      req.user.coverImage.public_id
    );

    if (!deleteCoverImage.result === "ok" || !deleteCoverImage) {
      throw new ApiError(500, "Error deleting the coverImage!");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: newCoverImage,
      },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      message: "CoverImage updated Succesfully.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUserChannelProfile = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      throw new ApiError(400, "username is required!");
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
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
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
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

    if (!channel?.length) {
      throw new ApiError(404, "Channel not found!");
    }

    return res.status(200).json({
      message: "User fetched successfully.",
      channel,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

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
