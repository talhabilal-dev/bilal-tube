import { Router } from "express";
import type { RequestHandler } from "express";
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
  getUserChannelProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router: Router = Router();

const asHandler = (
  fn: (req: any, res: any, next: any) => unknown
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

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
  asHandler(registerUser)
);
router.route("/login").post(asHandler(loginUser));
router.route("/logout").get(authMiddleware, asHandler(logOutUser));
router.route("/change-password").post(authMiddleware, asHandler(changePassword));
router.route("/refresh-token").post(asHandler(refreshAccessToken));
router
  .route("/getCurrentUser")
  .get(authMiddleware, asHandler(getCurrentUser));
router
  .route("/updateAvatar")
  .post(upload.single("avatar"), authMiddleware, asHandler(updateAvatar));
router
  .route("/updateCoverImage")
  .post(
    upload.single("coverImage"),
    authMiddleware,
    asHandler(updateCoverImage)
  );

router
  .route("/:username/profile")
  .get(authMiddleware, asHandler(getUserChannelProfile));
router
  .route("/:username/watch-history")
  .get(authMiddleware, asHandler(getWatchHistory));

export default router;
