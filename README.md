# runner-cloudflared-tunnel

Create and manage Cloudflare tunnels for GitHub Actions and Azure Pipeline runners with **metadata integration** for remote SSH management.

## Version 1.0.1 Updates

✅ **Metadata Integration**: Writes tunnel info to `/var/tmp/runner-tailscale-sync-metadata.json` for remote management  
✅ **Token Masking**: All tunnel tokens and secrets are masked in logs  
✅ **Remote Management**: SSH users can view logs, check status, and stop tunnels  
✅ **PID Tracking**: Cloudflared process ID stored in metadata for easy management  

## Features

- Cross-platform support (Windows & Linux/Ubuntu)
- CI/CD optimized (GitHub Actions, Azure Pipelines)
- Automatic cloudflared installation
- Multiple services per tunnel
- Automatic DNS record management
- **Metadata export** for remote SSH access
- Comprehensive logging with **token masking**

## Quick Start

```bash
npm install -g runner-cloudflared-tunnel

# Set environment variables
export CLOUDFLARED_API_KEY="your_api_key"
export CLOUDFLARED_EMAIL="you@example.com"
export CLOUDFLARED_ACCOUNT_ID="your_account_id"
export CLOUDFLARED_TUNNEL_1="my-tunnel:ssh.example.com:localhost:22"

# Start tunnel
cloudflared-tunnel-start --verbose
```

## Remote Management (SSH)

After tunnel starts, metadata is written to `/var/tmp/runner-tailscale-sync-metadata.json`:

```bash
# View metadata
cat /var/tmp/runner-tailscale-sync-metadata.json

# View logs
cat $(jq -r .cloudflared.files.logFile /var/tmp/runner-tailscale-sync-metadata.json)

# Stop tunnel
kill $(jq -r .cloudflared.pid /var/tmp/runner-tailscale-sync-metadata.json)
```

## Configuration

Required environment variables:
- `CLOUDFLARED_API_KEY` - Cloudflare Global API Key
- `CLOUDFLARED_EMAIL` - Cloudflare account email
- `CLOUDFLARED_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARED_TUNNEL_N` - Tunnel configs (N=1,2,3...)

Format: `tunnelname:hostname:ip:port` or `tunnelname:hostname:protocol:ip:port`

## Documentation

See full documentation in `EXAMPLES.md` and `ARCHITECTURE.md`

## License

MIT
