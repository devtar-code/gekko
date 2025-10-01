#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log(`
    ______   ________  __    __  __    __   ______
   /      \\ /        |/  |  /  |/  |  /  | /      \\
  /$$$$$$  |$$$$$$$$/ $$ | /$$/ $$ | /$$/ /$$$$$$  |
  $$ | _$$/ $$ |__    $$ |/$$/  $$ |/$$/  $$ |  $$ |
  $$ |/    |$$    |   $$  $$<   $$  $$<   $$ |  $$ |
  $$ |$$$$ |$$$$$/    $$$$$  \\  $$$$$  \\  $$ |  $$ |
  $$ \\__$$ |$$ |_____ $$ |$$  \\ $$ |$$  \\ $$ \\__$$ |
  $$    $$/ $$       |$$ | $$  |$$ | $$  |$$    $$/ 
   $$$$$$/  $$$$$$$$/ $$/   $$/ $$/   $$/  $$$$$$/
`);

console.log('\tGekko Pro - Enhanced Launch');
console.log('\tStarting with unified configuration...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('Error: Please run this script from the gekko root directory');
  process.exit(1);
}

// Function to run commands
function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, options.args || [], {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Function to check if port is in use
function isPortInUse(port) {
  try {
    execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Main startup function
async function startGekko() {
  try {
    console.log('🔍 Checking dependencies...');
    
    // Check if node_modules exist
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing main dependencies...');
      await runCommand('npm', { args: ['install'] });
    }

    if (!fs.existsSync('web/vue/node_modules')) {
      console.log('📦 Installing Vue dependencies...');
      await runCommand('npm', { args: ['install'], cwd: 'web/vue' });
    }

    if (!fs.existsSync('exchange/node_modules')) {
      console.log('📦 Installing exchange dependencies...');
      await runCommand('npm', { args: ['install'], cwd: 'exchange' });
    }

    console.log('🔧 Building Vue UI...');
    await runCommand('npm', { args: ['run', 'build'], cwd: 'web/vue' });

    // Check if port 3000 is available
    if (isPortInUse(3000)) {
      console.log('⚠️  Port 3000 is already in use. Stopping existing processes...');
      try {
        execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
        // Wait a moment for processes to stop
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log('Could not stop existing processes, continuing...');
      }
    }

    console.log('🚀 Starting Gekko with unified UI...');
    console.log('📱 Web interface will be available at: http://localhost:3000');
    console.log('🔌 API endpoints available at: http://localhost:3000/api');
    console.log('\nPress Ctrl+C to stop the application\n');

    // Start the main gekko application
    await runCommand('node', { args: ['./gekko.js', '--config', 'config.js', '--ui'] });

  } catch (error) {
    console.error('❌ Error starting Gekko:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Gekko...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Gekko...');
  process.exit(0);
});

// Start the application
startGekko();
