const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-donation-platform/documents', // Folders in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
  },
});

const uploadDoc = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max upload size for verification documents
    files: 1,
  },
});

module.exports = uploadDoc;
