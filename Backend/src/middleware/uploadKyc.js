const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const zipFilter = (_req, file, cb) => {
  const name = String(file.originalname || "").toLowerCase();
  const okMime =
    file.mimetype === "application/zip" ||
    file.mimetype === "application/x-zip-compressed" ||
    file.mimetype === "application/octet-stream";
  const okExt = name.endsWith(".zip");
  if (okMime || okExt) {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are allowed for Aadhaar Offline e-KYC"), false);
  }
};

const uploadAadhaarZip = multer({
  storage,
  fileFilter: zipFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = { uploadAadhaarZip };
