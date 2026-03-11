import { connectDB } from "./config/db.config.js";
import app from "./app.js";
import { ENV } from "./config/env.config.js";

connectDB()
  .then(() => {
    app.listen(ENV.PORT, () => {
      console.log(`Server is running on port ${ENV.PORT}`);
    });
  })
  .catch((error) => {
    if (error instanceof Error) {
      throw new Error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      throw new Error("Error connecting to MongoDB");
    }
  });
