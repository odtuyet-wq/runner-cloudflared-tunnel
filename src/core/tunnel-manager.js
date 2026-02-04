const path = require("path");
const fs = require("fs");
const CloudflareClient = require("./cloudflare-client");
const CloudflaredInstaller = require("./cloudflared-installer");
const { getCredentialsDir, getConfigDir, getCloudflaredLogsDir, getPidDir } = require("./config");
const { ensureDir, writeJson, writeText, readJson, readText } = require("../adapters/fs-adapter");
const { spawnDetached } = require("../adapters/process-adapter");
const { sleep } = require("../utils/time");
const { ProcessError } = require("../utils/errors");
const { isProcessRunning } = require("../adapters/process-adapter");

/**
 * Tunnel manager - Core business logic
 * Handles complete tunnel setup workflow
 */

class TunnelManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = new CloudflareClient(config, logger);
    this.installer = new CloudflaredInstaller(config, logger);
    this.tunnelData = [];
  }

  /**
   * Execute complete tunnel setup workflow
   * @returns {Promise<void>}
   */
  async execute() {
    this.logger.section("Starting Cloudflare Tunnel Setup");

    // Step 1: Install cloudflared if needed
    await this.installer.install();

    // Step 2: Setup directories
    this.setupDirectories();

    // Step 3: Process each tunnel
    for (const tunnel of this.config.tunnels) {
      await this.processTunnel(tunnel);
    }

    // Step 4: Generate config file
    await this.generateConfigFile();

    // Step 5: Start all tunnels
    await this.startTunnels();

    // Step 6: Verify tunnels are running
    await this.verifyTunnels();
  }

  /**
   * Setup required directories
   */
  setupDirectories() {
    this.logger.info("Setting up directories...");

    const dirs = [
      getCredentialsDir(this.config.cwd),
      getConfigDir(this.config.cwd),
      getCloudflaredLogsDir(this.config.cwd),
      getPidDir(this.config.cwd),
    ];

    dirs.forEach((dir) => {
      ensureDir(dir, 0o755);
      this.logger.verbose(`Created directory: ${dir}`);
    });

    this.logger.success("Directories setup completed");
  }

  /**
   * Process single tunnel configuration
   * @param {object} tunnel - Tunnel configuration
   * @returns {Promise<void>}
   */
  async processTunnel(tunnel) {
    this.logger.section(`Processing Tunnel: ${tunnel.name}`);

    // Get or create tunnel
    const tunnelInfo = await this.client.getOrCreateTunnel(tunnel.name);

    // Get tunnel token
    this.logger.info("Fetching tunnel token...");
    const token = await this.client.getTunnelToken(tunnelInfo.id);
    this.logger.success("Tunnel token retrieved");

    // Create credentials file
    await this.createCredentialsFile(tunnelInfo, token);

    // Setup DNS record
    await this.setupDnsRecord(tunnel.hostname, tunnelInfo.id);

    // Store tunnel data
    this.tunnelData.push({
      tunnel,
      tunnelInfo,
      token,
      credentialsPath: this.getCredentialsPath(tunnelInfo.id),
    });

    this.logger.success(`Tunnel ${tunnel.name} processed successfully`);
  }

  /**
   * Create credentials file for tunnel
   * @param {object} tunnelInfo - Tunnel information
   * @param {string} token - Tunnel token
   * @returns {Promise<void>}
   */
  async createCredentialsFile(tunnelInfo, token) {
    const credentialsPath = this.getCredentialsPath(tunnelInfo.id);

    this.logger.info(`Creating credentials file: ${credentialsPath}`);

    const credentials = {
      AccountTag: this.config.accountId,
      TunnelSecret: token,
      TunnelID: tunnelInfo.id,
    };

    writeJson(credentialsPath, credentials, 0o600);

    this.logger.success("Credentials file created");
  }

  /**
   * Get credentials file path
   * @param {string} tunnelId - Tunnel ID
   * @returns {string} Credentials file path
   */
  getCredentialsPath(tunnelId) {
    return path.join(getCredentialsDir(this.config.cwd), `${tunnelId}.json`);
  }

  /**
   * Setup DNS record for hostname
   * @param {string} hostname - Hostname
   * @param {string} tunnelId - Tunnel ID
   * @returns {Promise<void>}
   */
  async setupDnsRecord(hostname, tunnelId) {
    this.logger.info(`Setting up DNS record for ${hostname}...`);

    try {
      await this.client.getOrCreateDnsRecord(hostname, tunnelId);
      this.logger.success(`DNS record configured for ${hostname}`);
    } catch (error) {
      this.logger.warn(`Failed to setup DNS record: ${error.message}`);
      this.logger.warn("You may need to manually configure DNS records in Cloudflare dashboard");
    }
  }

  /**
   * Generate cloudflared config file
   * @returns {Promise<void>}
   */
  async generateConfigFile() {
    this.logger.section("Generating Cloudflared Configuration");

    const configPath = path.join(getConfigDir(this.config.cwd), "config.yml");

    const ingress = [];

    // Add entries for each tunnel
    this.tunnelData.forEach(({ tunnel }) => {
      ingress.push({
        hostname: tunnel.hostname,
        service: `${tunnel.ip}:${tunnel.port}`,
      });
    });

    // Add catch-all rule
    ingress.push({
      service: "http_status:404",
    });

    // Use first tunnel's credentials
    const firstTunnel = this.tunnelData[0];

    const config = {
      tunnel: firstTunnel.tunnelInfo.id,
      "credentials-file": firstTunnel.credentialsPath,
      ingress: ingress,
    };

    // Convert to YAML format manually
    const yamlContent = this.convertToYaml(config);

    writeText(configPath, yamlContent, 0o644);

    this.logger.success(`Configuration file created: ${configPath}`);
    this.logger.verbose("Configuration content:");
    this.logger.verbose(yamlContent);

    return configPath;
  }

  /**
   * Convert object to YAML format
   * @param {object} obj - Object to convert
   * @returns {string} YAML string
   */
  convertToYaml(obj, indent = 0) {
    const spaces = " ".repeat(indent);
    let yaml = "";

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach((item) => {
          if (typeof item === "object") {
            yaml += `${spaces}  -\n`;
            yaml += this.convertToYaml(item, indent + 4);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else if (typeof value === "object" && value !== null) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYaml(value, indent + 2);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Start cloudflared tunnels
   * @returns {Promise<void>}
   */
  async startTunnels() {
    this.logger.section("Starting Cloudflared Tunnels");

    const configPath = path.join(getConfigDir(this.config.cwd), "config.yml");
    const logPath = path.join(getCloudflaredLogsDir(this.config.cwd), "cloudflared.log");
    const pidPath = path.join(getPidDir(this.config.cwd), "cloudflared.pid");

    const cloudflaredPath = await this.installer.getCloudflaredPath();

    this.logger.info(`Starting cloudflared with config: ${configPath}`);

    // Ensure log file exists
    ensureDir(path.dirname(logPath));

    // Open log file
    const logStream = fs.createWriteStream(logPath, { flags: "a" });

    // Start cloudflared as detached process
    const child = spawnDetached(cloudflaredPath, ["tunnel", "--config", configPath, "run"], {
      cwd: this.config.cwd,
      stdout: logStream,
      stderr: logStream,
      logger: this.logger,
    });

    // Save PID
    writeText(pidPath, child.pid.toString(), 0o644);

    this.logger.success(`Cloudflared started with PID: ${child.pid}`);
    this.logger.info(`Logs: ${logPath}`);
    this.logger.info(`PID file: ${pidPath}`);

    // Wait a bit for process to start
    await sleep(3000);
  }

  /**
   * Verify tunnels are running
   * @returns {Promise<void>}
   */
  async verifyTunnels() {
    this.logger.section("Verifying Tunnel Status");

    const logPath = path.join(getCloudflaredLogsDir(this.config.cwd), "cloudflared.log");
    const pidPath = path.join(getPidDir(this.config.cwd), "cloudflared.pid");

    // Wait for tunnel to initialize
    this.logger.info("Waiting for tunnel to initialize...");
    await sleep(this.config.timeout || 5000);

    // Check if PID file exists
    const pidContent = readText(pidPath); // ✅ ĐÚNG
    if (!pidContent) {
      this.logger.error("PID file not found");
      throw new ProcessError("Tunnel failed to start - PID file not found", 1, "");
    }

    const pid = parseInt(pidContent.trim(), 10);
    this.logger.info(`Found PID: ${pid}`);

    // ✅ THÊM: Check process đang chạy
    if (!isProcessRunning(pid)) {
      this.logger.error(`Process ${pid} is not running`);

      // Check logs for error
      const logContent = readText(logPath) || "";
      if (logContent) {
        this.logger.error("Last logs:");
        const lastLines = logContent.split("\n").slice(-20).join("\n");
        this.logger.error(lastLines);
      }

      throw new ProcessError("Cloudflared process died after start", 1, "");
    }

    this.logger.success(`Process is running (PID: ${pid})`);

    // Check log file for errors
    const { readText } = require("../adapters/fs-adapter");
    const logContent = readText(logPath) || "";

    if (logContent.includes("error") || logContent.includes("failed")) {
      this.logger.error("Errors found in cloudflared logs:");
      this.logger.error(logContent);
      throw new ProcessError("Tunnel failed to start - check logs for details", 1, logContent);
    }

    if (logContent.includes("Registered tunnel connection")) {
      this.logger.success("Tunnel is running successfully!");
    } else {
      this.logger.warn("Tunnel may still be initializing - check logs for status");
    }

    this.logger.info(`Full logs available at: ${logPath}`);
  }

  /**
   * Generate execution report
   * @returns {object} Report data
   */
  generateReport() {
    this.logger.section("Execution Report");

    const report = {
      success: true,
      tunnelsConfigured: this.tunnelData.length,
      tunnels: this.tunnelData.map(({ tunnel, tunnelInfo }) => ({
        name: tunnel.name,
        hostname: tunnel.hostname,
        service: `${tunnel.ip}:${tunnel.port}`,
        tunnelId: tunnelInfo.id,
        status: "running",
      })),
      configFile: path.join(getConfigDir(this.config.cwd), "config.yml"),
      logFile: path.join(getCloudflaredLogsDir(this.config.cwd), "cloudflared.log"),
      pidFile: path.join(getPidDir(this.config.cwd), "cloudflared.pid"),
    };

    this.logger.info(`Tunnels configured: ${report.tunnelsConfigured}`);
    report.tunnels.forEach((t) => {
      this.logger.success(`✓ ${t.name}: ${t.hostname} -> ${t.service}`);
    });

    return report;
  }
}

module.exports = TunnelManager;
