# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Tunnel status monitoring
- Automatic tunnel restart on failure
- Metrics and health checks
- Support for additional tunnel protocols
- Web dashboard for tunnel management
- Docker container support
- Kubernetes deployment examples

---

For more information, see the [README](README.md) and [EXAMPLES](EXAMPLES.md).
