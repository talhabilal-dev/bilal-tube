import { Router } from "express";
import { registerUser } from "../controllers/auth.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { changePassword } from "../controllers/auth.controllers.js";
import { getCurrentUser } from "../controllers/auth.controllers.js";
import { logOutUser } from "../controllers/auth.controllers.js";
import { updateAvatar } from "../controllers/auth.controllers.js";
import { updateCoverImage } from "../controllers/auth.controllers.js";
import { loginUser } from "../controllers/auth.controllers.js";
import { refreshAccessToken } from "../controllers/auth.controllers.js";

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

export default router;
