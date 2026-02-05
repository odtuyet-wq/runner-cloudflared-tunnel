const fs = require('fs');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';

function ensureDir(dirPath, mode = 0o755) {
  if (fs.existsSync(dirPath)) return;
  fs.mkdirSync(dirPath, { recursive: true, mode });
  if (!isWindows) {
    try { fs.chmodSync(dirPath, mode); } catch (error) {}
  }
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!exists(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON from ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, data, mode = 0o644) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmpPath = filePath + '.tmp';
  const content = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode });
    fs.renameSync(tmpPath, filePath);
    if (!isWindows) {
      try { fs.chmodSync(filePath, mode); } catch (error) {}
    }
  } catch (error) {
    if (exists(tmpPath)) fs.unlinkSync(tmpPath);
    throw error;
  }
}

function readText(filePath) {
  if (!exists(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content, mode = 0o644) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode });
  if (!isWindows) {
    try { fs.chmodSync(filePath, mode); } catch (error) {}
  }
}

function deleteFile(filePath) {
  if (exists(filePath)) fs.unlinkSync(filePath);
}

function copyFile(source, dest) {
  const dir = path.dirname(dest);
  ensureDir(dir);
  fs.copyFileSync(source, dest);
  if (!isWindows) {
    try {
      const stats = fs.statSync(source);
      fs.chmodSync(dest, stats.mode);
    } catch (error) {}
  }
}

function listDir(dirPath) {
  if (!exists(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

function getStats(filePath) {
  if (!exists(filePath)) return null;
  return fs.statSync(filePath);
}

function verifyPermissions(filePath, expectedMode) {
  if (isWindows) return { ok: true, actualMode: null };
  const stats = getStats(filePath);
  if (!stats) return { ok: false, actualMode: null };
  const actualMode = stats.mode & 0o777;
  return { ok: actualMode === expectedMode, actualMode };
}

function isDirectory(dirPath) {
  const stats = getStats(dirPath);
  return stats ? stats.isDirectory() : false;
}

function makeExecutable(filePath) {
  if (isWindows) return;
  try { fs.chmodSync(filePath, 0o755); } catch (error) {}
}

module.exports = {
  ensureDir,
  exists,
  readJson,
  writeJson,
  readText,
  writeText,
  deleteFile,
  copyFile,
  listDir,
  getStats,
  isDirectory,
  makeExecutable,
  verifyPermissions,
  isWindows
};
