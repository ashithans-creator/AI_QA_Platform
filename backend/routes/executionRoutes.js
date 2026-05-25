const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executionController');
const { authMiddleware } = require('../middleware/auth');

router.post('/trigger', authMiddleware, executionController.triggerSuite);
router.get('/', authMiddleware, executionController.getExecutions);
router.get('/metrics', authMiddleware, executionController.getDashboardMetrics);
router.post('/stop', authMiddleware, executionController.stopSuite);
router.get('/suites/config', authMiddleware, executionController.getSuites);
router.put('/suites/:suiteName/tests', authMiddleware, executionController.updateSuiteTests);
router.get('/tests/:suiteName', authMiddleware, executionController.listTests);
router.delete('/:id', authMiddleware, executionController.deleteExecution);
router.get('/:id', authMiddleware, executionController.getExecutionDetails);

module.exports = router;
