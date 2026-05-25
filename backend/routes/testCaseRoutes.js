const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const testCaseController = require('../controllers/testCaseController');
const { authMiddleware } = require('../middleware/auth');

// Setup upload folder
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

router.post('/generate', authMiddleware, upload.single('prd'), testCaseController.generateTestCases);
router.post('/save', authMiddleware, testCaseController.saveTestCases);
router.get('/saved', authMiddleware, testCaseController.getSavedTestCases);
router.delete('/:id', authMiddleware, testCaseController.deleteTestCase);
router.get('/export-csv', authMiddleware, testCaseController.exportCsv);

module.exports = router;
