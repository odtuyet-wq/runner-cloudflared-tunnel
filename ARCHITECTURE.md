# Architecture Documentation

## Overview

`runner-cloudflared-tunnel` is a Node.js package designed with a clean, modular architecture following Domain-Driven Design principles. The package is structured to be both a CLI tool and a library, with clear separation of concerns.

## Design Principles

1. **Module Format**: CommonJS (CJS) for maximum compatibility
2. **Cross-platform**: Windows and Linux support with automatic adaptation
3. **Error Handling**: Custom error classes with specific exit codes
4. **Logging**: Comprehensive logging with Vietnam timezone
5. **File Organization**: Adapter pattern for external dependencies
6. **Business Logic**: Isolated in core modules

## Directory Structure

```
runner-cloudflared-tunnel/
├── bin/                          # CLI executables
│   └── cloudflared-tunnel-start.js   # Main CLI entry point
│
├── src/                          # Source code
│   ├── adapters/                 # External integrations
│   │   ├── fs-adapter.js         # File system operations
│   │   ├── http-adapter.js       # HTTP/Cloudflare API
│   │   └── process-adapter.js    # Process execution
│   │
│   ├── cli/                      # CLI layer
│   │   └── commands.js           # Command parsing and execution
│   │
│   ├── core/                     # Business logic
│   │   ├── config.js             # Configuration parsing and validation
│   │   ├── cloudflare-client.js  # Cloudflare API client
│   │   ├── cloudflared-installer.js  # Installation logic
│   │   └── tunnel-manager.js     # Main orchestration
│   │
│   ├── utils/                    # Utilities
│   │   ├── logger.js             # Logging system
│   │   ├── time.js               # Time utilities (Vietnam timezone)
│   │   ├── errors.js             # Custom error classes
│   │   └── retry.js              # Retry logic
│   │
│   └── index.js                  # Library entry point
│
├── scripts/                      # Build/deploy scripts
│   ├── build.js                  # Build validation
│   ├── version-bump.js           # Version management
│   └── publish.js                # NPM publishing
│
├── package.json                  # Package configuration
├── README.md                     # Main documentation
├── EXAMPLES.md                   # Usage examples
├── ARCHITECTURE.md               # This file
├── LICENSE                       # MIT License
├── .gitignore                    # Git ignore rules
├── .npmignore                    # NPM ignore rules
└── .env.example                  # Environment variables template
```

## Module Breakdown

### 1. Adapters Layer

Adapters handle all external dependencies and I/O operations.

#### fs-adapter.js
**Purpose**: Cross-platform file system operations

**Key Functions**:
- `ensureDir(dirPath, mode)` - Create directory with permissions
- `readJson(filePath)` - Read and parse JSON file
- `writeJson(filePath, data, mode)` - Atomic JSON write
- `readText(filePath)` - Read text file
- `writeText(filePath, content, mode)` - Write text file
- `makeExecutable(filePath)` - Set executable permissions (Linux)

**Cross-platform Handling**:
- Automatic detection of Windows vs Linux
- Permission handling (chmod) only on Linux
- Atomic writes with temp files

#### http-adapter.js
**Purpose**: HTTP requests to Cloudflare API

**Key Functions**:
- `get(endpoint, options)` - GET request
- `post(endpoint, body, options)` - POST request
- `put(endpoint, body, options)` - PUT request
- `del(endpoint, options)` - DELETE request
- `downloadFile(url, destPath)` - File download

**Features**:
- Timeout support (default 30s)
- Automatic retry with exponential backoff
- Error handling with CloudflareApiError
- Uses native Node.js fetch (Node 20+)

#### process-adapter.js
**Purpose**: Cross-platform process execution

**Key Functions**:
- `commandExists(command)` - Check if command is available
- `execute(command, args, options)` - Execute command with output capture
- `executeWithSudoFallback(command, args, options)` - Try sudo first, fallback to non-sudo
- `spawnDetached(command, args, options)` - Spawn daemon process
- `isProcessRunning(pid)` - Check if process is running

**Cross-platform Handling**:
- Uses `cross-spawn` for Windows compatibility
- Sudo fallback logic for Linux
- CI environment detection (GitHub Actions, Azure Pipelines)

### 2. Core Layer

Core modules contain all business logic.

#### config.js
**Purpose**: Configuration parsing and validation

**Pipeline**:
```
parseInput() → validate() → getters for directories
```

**Key Functions**:
- `parseInput()` - Parse environment variables
- `validate(config)` - Validate configuration
- `getRunnerDataDir(cwd)` - Get .runner-data path
- `getLogsDir(cwd)` - Get logs directory
- `getCredentialsDir(cwd)` - Get credentials directory

