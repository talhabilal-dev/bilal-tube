import { Router } from "express";
import {
  registerUser,
  changePassword,
  getCurrentUser,
  logOutUser,
  updateAvatar,
  updateCoverImage,
  loginUser,
  getWatchHistory,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/logout").get(authMiddleware, logOutUser);
router.route("/change-password").post(authMiddleware, changePassword);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/getCurrentUser").get(authMiddleware, getCurrentUser);
router
  .route("/updateAvatar")
  .post(upload.single("avatar"), authMiddleware, updateAvatar);
router
  .route("/updateCoverImage")
  .post(upload.single("coverImage"), authMiddleware, updateCoverImage);
router.route("/watchHistory").get(authMiddleware, getWatchHistory);

export default router;
