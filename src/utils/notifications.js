const Notification = require('../models/Notification');

async function notify(type, sessionId, sessionName, message) {
  try {
    await Notification.create({ type, sessionId, sessionName, message });
  } catch (e) { /* silent */ }
}

module.exports = { notify };
