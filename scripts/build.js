#!/usr/bin/env node

/**
 * Build script
 * Validates package structure and dependencies
 */

const fs = require('fs');
const path = require('path');
const { getVietnamTime } = require('../src/utils/time');

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Validate package structure
 */
function validatePackageStructure() {
  console.log('Validating package structure...');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'src/index.js',
    'bin/cloudflared-tunnel-start.js',
    'src/cli/commands.js',
    'src/core/config.js',
    'src/core/tunnel-manager.js',
    'src/core/cloudflare-client.js',
    'src/core/cloudflared-installer.js',
    'src/adapters/fs-adapter.js',
    'src/adapters/http-adapter.js',
    'src/adapters/process-adapter.js',
    'src/utils/logger.js',
    'src/utils/time.js',
    'src/utils/errors.js',
    'src/utils/retry.js'
  ];
  
  const missing = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fileExists(filePath)) {
      missing.push(file);
    }
  });
  
  if (missing.length > 0) {
    console.error('Missing required files:');
    missing.forEach(file => console.error(`  - ${file}`));
    return false;
  }
  
  console.log('✓ All required files present');
  return true;
}

/**
 * Validate package.json
 */
function validatePackageJson() {
  console.log('Validating package.json...');
  
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  const required = ['name', 'version', 'description', 'main', 'bin', 'files'];
  const missing = required.filter(field => !pkg[field]);
  
  if (missing.length > 0) {
    console.error('Missing required fields in package.json:');
    missing.forEach(field => console.error(`  - ${field}`));
    return false;
  }
  
  console.log('✓ package.json is valid');
  console.log(`  Name: ${pkg.name}`);
  console.log(`  Version: ${pkg.version}`);
  return true;
}

/**
 * Check dependencies
 */
function checkDependencies() {
  console.log('Checking dependencies...');
  
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  const deps = Object.keys(pkg.dependencies || {});
  console.log(`  Dependencies: ${deps.join(', ')}`);
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, '../node_modules');
  if (!fileExists(nodeModulesPath)) {
    console.warn('⚠ node_modules not found. Run: npm install');
    return false;
  }
  
  console.log('✓ Dependencies check passed');
  return true;
}

/**
 * Main build function
 */
function build() {
  console.log('='.repeat(60));
  console.log('Build Script');
  console.log(`Time: ${getVietnamTime()}`);
  console.log('='.repeat(60));
  
  const checks = [
    validatePackageStructure,
    validatePackageJson,
    checkDependencies
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  });
  
  if (allPassed) {
    console.log('='.repeat(60));
    console.log('✓ Build validation passed');
    console.log('='.repeat(60));
    return 0;
  } else {
    console.log('='.repeat(60));
    console.log('✗ Build validation failed');
    console.log('='.repeat(60));
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  const exitCode = build();
  process.exit(exitCode);
}

module.exports = { build };
