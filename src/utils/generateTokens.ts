import jwt from "jsonwebtoken";
import { ENV } from "../config/env.config.js";
import mongoose from "mongoose";

type JwtUserPayload = {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
};

type JwtRefreshPayload = {
  _id: mongoose.Types.ObjectId;
};

const resolveJwtConfig = (
  secret: string | undefined,
  expiry: string | undefined,
  tokenType: "Access" | "Refresh"
): {
  secret: string;
  expiresIn: NonNullable<jwt.SignOptions["expiresIn"]>;
} => {
  if (!secret || !expiry) {
    throw new Error(
      `${tokenType} token secret or expiry is not defined in environment variables`
    );
  }

  const numericExpiry = Number(expiry);
  const expiresIn = Number.isNaN(numericExpiry)
    ? (expiry as NonNullable<jwt.SignOptions["expiresIn"]>)
    : numericExpiry;

  return { secret, expiresIn };
};

export const generateAccessToken = (user: JwtUserPayload) => {
  const { secret, expiresIn } = resolveJwtConfig(
    ENV.ACCESS_TOKEN_SECRET,
    ENV.ACCESS_TOKEN_EXPIRY,
    "Access"
  );

  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      username: user.username,
    },
    secret,
    {
      expiresIn,
    }
  );
};

export const generateRefreshToken = (user: JwtRefreshPayload) => {
  const { secret, expiresIn } = resolveJwtConfig(
    ENV.REFRESH_TOKEN_SECRET,
    ENV.REFRESH_TOKEN_EXPIRY,
    "Refresh"
  );

  return jwt.sign(
    {
      _id: user._id,
    },
    secret,
    {
      expiresIn,
    }
  );
};
