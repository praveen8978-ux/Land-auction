const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Photos storage
const photoDir = path.join(__dirname, '../../uploads/lands');
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `land-${unique}${path.extname(file.originalname)}`);
  }
});

// Documents storage
const docDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docDir),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `doc-${unique}${path.extname(file.originalname)}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase())
          && allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('Only JPG PNG WEBP images allowed'));
};

const docFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only JPG PNG WEBP PDF files allowed'));
};

const uploadPhotos = multer({
  storage:    photoStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: 5 * 1024 * 1024 }
});

const uploadDocuments = multer({
  storage:    docStorage,
  fileFilter: docFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }
});

module.exports = { uploadPhotos, uploadDocuments };