import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
export const registerUser = async (req, res) => {
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
      message: "Something went wrong",
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
};
