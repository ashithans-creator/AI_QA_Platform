const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jiraController');

router.get('/issue/:ticketId', jiraController.fetchJiraStory);

module.exports = router;
