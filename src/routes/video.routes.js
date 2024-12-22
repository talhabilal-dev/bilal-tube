import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  publishAVideo,
  getVideoById,
  updateVideo,
  togglePublishStatus,
  deleteVideo,
  incrementVideoView,
  getAllVideos,
} from "../controllers/video.controller.js";

const router = Router();

router.route("/").post(
  authMiddleware,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
  ]),
  publishAVideo
);
router.route("/").get(getAllVideos);
router
  .route("/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .patch(upload.single("thumbnail"), authMiddleware, updateVideo);

router
  .route("/toggle/publish/:videoId")
  .patch(authMiddleware, togglePublishStatus);
router.route("/views/:videoId").patch(authMiddleware, incrementVideoView);

export default router;
