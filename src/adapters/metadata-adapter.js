const fs = require('fs');
const path = require('path');
const { readJson, writeJson, exists } = require('./fs-adapter');

const METADATA_PATH = '/var/tmp/runner-tailscale-sync-metadata.json';

function readMetadata() {
  if (!exists(METADATA_PATH)) {
    return {};
  }
  try {
    return readJson(METADATA_PATH) || {};
  } catch (error) {
    console.warn(`Failed to read metadata: ${error.message}`);
    return {};
  }
}

function writeMetadata(metadata) {
  try {
    const dir = path.dirname(METADATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeJson(METADATA_PATH, metadata, 0o644);
  } catch (error) {
    console.warn(`Failed to write metadata: ${error.message}`);
  }
}

function updateCloudflaredMetadata(tunnelData) {
  const metadata = readMetadata();
  if (!metadata.cloudflared) {
    metadata.cloudflared = {};
  }
  Object.assign(metadata.cloudflared, tunnelData);
  metadata.cloudflared.lastUpdated = new Date().toISOString();
  writeMetadata(metadata);
}

function getCloudflaredMetadata() {
  const metadata = readMetadata();
  return metadata.cloudflared || null;
}

function removeCloudflaredMetadata() {
  const metadata = readMetadata();
  delete metadata.cloudflared;
  writeMetadata(metadata);
}

module.exports = {
  METADATA_PATH,
  readMetadata,
  writeMetadata,
  updateCloudflaredMetadata,
  getCloudflaredMetadata,
  removeCloudflaredMetadata
};