**Environment Variables**:
- `CLOUDFLARED_API_KEY` - Required
- `CLOUDFLARED_EMAIL` - Required
- `CLOUDFLARED_ACCOUNT_ID` - Required
- `CLOUDFLARED_TUNNEL_{N}` - Tunnel configs (N = 1, 2, 3...)
- `TOOL_CWD` - Working directory
- `CLOUDFLARED_EXE_PATH` - Custom executable path

#### cloudflare-client.js
**Purpose**: Cloudflare API interaction

**Key Methods**:
- `listTunnels()` - Get all tunnels
- `getTunnelByName(name)` - Find tunnel by name
- `createTunnel(name)` - Create new tunnel
- `getTunnelToken(tunnelId)` - Get tunnel credentials
- `getOrCreateTunnel(name)` - Idempotent tunnel creation
- `getOrCreateDnsRecord(hostname, tunnelId)` - Setup DNS

**API Endpoints Used**:
- `GET /accounts/{accountId}/cfd_tunnel` - List tunnels
- `POST /accounts/{accountId}/cfd_tunnel` - Create tunnel
- `GET /accounts/{accountId}/cfd_tunnel/{tunnelId}/token` - Get token
- `GET /zones/{zoneId}/dns_records` - List DNS records
- `POST /zones/{zoneId}/dns_records` - Create DNS record

#### cloudflared-installer.js
**Purpose**: Install cloudflared if not present

**Installation Methods**:
- **Windows**: Chocolatey or direct binary download
- **Linux**: Direct binary download to /usr/local/bin

**Key Methods**:
- `isInstalled()` - Check if cloudflared exists
- `getCloudflaredPath()` - Get path to executable
- `install()` - Install cloudflared
- `installWindows()` - Windows-specific installation
- `installLinux()` - Linux-specific installation

#### tunnel-manager.js
**Purpose**: Main orchestration of tunnel setup

**Execution Pipeline**:
```
execute() {
  1. Install cloudflared
  2. Setup directories
  3. For each tunnel:
     - Get/create tunnel via API
     - Get tunnel token
     - Create credentials file
     - Setup DNS record
  4. Generate config.yml
  5. Start cloudflared daemon
  6. Verify tunnels are running
}
```

**Key Methods**:
- `execute()` - Main execution pipeline
- `setupDirectories()` - Create required directories
- `processTunnel(tunnel)` - Process single tunnel
- `createCredentialsFile(tunnelInfo, token)` - Save credentials
- `generateConfigFile()` - Create cloudflared config
- `startTunnels()` - Start cloudflared daemon
- `verifyTunnels()` - Verify tunnels are running

### 3. Utils Layer

Utility modules provide cross-cutting concerns.

#### logger.js
**Purpose**: Structured logging with file support

**Features**:
- Three log levels: quiet, info, verbose
- Console and file logging
- Timestamp with Vietnam timezone
- Package name and version in logs
- Sensitive data masking

**Key Functions**:
- `init(packageName, version, options)` - Initialize logger
- `info(message)` - Info level log
- `verbose(message)` - Verbose level log
- `warn(message)` - Warning log
- `error(message, err)` - Error log
- `success(message)` - Success log
- `section(title)` - Section header
- `logConfig(config, sensitiveKeys)` - Log config with masking
- `maskSensitive(value, showLength)` - Mask sensitive data

#### time.js
**Purpose**: Time utilities with Vietnam timezone

**Key Functions**:
- `getVietnamTime()` - Current time in Asia/Ho_Chi_Minh
- `getVietnamDate()` - Current date (yyyy-MM-dd)
- `sleep(ms)` - Async sleep

**Format**: `yyyy-MM-dd HH:mm:ss`

#### errors.js
**Purpose**: Custom error classes with exit codes

**Error Classes**:
- `ValidationError` - Exit code 2
- `NetworkError` - Exit code 10
- `ProcessError` - Exit code 20
- `ConfigError` - Exit code 2
- `CloudflareApiError` - Exit code 10

**Key Functions**:
- `handleError(error, logger)` - Handle error and exit

#### retry.js
**Purpose**: Retry logic for network operations

**Key Functions**:
- `retry(fn, options)` - Retry with exponential backoff
- `retryIf(fn, shouldRetry, options)` - Conditional retry

### 4. CLI Layer

#### commands.js
**Purpose**: CLI command parsing and execution

**Key Functions**:
- `createProgram()` - Create Commander program
- `runTunnelStart(options)` - Execute tunnel start
- `execute(argv)` - Parse and execute CLI

