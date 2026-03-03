'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

let jest;
try {
  jest = require('jest');
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND' && /['\"]jest['\"]/.test(error.message)) {
    console.error(
      'Unable to start tests because the "jest" package is missing. ' +
      'Install dependencies first (for example: "npm ci --legacy-peer-deps") and retry.'
    );
    process.exit(1);
  }

  throw error;
}
const execSync = require('child_process').execSync;
let argv = process.argv.slice(2);

function isInGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function isInMercurialRepository() {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Watch unless on CI, explicitly running all tests, or a non-interactive shell.
const isInteractive = process.stdout.isTTY && process.stdin.isTTY;
if (
  !process.env.CI &&
  isInteractive &&
  argv.indexOf('--watchAll') === -1
) {
  // https://github.com/facebook/create-react-app/issues/5210
  const hasSourceControl = isInGitRepository() || isInMercurialRepository();
  argv.push(hasSourceControl ? '--watch' : '--watchAll');
}

jest.run(argv);
