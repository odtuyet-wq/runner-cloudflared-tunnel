const { parseInput, reportConfigStatus, validate } = require('./core/config');
const { plan } = require('./core/plan');
const TunnelManager = require('./core/tunnel-manager');
const CloudflareClient = require('./core/cloudflare-client');
const CloudflaredInstaller = require('./core/cloudflared-installer');
const logger = require('./utils/logger');
const packageJson = require('../package.json');

async function startTunnels(options = {}) {
  const config = parseInput();
  Object.assign(config, options);
  
  logger.init(packageJson.name, packageJson.version, {
    verbose: options.verbose || false,
    quiet: options.quiet || false,
    logFile: options.logFile || null,
    commandName: options.commandName || 'cloudflared-tunnel-start'
  });

  logger.logConfig(config, ['apiKey', 'tunnelToken']);
  const status = reportConfigStatus(config);
  logger.info(`Config present: ${status.present.join(', ') || 'none'}`);
  logger.info(`Config missing: ${status.missing.join(', ') || 'none'}`);
  
  validate(config);
  const planResult = plan(config, logger);
  
  const manager = new TunnelManager({ ...config, plan: planResult }, logger);
  await manager.execute();
  
  return manager.generateReport();
}

function getVersion() {
  return packageJson.version;
}

module.exports = {
  startTunnels,
  getVersion,
  TunnelManager,
  CloudflareClient,
  CloudflaredInstaller,
  logger,
  parseInput,
  validate,
  plan
};
