import { configDotenv } from "dotenv";
configDotenv({
  path: "./.env",
});
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryUpload = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);

    return response.secure_url;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log(error);
    return null;
  }
};
export const extractPublicId = (url) => {
  let publicIdWithExtension = url.substring(url.lastIndexOf("/") + 1);
  return publicIdWithExtension.replace(/\.[^/.]+$/, "");
};

export const cloudinaryDelete = async (cloudinaryFilePath) => {
  try {
    const result = await cloudinary.uploader.destroy(cloudinaryFilePath);
    console.log("Image deleted successfully:", result);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};
