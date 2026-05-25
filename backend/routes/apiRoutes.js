const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const apiController = require('../controllers/apiController');
const { authMiddleware } = require('../middleware/auth');

// Setup upload folder
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

router.post('/upload-swagger', authMiddleware, upload.single('swagger'), apiController.uploadSwagger);
router.post('/analyze-endpoint', authMiddleware, apiController.analyzeEndpoint);
router.post('/generate-code', authMiddleware, apiController.generateRestAssuredCode);
router.post('/save-collection', authMiddleware, apiController.saveCollection);
router.get('/collections', authMiddleware, apiController.getCollections);

module.exports = router;
