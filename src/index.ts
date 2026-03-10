import { configDotenv } from "dotenv";
configDotenv({
  path: "./.env",
});
import { connectDB } from "./config/db.config.js";
import app from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    if (error instanceof Error) {
      throw new Error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      throw new Error("Error connecting to MongoDB");
    }

  });
