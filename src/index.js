import { connectDB } from "./db/db.js";
import { configDotenv } from "dotenv";

configDotenv({
  path: "./.env",
});
connectDB();
