# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-02-04

### Added
- **Metadata Integration**: Tunnel information now written to `/var/tmp/runner-tailscale-sync-metadata.json`
  - Includes PID, tunnel ID, service mappings, and file paths
  - Enables remote SSH management of tunnels
- **Token Masking**: All tunnel tokens and secrets are now masked in logs
  - Protects sensitive data in console output
  - Protects sensitive data in log files
  - Automatic detection and masking of base64 tokens and API keys
- **Remote Management Commands**: SSH users can now:
  - View tunnel metadata: `cat /var/tmp/runner-tailscale-sync-metadata.json`
  - Check tunnel logs without knowing exact paths
  - Stop tunnel process: `kill <pid>` from metadata

### Changed
- Logger enhanced with `maskTokensInContent()` function
- HTTP adapter now masks tokens in verbose API logs
- Tunnel manager reports PID in execution summary
- Updated documentation with remote management examples

### Fixed
- Token exposure in verbose logs eliminated
- Improved error messages for missing metadata write permissions

## [1.0.0] - 2026-02-04

### Added
- Initial release of runner-cloudflared-tunnel
- Cross-platform support for Windows and Linux/Ubuntu
- Automatic cloudflared installation
- Multiple tunnels support in single configuration
- Cloudflare API integration for tunnel and DNS management
- Automatic DNS record creation
- CLI interface with commander
- Library interface for programmatic usage
- Comprehensive logging with Vietnam timezone
- Error handling with specific exit codes
- Sudo fallback for Linux operations
- CI/CD optimization for GitHub Actions and Azure Pipelines
- File permission handling (chmod) for Linux
- Custom working directory support (--cwd)
- Verbose and quiet modes
- Log file support
- PID file management
- Credentials file management
- Config file generation (YAML format)
- Process health checking
- Retry logic for network operations
- Timeout support for operations

### Features
- **CLI Commands**:
  - `cloudflared-tunnel-start` - Start Cloudflare tunnels

- **Configuration**:
  - Environment variable based configuration
  - Support for multiple tunnels via indexed variables
  - Optional custom cloudflared executable path
  - Configurable log levels
  - Configurable timeouts

- **Cross-platform Support**:
  - Windows: Chocolatey or direct binary download
  - Linux: Direct binary download with sudo fallback
  - Automatic OS detection
  - Path handling with Node.js path module
  - Cross-spawn for process execution

- **Logging**:
  - Console and file logging
  - Package name and version in all logs
  - Vietnam timezone (Asia/Ho_Chi_Minh)
  - Sensitive data masking
  - Structured log format

- **Error Handling**:
  - Custom error classes
  - Specific exit codes for different error types
  - Helpful error messages with hints
  - Stack traces in verbose mode

### Directory Structure
- `.runner-data/logs/` - Log files
- `.runner-data/pid/` - Process ID files
- `.runner-data/credentials/` - Tunnel credentials
- `.runner-data/config/` - Configuration files
- `.runner-data/data-services/` - Service data (reserved)

### Dependencies
- commander: ^12.0.0 - CLI framework
- cross-spawn: ^7.0.3 - Cross-platform process spawning

### Documentation
- README.md - Main documentation
- EXAMPLES.md - Usage examples
- ARCHITECTURE.md - Architecture documentation
- LICENSE - MIT License
- .env.example - Environment variables template

## [Unreleased]

### Planned Features
- Tunnel status monitoring dashboard
- Automatic tunnel restart on failure
- Metrics and health checks
- Support for additional tunnel protocols
- Web dashboard for tunnel management
- Docker container support
- Kubernetes deployment examples

---

For more information, see the [README](README.md) and [EXAMPLES](EXAMPLES.md).
