const path = require('path');
const { ValidationError, ConfigError } = require('../utils/errors');

function parseInput() {
  const config = {
    apiKey: process.env.CLOUDFLARED_API_KEY || process.env.CLOUDFLARED_GLOBAL_API_KEY || '',
    email: process.env.CLOUDFLARED_EMAIL || '',
    accountId: process.env.CLOUDFLARED_ACCOUNT_ID || '',
    tunnelToken: process.env.CLOUDFLARED_TUNNEL_TOKEN || '',
    zoneId: process.env.CLOUDFLARED_ZONE_ID || '',
    zoneName: process.env.CLOUDFLARED_ZONE_NAME || '',
    tunnels: [],
    cwd: process.env.TOOL_CWD || process.env.CLOUDFLARED_CWD || process.cwd(),
    cloudflaredPath: process.env.CLOUDFLARED_EXE_PATH || '',
    logLevel: process.env.CLOUDFLARED_LOG_LEVEL || 'info',
    timeout: parseInt(process.env.CLOUDFLARED_TIMEOUT || '30000', 10),
    verifyRetries: parseInt(process.env.CLOUDFLARED_VERIFY_RETRIES || '3', 10),
    verifyDelay: parseInt(process.env.CLOUDFLARED_VERIFY_DELAY || '3000', 10)
  };
  
  let index = 1;
  while (true) {
    const tunnelEnv = process.env[`CLOUDFLARED_TUNNEL_${index}`];
    if (!tunnelEnv) break;
    
    const parts = tunnelEnv.split(':');
    if (parts.length !== 4 && parts.length !== 5) {
      throw new ConfigError(
        `Invalid tunnel configuration at CLOUDFLARED_TUNNEL_${index}: ${tunnelEnv}. ` +
        `Expected format: tunnelname:hostname:ip:port or tunnelname:hostname:protocol:ip:port`
      );
    }
    
    let name, hostname, protocol = '', ip, port;
    if (parts.length === 5) {
      [name, hostname, protocol, ip, port] = parts;
    } else {
      [name, hostname, ip, port] = parts;
    }
    
    config.tunnels.push({
      index,
      name: name.trim(),
      hostname: hostname.trim(),
      protocol: protocol.trim(),
      ip: ip.trim(),
      port: port.trim()
    });
    
    index++;
  }
  
  return config;
}

function reportConfigStatus(config) {
  const present = [];
  const missing = [];
  if (config.apiKey) present.push('CLOUDFLARED_API_KEY'); else missing.push('CLOUDFLARED_API_KEY');
  if (config.email) present.push('CLOUDFLARED_EMAIL'); else missing.push('CLOUDFLARED_EMAIL');
  if (config.accountId) present.push('CLOUDFLARED_ACCOUNT_ID'); else missing.push('CLOUDFLARED_ACCOUNT_ID');
  if (config.tunnelToken) present.push('CLOUDFLARED_TUNNEL_TOKEN');
  if (config.zoneId) present.push('CLOUDFLARED_ZONE_ID');
  else if (config.zoneName) present.push('CLOUDFLARED_ZONE_NAME');
  else missing.push('CLOUDFLARED_ZONE_ID|CLOUDFLARED_ZONE_NAME (optional)');
  if (config.tunnels.length > 0) present.push(`CLOUDFLARED_TUNNEL_* (${config.tunnels.length})`);
  else missing.push('CLOUDFLARED_TUNNEL_1+');
  return { missing, present };
}

function validate(config) {
  const errors = [];
  if (!config.apiKey) errors.push('CLOUDFLARED_API_KEY is required');
  if (!config.email) errors.push('CLOUDFLARED_EMAIL is required');
  if (!config.accountId) errors.push('CLOUDFLARED_ACCOUNT_ID is required');
  if (config.tunnels.length === 0) errors.push('At least one tunnel configuration is required');
  
  config.tunnels.forEach(tunnel => {
    if (!tunnel.name) errors.push(`Tunnel ${tunnel.index}: name is required`);
    if (!tunnel.hostname) errors.push(`Tunnel ${tunnel.index}: hostname is required`);
    if (!tunnel.ip) errors.push(`Tunnel ${tunnel.index}: ip is required`);
    if (!tunnel.port) errors.push(`Tunnel ${tunnel.index}: port is required`);
    const portNum = parseInt(tunnel.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Tunnel ${tunnel.index}: invalid port number ${tunnel.port}`);
    }
  });
  
  const tunnelNames = Array.from(new Set(config.tunnels.map(t => t.name)));
  if (tunnelNames.length > 1) {
    errors.push(`All tunnel entries must share the same tunnel name. Found: ${tunnelNames.join(', ')}`);
  }
  
  const hostnames = config.tunnels.map(t => t.hostname);
  const dupHostnames = hostnames.filter((name, index) => hostnames.indexOf(name) !== index);
  if (dupHostnames.length > 0) {
    errors.push(`Duplicate hostnames found: ${dupHostnames.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Configuration validation failed:\\n' + errors.map(e => `  - ${e}`).join('\\n'));
  }
}

function getRunnerDataDir(cwd) { return path.join(cwd, '.runner-data'); }
function getLogsDir(cwd) { return path.join(getRunnerDataDir(cwd), 'logs'); }
function getCloudflaredLogsDir(cwd) { return path.join(getLogsDir(cwd), 'cloudflared'); }
function getPidDir(cwd) { return path.join(getRunnerDataDir(cwd), 'pid'); }
function getDataServicesDir(cwd) { return path.join(getRunnerDataDir(cwd), 'data-services'); }
function getCredentialsDir(cwd) { return path.join(getRunnerDataDir(cwd), 'credentials'); }
function getConfigDir(cwd) { return path.join(getRunnerDataDir(cwd), 'config'); }
function getTmpDir(cwd) { return path.join(getRunnerDataDir(cwd), 'tmp'); }
function getBinDir(cwd) { return path.join(getRunnerDataDir(cwd), 'bin'); }

module.exports = {
  parseInput,
  reportConfigStatus,
  validate,
  getRunnerDataDir,
  getLogsDir,
  getCloudflaredLogsDir,
  getPidDir,
  getDataServicesDir,
  getCredentialsDir,
  getConfigDir,
  getTmpDir,
  getBinDir
};
