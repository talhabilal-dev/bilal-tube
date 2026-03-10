import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";

export interface ITweet {
  content: string;
  owner?: Types.ObjectId;
}

const tweetSchema = new Schema<ITweet>(
  {
    content: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetSchema);
