const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

module.exports = (req, res, next) => {
  upload.single("bookImg")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Book image must be 5 MB or smaller" : "Upload one book image (maximum 5 MB)" });
    if (req.file) {
      const buffer = req.file.buffer;
      let extension;
      if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) extension = "jpg";
      if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = "png";
      if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") extension = "webp";
      if (!extension) return res.status(400).json({ message: "Book image must be a JPG, PNG or WebP image" });
      req.file.extension = extension;
    }
    return next();
  });
};
