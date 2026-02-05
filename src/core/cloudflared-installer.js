const path = require('path');
const os = require('os');
const { commandExists, execute, executeWithSudoFallback, isWindows } = require('../adapters/process-adapter');
const { downloadFile } = require('../adapters/http-adapter');
const { exists, makeExecutable, ensureDir } = require('../adapters/fs-adapter');
const { ProcessError } = require('../utils/errors');
const { getBinDir, getTmpDir } = require('./config');

class CloudflaredInstaller {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.customPath = config.cloudflaredPath || '';
  }

  setCloudflaredPath(cloudflaredPath) {
    this.customPath = cloudflaredPath || '';
    this.config.cloudflaredPath = this.customPath;
  }
  
  async getCloudflaredPath() {
    if (this.customPath && exists(this.customPath)) {
      this.logger.info(`Using custom cloudflared path: ${this.customPath}`);
      return this.customPath;
    }
    
    if (await commandExists('cloudflared')) {
      this.logger.info('cloudflared found in PATH');
      return 'cloudflared';
    }
    
    return null;
  }
  
  async isInstalled() {
    const path = await this.getCloudflaredPath();
    return path !== null;
  }
  
  async installWindows() {
    this.logger.info('Installing cloudflared on Windows...');
    
    if (await commandExists('choco')) {
      this.logger.info('Installing via Chocolatey...');
      const result = await execute('choco', ['install', 'cloudflared', '-y'], {
        logger: this.logger,
        timeout: 300000
      });
      
      if (result.code !== 0) {
        throw new ProcessError(
          'Failed to install cloudflared via Chocolatey',
          result.code,
          result.stderr
        );
      }
      
      this.logger.success('cloudflared installed via Chocolatey');
      return;
    }
    
    this.logger.warn('Chocolatey not found, downloading binary directly...');
    await this.downloadWindowsBinary();
  }
  
  async downloadWindowsBinary() {
    const arch = os.arch() === 'x64' ? 'amd64' : '386';
    const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${arch}.exe`;
    const binDir = getBinDir(this.config.cwd);
    ensureDir(binDir);
    const destPath = path.join(binDir, 'cloudflared.exe');
    
    this.logger.info(`Downloading cloudflared from ${url}...`);
    await downloadFile(url, destPath);
    
    this.logger.success(`cloudflared downloaded to ${destPath}`);
    this.setCloudflaredPath(destPath);
  }
  
  async installLinux() {
    this.logger.info('Installing cloudflared on Linux...');
    
    const arch = os.arch() === 'x64' ? 'amd64' : (os.arch() === 'arm64' ? 'arm64' : 'arm');
    const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}`;
    const tempDir = getTmpDir(this.config.cwd);
    ensureDir(tempDir);
    const tempPath = path.join(tempDir, 'cloudflared');
    const binDir = getBinDir(this.config.cwd);
    ensureDir(binDir);
    const targetPath = path.join(binDir, 'cloudflared');
    
    this.logger.info(`Downloading cloudflared from ${url}...`);
    await downloadFile(url, tempPath);
    
    makeExecutable(tempPath);
    this.logger.info(`Installing to ${targetPath}...`);
    
    try {
      const result = await executeWithSudoFallback('mv', [tempPath, targetPath], {
        logger: this.logger
      });
      
      if (result.code === 0) {
        await executeWithSudoFallback('chmod', ['755', targetPath], {
          logger: this.logger
        });
        
        this.logger.success(`cloudflared installed to ${targetPath}`);
        this.setCloudflaredPath(targetPath);
      } else {
        this.logger.warn(`Could not install to ${targetPath}, using temporary location`);
        this.setCloudflaredPath(tempPath);
      }
    } catch (error) {
      this.logger.warn(`Installation to ${targetPath} failed: ${error.message}`);
      this.setCloudflaredPath(tempPath);
    }
  }
  
  async install() {
    if (await this.isInstalled()) {
      this.logger.info('cloudflared is already installed');
      return;
    }
    
    this.logger.section('Installing cloudflared');
    
    if (isWindows) {
      await this.installWindows();
    } else {
      await this.installLinux();
    }
    
    if (!await this.isInstalled()) {
      throw new ProcessError('cloudflared installation failed', 1, '');
    }
    
    this.logger.success('cloudflared installation completed');
  }
  
  async getVersion() {
    const cloudflaredPath = await this.getCloudflaredPath();
    if (!cloudflaredPath) {
      return 'not installed';
    }
    
    try {
      const result = await executeWithSudoFallback(cloudflaredPath, ['--version'], {
        logger: this.logger
      });
      return result.stdout || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}

module.exports = CloudflaredInstaller;
