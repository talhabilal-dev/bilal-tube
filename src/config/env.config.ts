import dotenv from "dotenv";

dotenv.config();

const parseEnv = (value: string | undefined): string | undefined => {
  if (!value) return value;

  const trimmed = value.trim();
  const startsWithQuote = trimmed.startsWith('"') || trimmed.startsWith("'");
  const endsWithQuote = trimmed.endsWith('"') || trimmed.endsWith("'");

  return startsWithQuote && endsWithQuote
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

type EnvConfig = {
  PORT: number;
  MONGO_URI: string | undefined;
  CLIENT_URL: string | undefined;
  ACCESS_TOKEN_SECRET: string | undefined;
  ACCESS_TOKEN_EXPIRY: string | undefined;
  REFRESH_TOKEN_SECRET: string | undefined;
  REFRESH_TOKEN_EXPIRY: string | undefined;
  CLOUDINARY_API_SECRET: string | undefined;
  CLOUDINARY_API_KEY: string | undefined;
  CLOUD_NAME: string | undefined;
  NODE_ENV: string | undefined;
};

export const ENV: EnvConfig = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: parseEnv(process.env.MONGO_URI),
  CLIENT_URL: parseEnv(process.env.CLIENT_URL),
  ACCESS_TOKEN_SECRET: parseEnv(process.env.ACCESS_TOKEN_SECRET),
  ACCESS_TOKEN_EXPIRY: parseEnv(process.env.ACCESS_TOKEN_EXPIRY),
  REFRESH_TOKEN_SECRET: parseEnv(process.env.REFRESH_TOKEN_SECRET),
  REFRESH_TOKEN_EXPIRY: parseEnv(process.env.REFRESH_TOKEN_EXPIRY),
  CLOUDINARY_API_SECRET: parseEnv(process.env.CLOUDINARY_API_SECRET),
  CLOUDINARY_API_KEY: parseEnv(process.env.CLOUDINARY_API_KEY),
  CLOUD_NAME: parseEnv(process.env.CLOUD_NAME),
  NODE_ENV: parseEnv(process.env.NODE_ENV),
};
