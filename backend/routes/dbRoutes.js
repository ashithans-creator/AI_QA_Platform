const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const { authMiddleware } = require('../middleware/auth');

router.post('/generate-sql', authMiddleware, dbController.generateSql);
router.post('/execute', authMiddleware, dbController.executeQuery);
router.get('/schema', authMiddleware, dbController.getSchema);

module.exports = router;
