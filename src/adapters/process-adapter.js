const spawn = require('cross-spawn');
const os = require('os');
const { ProcessError } = require('../utils/errors');

const isWindows = os.platform() === 'win32';
const isLinux = os.platform() === 'linux';

function isCI() {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.AZURE_PIPELINES ||
    process.env.TF_BUILD
  );
}

function getCIUser() {
  if (process.env.GITHUB_ACTIONS) return 'runner';
  if (process.env.AZURE_PIPELINES || process.env.TF_BUILD) return 'vsts';
  return null;
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const checkCmd = isWindows ? 'where' : 'which';
    const child = spawn(checkCmd, [command], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function execute(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdio = 'pipe',
    timeout = 0,
    logger = null
  } = options;
  
  return new Promise((resolve, reject) => {
    if (logger) {
      logger.verbose(`Executing: ${command} ${args.join(' ')}`);
    }
    
    const child = spawn(command, args, {
      cwd,
      env,
      stdio,
      windowsHide: true
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new ProcessError(`Command timeout after ${timeout}ms`, -1, stderr));
      }, timeout);
    }
    
    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new ProcessError(`Failed to execute ${command}: ${error.message}`, -1, ''));
    });
  });
}

async function executeWithSudoFallback(command, args = [], options = {}) {
  const { logger = null } = options;
  
  if (isWindows) {
    return execute(command, args, options);
  }
  
  try {
    if (logger) {
      logger.verbose(`Trying with sudo: ${command} ${args.join(' ')}`);
    }
    
    const result = await execute('sudo', [command, ...args], { ...options, timeout: options.timeout || 30000 });
    
    if (result.code === 0) {
      return result;
    }
    
    if (logger) {
      const stderrText = result.stderr ? ` stderr: ${result.stderr}` : '';
      logger.warn(`Sudo failed (code ${result.code})${stderrText}, falling back to non-sudo execution`);
    }
  } catch (error) {
    if (logger) {
      logger.warn(`Sudo execution error: ${error.message}, falling back to non-sudo`);
    }
  }
  
  if (logger) {
    logger.verbose(`Executing without sudo: ${command} ${args.join(' ')}`);
  }
  
  return execute(command, args, options);
}

function spawnDetached(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdout = null,
    stderr = null,
    logger = null
  } = options;
  
  if (logger) {
    logger.verbose(`Spawning detached: ${command} ${args.join(' ')}`);
  }
  
  const spawnOptions = {
    cwd,
    env,
    detached: true,
    stdio: ['ignore', stdout || 'ignore', stderr || 'ignore'],
    windowsHide: true
  };
  
  const child = spawn(command, args, spawnOptions);
  child.unref();
  
  return child;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function killProcess(pid, signal = 'SIGTERM') {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  isWindows,
  isLinux,
  isCI,
  getCIUser,
  commandExists,
  execute,
  executeWithSudoFallback,
  spawnDetached,
  isProcessRunning,
  killProcess
};
