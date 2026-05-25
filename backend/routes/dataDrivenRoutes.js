const express = require('express');
const router = express.Router();
const dataDrivenController = require('../controllers/dataDrivenController');
const { authMiddleware } = require('../middleware/auth');

router.get('/datasets', authMiddleware, dataDrivenController.getDataSets);
router.post('/save', authMiddleware, dataDrivenController.saveDataSet);
router.post('/execute', authMiddleware, dataDrivenController.executeScenario);

module.exports = router;
