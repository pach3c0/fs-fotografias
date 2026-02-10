const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function createUploader(subdir, options = {}) {
  const dir = path.join(__dirname, '../../uploads', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const suffix = crypto.randomBytes(8).toString('hex');
      cb(null, suffix + path.extname(file.originalname));
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: options.maxSize || 10 * 1024 * 1024,
      files: options.maxFiles || 50
    }
  });
}

module.exports = { createUploader };
