import multer from "multer";
import AppError from "../errors/AppError";

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Memory storage — file lands in req.file.buffer, never touches disk.
 * Buffer is passed directly to Cloudinary upload stream.
 */
const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
            new AppError(415, `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`),
        );
    }
    cb(null, true);
};

export const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
}).single("file"); // field name expected in the form-data