**CLI Options**:
- `--cwd <path>` - Working directory
- `--verbose` - Verbose logging
- `--quiet` - Quiet mode
- `--log-file <path>` - Custom log file
- `--version` - Show version
- `--help` - Show help

### 5. Scripts Layer

Build and deployment automation.

#### build.js
**Purpose**: Validate package structure

**Checks**:
- All required files present
- package.json is valid
- Dependencies are installed

#### version-bump.js
**Purpose**: Semantic version management

**Features**:
- Bump major, minor, or patch version
- Vietnam timezone in logs

#### publish.js
**Purpose**: NPM package publishing

**Workflow**:
1. Run build validation
2. Publish to npm registry

## Data Flow

### CLI Execution Flow

```
User runs CLI
    ↓
bin/cloudflared-tunnel-start.js
    ↓
src/cli/commands.js → execute()
    ↓
Parse options (Commander)
    ↓
src/core/config.js → parseInput()
    ↓
src/core/config.js → validate()
    ↓
src/core/tunnel-manager.js → execute()
    ↓
  Install cloudflared (if needed)
    ↓
  Setup directories
    ↓
  For each tunnel:
    ├→ Cloudflare API: Get/Create tunnel
    ├→ Cloudflare API: Get token
    ├→ Save credentials file
    └→ Cloudflare API: Setup DNS
    ↓
  Generate config.yml
    ↓
  Start cloudflared daemon
    ↓
  Verify tunnels
    ↓
Generate report
    ↓
Exit with code 0 or error code
```

### Library Usage Flow

```
User imports package
    ↓
const { startTunnels } = require('runner-cloudflared-tunnel')
    ↓
await startTunnels(options)
    ↓
Same flow as CLI but returns report object
    ↓
User handles report/errors
```

## File Layout at Runtime

After successful execution, the working directory contains:

```
<cwd>/
  .runner-data/
    ├── logs/
    │   ├── cloudflared-tunnel.log        # Package logs
    │   └── cloudflared/
    │       └── cloudflared.log           # Daemon logs
    │
    ├── pid/
    │   └── cloudflared.pid               # Process ID
    │
    ├── credentials/
    │   └── <tunnel-id>.json              # Tunnel credentials
    │
    ├── config/
    │   └── config.yml                    # Cloudflared config
    │
    └── data-services/                    # Reserved for future use
```

## Error Handling Strategy

1. **Parse Phase**: ConfigError, ValidationError → Exit 2
2. **API Phase**: NetworkError, CloudflareApiError → Exit 10
3. **Execution Phase**: ProcessError → Exit 20
4. **Unknown**: Generic Error → Exit 1

Each error includes:
- Descriptive message
- Hint for resolution
- Stack trace (verbose mode)
- Logged to file

## Cross-Platform Strategy

### File Paths
- Use `path.join()` for all paths
- Never hardcode `/` or `\`

### Permissions
- Check `isWindows` before chmod operations
- Default to 0o755 for directories, 0o644 for files
- Gracefully handle permission errors

### Process Execution
- Use `cross-spawn` for spawning
- Implement sudo fallback for Linux
- Check command existence before use

### CI/CD Detection
- Detect GitHub Actions via `GITHUB_ACTIONS`
- Detect Azure Pipelines via `TF_BUILD`
- Adapt behavior for CI users (runner, vsts)

## Performance Considerations

1. **Retry Logic**: Max 3 attempts with exponential backoff
2. **Timeouts**: 30s for API, 60s for downloads
3. **Async Operations**: All I/O is async
4. **Atomic Writes**: Use temp files for JSON writes

## Security Considerations

1. **Credentials**: Stored with 0o600 permissions
2. **Logging**: Sensitive data is masked
3. **API Keys**: Never logged in plain text
4. **File Permissions**: Proper chmod on Linux

## Testing Strategy (Not Implemented)

Future testing recommendations:

1. **Unit Tests**:
   - Mock all adapters
   - Test core logic in isolation

2. **Integration Tests**:
   - Test with actual Cloudflare API (test account)
   - Test on Windows and Linux

3. **E2E Tests**:
   - Run in GitHub Actions
   - Verify tunnels are accessible

## Extension Points

To add new features:

1. **New Command**: Add to `cli/commands.js`
2. **New Adapter**: Create in `adapters/`
3. **New Core Logic**: Add to `core/`
4. **New Utility**: Add to `utils/`

## Maintenance

- All logs include version number for debugging
- Clear separation of concerns for easy updates
- Minimal dependencies for stability
- Comprehensive error messages for troubleshooting
