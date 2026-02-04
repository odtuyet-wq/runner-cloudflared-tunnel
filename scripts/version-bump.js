#!/usr/bin/env node

/**
 * Version bump script
 * Increments package version using Vietnam timezone
 */

const fs = require('fs');
const path = require('path');
const { getVietnamDate } = require('../src/utils/time');

const PACKAGE_JSON = path.join(__dirname, '../package.json');

/**
 * Parse version string
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Format version
 */
function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

/**
 * Bump version
 */
function bumpVersion(type = 'patch') {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const current = parseVersion(pkg.version);
  
  let newVersion;
  
  switch (type) {
    case 'major':
      newVersion = { major: current.major + 1, minor: 0, patch: 0 };
      break;
    case 'minor':
      newVersion = { major: current.major, minor: current.minor + 1, patch: 0 };
      break;
    case 'patch':
    default:
      newVersion = { major: current.major, minor: current.minor, patch: current.patch + 1 };
      break;
  }
  
  const newVersionString = formatVersion(newVersion);
  pkg.version = newVersionString;
  
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  
  console.log(`Version bumped: ${pkg.version} -> ${newVersionString}`);
  console.log(`Date: ${getVietnamDate()}`);
  
  return newVersionString;
}

// Run if called directly
if (require.main === module) {
  const type = process.argv[2] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node version-bump.js [major|minor|patch]');
    process.exit(1);
  }
  
  try {
    bumpVersion(type);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { bumpVersion };
