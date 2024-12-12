import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { generateAccessToken ,  generateRefreshToken } from "../utils/generateTokens.js";
export const registerUser = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
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

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "User logged in successfully",
        user: {
          id: user._id,
          userName: user.userName,
          email: user.email,
        },
      });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",

      error,
    });
  }
};

export const logOutUser = async (req, res) => {

  await User.findByIdAndUpdate(
    req.user._id,
    {
        $unset: {
            refreshToken: 1
        }
    },
    {
        new: true
    }
)

const options = {
    httpOnly: true,
    secure: true
}

return res
.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json({
    message: "User logged out successfully"
})

}