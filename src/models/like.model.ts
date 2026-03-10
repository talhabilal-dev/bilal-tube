import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";

export interface ILike {
  video?: Types.ObjectId;
  comment?: Types.ObjectId;
  tweet?: Types.ObjectId;
  likedBy?: Types.ObjectId;
}

const likeSchema = new Schema<ILike>(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
