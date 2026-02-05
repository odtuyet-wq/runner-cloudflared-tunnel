const fs = require('fs');
const path = require('path');
const { getVietnamTime } = require('./time');
const { ensureDir } = require('../adapters/fs-adapter');

let logLevel = 'info';
let logFile = null;
let packageInfo = { name: 'unknown', version: '0.0.0' };
let commandName = 'unknown';
let useColor = true;

function init(pkgName, pkgVersion, options = {}) {
  packageInfo = { name: pkgName, version: pkgVersion };
  commandName = options.commandName || commandName;
  logLevel = options.verbose ? 'verbose' : (options.quiet ? 'quiet' : 'info');
  useColor = options.color !== undefined ? options.color : process.stdout.isTTY;
  
  if (options.logFile) {
    logFile = options.logFile;
    const logDir = path.dirname(logFile);
    ensureDir(logDir);
  }
}

function timestamp() {
  return getVietnamTime();
}

function maskSensitive(value, options = {}) {
  const { showStart = 2, showEnd = 2 } = options;
  if (!value) return 'xxx-Masked-xxx';
  const totalLength = value.length;
  const start = value.slice(0, showStart);
  const end = value.slice(-showEnd);
  if (totalLength <= showStart + showEnd) {
    return `xxx-Masked:${totalLength}-xxx`;
  }
  return `${start}xxx-Masked:${totalLength}-xxx${end}`;
}

function maskTokensInContent(content) {
  if (!content) return content;
  let masked = content;
  masked = masked.replace(/eyJ[A-Za-z0-9_-]{20,}/g, (match) => {
    return `${match.substring(0, 8)}xxx-Token-Masked:${match.length}-xxx`;
  });
  masked = masked.replace(/\b[A-Za-z0-9_-]{32,}\b/g, (match) => {
    if (match.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return match;
    }
    return `${match.substring(0, 4)}xxx-Secret-Masked:${match.length}-xxx${match.substring(match.length - 4)}`;
  });
  return masked;
}

function colorize(level, message) {
  if (!useColor || process.env.NO_COLOR) return message;
  const colors = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m',
    verbose: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  const color = colors[level] || '';
  return color ? `${color}${message}${reset}` : message;
}

function writeToFile(message) {
  if (!logFile) return;
  try {
    const maskedMessage = maskTokensInContent(message);
    const logMessage = `${maskedMessage}\n`;
    fs.appendFileSync(logFile, logMessage, 'utf8');
  } catch (error) {}
}

function formatMessage(level, message) {
  const ts = timestamp();
  const prefix = `[${ts}] [${packageInfo.name}@${packageInfo.version}] [${commandName}] [${level.toUpperCase()}]`;
  return `${prefix} ${message}`;
}

function formatConsoleMessage(level, message) {
  return colorize(level, formatMessage(level, message));
}

function info(message) {
  if (logLevel === 'quiet') return;
  const formatted = formatMessage('info', message);
  const consoleFormatted = formatConsoleMessage('info', message);
  console.log(consoleFormatted);
  writeToFile(formatted);
}

function verbose(message) {
  if (logLevel !== 'verbose') return;
  const formatted = formatMessage('verbose', message);
  const consoleFormatted = formatConsoleMessage('verbose', message);
  console.log(consoleFormatted);
  writeToFile(formatted);
}

function warn(message) {
  const formatted = formatMessage('warn', message);
  const consoleFormatted = formatConsoleMessage('warn', message);
  console.warn(consoleFormatted);
  writeToFile(formatted);
}

function error(message, err) {
  const formatted = formatMessage('error', message);
  const consoleFormatted = formatConsoleMessage('error', message);
  console.error(consoleFormatted);
  if (err && err.stack) {
    console.error(err.stack);
    writeToFile(formatted + '\n' + err.stack);
  } else {
    writeToFile(formatted);
  }
}

function success(message) {
  if (logLevel === 'quiet') return;
  const formatted = formatMessage('success', message);
  const consoleFormatted = formatConsoleMessage('success', message);
  console.log(consoleFormatted);
  writeToFile(formatted);
}

function section(title) {
  if (logLevel === 'quiet') return;
  const separator = '='.repeat(60);
  const formatted = formatMessage('info', `\n${separator}\n${title}\n${separator}`);
  const consoleFormatted = formatConsoleMessage('info', `\n${separator}\n${title}\n${separator}`);
  console.log(consoleFormatted);
  writeToFile(formatted);
}

function logConfig(config, sensitiveKeys = []) {
  if (logLevel === 'quiet') return;
  info('Configuration:');
  Object.keys(config).forEach(key => {
    const value = config[key];
    const isSensitive = sensitiveKeys.includes(key);
    const displayValue = isSensitive ? maskSensitive(value) : value;
    info(`  ${key}:${isSensitive ? displayValue : ` ${displayValue}`}`);
  });
}

function logApiCall(method, url, data = null) {
  verbose(`API Call: ${method} ${url}`);
  if (data) {
    const maskedData = JSON.stringify(data, null, 2);
    verbose(`API Data: ${maskTokensInContent(maskedData)}`);
  }
}

function setLevel(level) {
  logLevel = level;
}

function getLevel() {
  return logLevel;
}

module.exports = {
  init,
  info,
  verbose,
  warn,
  error,
  success,
  section,
  logConfig,
  logApiCall,
  maskSensitive,
  maskTokensInContent,
  setLevel,
  getLevel
};
