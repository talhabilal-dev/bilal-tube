import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// const fileFilter = (req, file, cb) => {
//   const fileTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
//   const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
//   const mimeType = fileTypes.test(file.mimetype);

//   if (extName && mimeType) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only image and video files are allowed!'));
//   }
// };

export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  // fileFilter: fileFilter,
});
