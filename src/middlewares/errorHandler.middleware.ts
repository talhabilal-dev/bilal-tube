export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
};
