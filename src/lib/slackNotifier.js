const axios = require('axios');
const config = require('../config');

async function sendSlackMessage(payload) {
  if (!config.slackWebhookUrl) return;
  try {
    await axios.post(config.slackWebhookUrl, payload);
  } catch (err) {
    console.warn('[Slack] Notification failed:', err.message);
  }
}

module.exports = { sendSlackMessage };
