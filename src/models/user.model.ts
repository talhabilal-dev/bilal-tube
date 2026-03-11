import mongoose, { Schema } from "mongoose";
import type { HydratedDocument, Model, Types } from "mongoose";
import argon from "argon2";

interface IImageAsset {
  url: string;
  public_id: string;
}

export interface IUser {
  username: string;
  email: string;
  fullName: string;
  avatar: IImageAsset;
  coverImage: IImageAsset;
  watchHistory: Types.ObjectId[];
  password: string;
  refreshToken?: string;
}

export interface IUserMethods {
  isValidPassword(password: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    coverImage: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  const user = this as HydratedDocument<IUser, IUserMethods>;

  if (!user.isModified("password")) {
    return;
  }

  user.password = await argon.hash(user.password);
});

userSchema.methods.isValidPassword = async function (password: string) {
  return await argon.verify(this.password, password);
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
