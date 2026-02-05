const { Command } = require('commander');
const path = require('path');
const packageJson = require('../../package.json');
const logger = require('../utils/logger');
const { parseInput, reportConfigStatus, validate, getLogsDir } = require('../core/config');
const { plan } = require('../core/plan');
const TunnelManager = require('../core/tunnel-manager');
const { handleError } = require('../utils/errors');
const { getVietnamDate } = require('../utils/time');

function createProgram() {
  const program = new Command();
  
  program
    .name('cloudflared-tunnel-start')
    .description('Create and manage Cloudflare tunnels for CI/CD runners')
    .version(packageJson.version)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .option('--verbose', 'Enable verbose logging')
    .option('--quiet', 'Suppress non-error output')
    .option('--log-file <path>', 'Log file path (default: .runner-data/logs/cloudflared-tunnel.log)');
  
  return program;
}

async function runTunnelStart(options) {
  const startTime = Date.now();
  
  try {
    const config = parseInput();
    
    if (options.cwd) {
      config.cwd = path.resolve(options.cwd);
    }
    
    const logFile = options.logFile || path.join(getLogsDir(config.cwd), 'cloudflared-tunnel.log');
    
    logger.init(packageJson.name, packageJson.version, {
      verbose: options.verbose,
      quiet: options.quiet,
      logFile,
      commandName: 'cloudflared-tunnel-start'
    });
    
    logger.section('Cloudflare Tunnel Manager');
    logger.info(`Đang thực thi version: ${packageJson.version}`);
    logger.info(`Version: ${packageJson.version}`);
    logger.info('Command: cloudflared-tunnel-start');
    logger.info(`Date: ${getVietnamDate()}`);
    logger.info(`Working directory: ${config.cwd}`);
    logger.info(`Log file: ${logFile}`);
    
    logger.logConfig(config, ['apiKey', 'tunnelToken']);
    const status = reportConfigStatus(config);
    logger.info(`Config present: ${status.present.join(', ') || 'none'}`);
    logger.info(`Config missing: ${status.missing.join(', ') || 'none'}`);
    
    logger.section('Validating Configuration');
    validate(config);
    logger.success('Configuration is valid');
    
    const planResult = plan(config, logger);

    const manager = new TunnelManager({ ...config, plan: planResult }, logger);
    await manager.execute();
    
    const report = manager.generateReport();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.section('Execution Summary');
    logger.success(`Tunnel setup completed successfully in ${duration}s`);
    logger.info('All tunnels are now accessible from the internet');
    
    process.exit(0);
  } catch (error) {
    handleError(error, logger);
  }
}

async function execute(argv = process.argv) {
  const program = createProgram();
  
  program.action(async (options) => {
    await runTunnelStart(options);
  });
  
  await program.parseAsync(argv);
}

module.exports = {
  createProgram,
  execute,
  runTunnelStart
};
