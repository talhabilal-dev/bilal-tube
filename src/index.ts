import { configDotenv } from "dotenv";
configDotenv({
  path: "./.env",
});
import { connectDB } from "./db/db.js";
import app from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error);
  });
