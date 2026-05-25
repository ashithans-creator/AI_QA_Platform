const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectController');
const { authMiddleware } = require('../middleware/auth');

router.post('/analyze', authMiddleware, defectController.analyzeDefect);
router.post('/create', authMiddleware, defectController.createDefect);
router.get('/', authMiddleware, defectController.getDefects);
router.post('/:id/sync', authMiddleware, defectController.syncJira);
router.put('/:id/status', authMiddleware, defectController.updateStatus);

module.exports = router;
