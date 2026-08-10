const path = require('path');
const multer = require('multer');
const config = require('../config');
const imageService = require('../services/imageService');

imageService.ensureDirs();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    imageService.ensureDirs();
    cb(null, imageService.IMAGE_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, imageService.buildStoredName(file.originalname, file.mimetype));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.IMAGE_MAX_BYTES || 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!imageService.isAllowedMime(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
    return cb(null, true);
  },
});

exports.uploadMiddleware = upload.single('image');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (field name: image)' });
    }

    const stored = await imageService.finalizeUpload(req.file);
    const meta = imageService.getImageMeta(req.file.filename, req);

    return res.status(201).json({
      ...meta,
      ...stored,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
};

exports.listImages = (req, res) => {
  try {
    return res.status(200).json({ images: imageService.listImages(req) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list images' });
  }
};

exports.getImage = (req, res) => {
  try {
    const filePath = imageService.resolveImagePath(req.params.filename);
    if (!filePath) {
      return res.status(404).json({ error: 'Image not found' });
    }
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
};

exports.getImageMeta = (req, res) => {
  try {
    const meta = imageService.getImageMeta(req.params.filename, req);
    if (!meta) {
      return res.status(404).json({ error: 'Image not found' });
    }
    return res.status(200).json(meta);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch image metadata' });
  }
};

exports.deleteImage = (req, res) => {
  try {
    const ok = imageService.deleteImage(req.params.filename);
    if (!ok) {
      return res.status(404).json({ error: 'Image not found' });
    }
    return res.status(200).json({ deleted: true, filename: req.params.filename });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
};

exports.handleUploadError = (err, _req, res, _next) => {
  if (!err) return res.status(500).json({ error: 'Unknown upload error' });
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image too large (max 5MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && /Only JPEG|image/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Failed to upload image' });
};
