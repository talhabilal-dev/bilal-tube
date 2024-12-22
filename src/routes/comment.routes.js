import { Router } from "express";
import {
  addCommentToVideo,
  deleteComment,
  getVideoComments,
  updateComment,
  addCommentToTweet,
  getTweetComments
} from "../controllers/comment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.route("/v/:videoId").get(getVideoComments).post(addCommentToVideo);
router.route("/t/:tweetId").get(getTweetComments).post(addCommentToTweet)
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
