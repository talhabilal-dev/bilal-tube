import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import type { NextFunction, Request, Response } from "express";
import { ENV } from "../config/env.config.js";



export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (!ENV.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(accessToken, ENV.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid access token",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized request",
    });
  }
};
