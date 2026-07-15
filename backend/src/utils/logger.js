const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const log = (level, msg, data) => {
  if (LOG_LEVELS[level] > currentLevel) return;
  const entry = { timestamp: new Date().toISOString(), level, message: msg };
  if (data) entry.data = data;
  process[level === 'error' ? 'stderr' : 'stdout'].write(JSON.stringify(entry) + '\n');
};

module.exports = {
  error: (msg, data) => log('error', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  info: (msg, data) => log('info', msg, data),
  debug: (msg, data) => log('debug', msg, data),
};
