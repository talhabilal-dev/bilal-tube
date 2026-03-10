import mongoose from "mongoose";
import { ENV } from "./env.config.js";

export const connectDB: () => Promise<void> = async () => {
  try {
    const db = await mongoose.connect(`${ENV.MONGO_URI}`);
    console.log(`Connected to MongoDB: ${db.connection.host}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error connecting to MongoDB:", error.message);
    } else {
      console.error("Error connecting to MongoDB:", error);
    }
    process.exit(1);
  }
};
