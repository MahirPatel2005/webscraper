const winston = require('winston');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure logs directory exists
const logDir = path.dirname(config.paths.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: config.paths.logFile }),
    new winston.transports.Console(),
  ],
});

module.exports = logger;
