import { Router } from "express";
import { registerUser } from "../controllers/auth.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { logOutUser } from "../controllers/auth.controllers.js";
import { loginUser } from "../controllers/auth.controllers.js";

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

export default router;
