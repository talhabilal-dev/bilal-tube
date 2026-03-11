import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import { ENV } from "../config/env.config.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (!ENV.ACCESS_TOKEN_SECRET) {
      throw new Error(
        "ACCESS_TOKEN_SECRET is not defined in environment variables"
      );
    }

    const decoded = jwt.verify(accessToken, ENV.ACCESS_TOKEN_SECRET);

    if (typeof decoded === "string" || !decoded?._id) {
      return res.status(401).json({
        message: "Invalid access token",
      });
    }

    const decodedPayload = decoded as JwtPayload & { _id: string };

    const user = await User.findById(decodedPayload._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid access token",
      });
    }

    req.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      coverImage: user.coverImage,
    };
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized request",
    });
  }
};
