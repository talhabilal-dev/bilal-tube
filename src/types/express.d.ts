import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface AuthUser {
      _id: Types.ObjectId | string;
      avatar?: {
        public_id: string;
      };
      coverImage?: {
        public_id: string;
      };
      [key: string]: unknown;
    }

    interface Request {
      user?: AuthUser;
      file?: Multer.File;
      files?: { [fieldname: string]: Multer.File[] } | Multer.File[];
    }
  }
}

export {};
