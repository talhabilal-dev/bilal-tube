import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";

interface IFileAsset {
  url: string;
  public_id: string;
}

export interface IVideo {
  videoFile: IFileAsset;
  thumbnail: IFileAsset;
  title: string;
  description: string;
  duration: number;
  views: number;
  isPublished: boolean;
  owner: Types.ObjectId;
}

const videoSchema = new Schema<IVideo>(
  {
    videoFile: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    thumbnail: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Video = mongoose.model("Video", videoSchema);
