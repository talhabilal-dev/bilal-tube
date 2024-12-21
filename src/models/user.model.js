import mongoose, { Schema } from "mongoose";
import argon from "argon2";

const userSchema = new Schema(
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
      lowecase: true,
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

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await argon.hash(this.password);
    next();
  }
  next();
});

userSchema.methods.isValidPassword = async function (password) {
  return await argon.verify(this.password, password);
};

export const User = mongoose.model("User", userSchema);
