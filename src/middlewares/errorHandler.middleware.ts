import type { NextFunction, Request, Response } from "express";

interface CustomError extends Error {
  statusCode?: number;
  message: string;
  stack?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
};
