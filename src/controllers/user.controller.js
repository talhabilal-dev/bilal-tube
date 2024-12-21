import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  cloudinaryUpload,
  cloudinaryDelete,
  extractPublicId,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, fullName, password } = req.body;

  if (
    [userName, email, fullName, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    res.status(400).json({
      message: "All fields are required.",
    });
  }

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    return res.status(409).json({
      message: "User already exists",
    });
  }

  const avatarLocalPath = req.files.avatar[0].path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    return res.status(400).json({
      message: "Avatar is required",
    });
  }

  const avatar = await cloudinaryUpload(avatarLocalPath);

  if (!avatar) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }

  const coverImage = await cloudinaryUpload(coverImageLocalPath);

  const newUser = await User.create({
    userName,
    email,
    fullName,
    password,
    avatar,
    coverImage: coverImage || "",
  });

  const checkUser = await User.findById({
    _id: newUser._id,
  }).select("-password -refreshToken");

  res.status(201).json({
    message: "User created successfully",

    user: checkUser,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "All fields are required.",
    });
  }

  const user = await User.findOne({
    email,
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const isPasswordValid = await user.isValidPassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
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
    })

})

export const logOutUser = asyncHandler(async (req, res) => {
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
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      message: "Unauthorized request",
    });
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
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

  res.status(500).json({
    message: "Internal server error",
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, currentPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const isPasswordValid = await user.isValidPassword(oldPassword);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid password",
    });
  }

  user.password = currentPassword;
  user.save({ validateBeforeSave: false });

  res.status(200).json({
    message: "Password updated successfully.",
  });

  res.status(500).json({
    message: "Internal server error",
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: "User fetched successfully.",
    user: req.user,
  });
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { userName, fullName, email } = req.body;

  if (!userName || !fullName || !email) {
    return res.status(400).json({
      message: "All fields are required!",
    });
  }

  const updatedUser = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        userName,
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
  res.status(500).json({
    message: "Internal server error",
  });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file.path;
  console.log(avatarLocalPath);

  if (!avatarLocalPath) {
    return res.status(400).json({
      message: "Avatar is required!",
    });
  }

  const public_id = extractPublicId(req.user.avatar);
  const newAvatar = await cloudinaryUpload(avatarLocalPath);

  if (!newAvatar) {
    return res.status(500).json({
      message: "Error updating the avatar!",
    });
  }

  const deleteAvatar = await cloudinaryDelete(public_id);

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
  console.log(error);
  res.status(500).json({
    message: "Internal server error",
  });
});

export const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;

  if (!coverImageLocalPath) {
    return res.status(400).json({
      message: "CoverImage is required!",
    });
  }

  const newCoverImage = await cloudinaryUpload(coverImageLocalPath);

  const public_id = extractPublicId(req.user.coverImage);

  if (!newCoverImage) {
    return res.status(500).json({
      message: "Error updating the CoverImage!",
    });
  }
  const deleteCoverImage = await cloudinaryDelete(public_id);

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

  res.status(500).json({
    message: "Internal server error",
  });
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    return response.status(400).json({
      message: "username is missing.",
    });
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
    return response.status(404).json({
      message: "Channel not found.",
    });
  }

  return res.status(200).json({
    message: "User fetched successfully.",
    channel,
  });

  res.status(500).json({
    message: "Internal server error",
  });
});

export const getWatchHistory = asyncHandler(async (req, res) => {
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

  res.status(500).json({
    message: "Internal server error",
  });
});

