#!/usr/bin/env node
const { spawn } = require('child_process');
const { getVietnamTime } = require('../src/utils/time');
const { build } = require('./build');

function execute(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function publish() {
  console.log('='.repeat(60));
  console.log('Publish Script');
  console.log(`Time: ${getVietnamTime()}`);
  console.log('='.repeat(60));
  console.log('');
  
  console.log('Running build validation...');
  const buildResult = build();
  
  if (buildResult !== 0) {
    console.error('Build validation failed. Cannot publish.');
    return 1;
  }
  
  console.log('');
  console.log('Publishing to npm...');
  
  try {
    await execute('npm', ['publish', '--access', 'public']);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Package published successfully');
    console.log('='.repeat(60));
    
    return 0;
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Publish failed:', error.message);
    console.error('='.repeat(60));
    
    return 1;
  }
}

if (require.main === module) {
  publish().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { publish };
