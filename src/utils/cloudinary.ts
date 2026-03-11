import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ENV } from "../config/env.config.js";

if (!ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET || !ENV.CLOUD_NAME) {
  throw new Error(
    "Cloudinary configuration is missing. Please check your environment variables."
  );
}

cloudinary.config({
  cloud_name: ENV.CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export const cloudinaryUpload = async (localFilePath: string) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      transformation: [{ quality: "auto" }, { format: "auto" }],
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log(error);
    return null;
  }
};
export const deleteFileFromCloudinary = async (
  publicId: string,
  resourceType = "image"
) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error(`Error deleting ${resourceType}:`, error);
    throw error;
  }
};
