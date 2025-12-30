/**
 * Cross-platform Mocha runner.
 *
 * On Windows in this repo, invoking `mocha` via `./node_modules/.bin/mocha`
 * (or even `node node_modules/mocha/bin/mocha.js`) has been unreliable due to
 * CLI option parsing inconsistencies.
 *
 * This runner calls Mocha's CLI programmatically, which is stable across shells.
 */

'use strict';

const path = require('path');

// Ensure the repo root is the cwd when executed from anywhere.
process.chdir(path.resolve(__dirname, '..'));

// Use Mocha's CLI entrypoint programmatically.
// Default UI is "bdd" and default reporter is "spec".
require('mocha/lib/cli/cli').main(['test/**/*.js']);


