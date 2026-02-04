#!/usr/bin/env node

/**
 * CLI entry point for cloudflared-tunnel-start
 */

const { execute } = require('../src/cli/commands');

// Execute CLI
execute(process.argv).catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
