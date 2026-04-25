const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Make sure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads/lands');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `land-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const isAllowed = allowed.test(path.extname(file.originalname).toLowerCase())
                 && allowed.test(file.mimetype);
  if (isAllowed) cb(null, true);
  else cb(new Error('Only JPG, PNG and WEBP images are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per photo
});

module.exports = upload;