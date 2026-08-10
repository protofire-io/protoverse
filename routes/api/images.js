const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  uploadImage,
  listImages,
  getImage,
  getImageMeta,
  deleteImage,
  handleUploadError,
} = require('../../controllers/images');

// List uploaded images
router.get('/', listImages);

// Metadata for one image
router.get('/:filename/meta', getImageMeta);

// Serve image bytes
router.get('/:filename', getImage);

// Upload (multipart field name: "image")
router.post('/', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    return uploadImage(req, res);
  });
});

// Delete image
router.delete('/:filename', deleteImage);

module.exports = router;
