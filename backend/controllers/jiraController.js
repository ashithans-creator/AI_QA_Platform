const jiraService = require('../services/jira.service');

exports.fetchJiraStory = async (req, res, next) => {
  const { ticketId } = req.params;

  try {
    const story = await jiraService.fetchStoryForTestCases(ticketId);
    res.json({
      message: 'Jira story fetched successfully',
      story
    });
  } catch (error) {
    next(error);
  }
};
