#!/usr/bin/env node
/**
 * CLI entry point for compose-hls-cli
 */

import { parseArgs } from '@mtngtools/frame-hls-cli';
import { executeTransfer } from './cli.js';
import { parseComposeArgs } from './options.js';

// Get command line arguments (skip 'node' and script path)
const args = process.argv.slice(2);

// Parse arguments
const parsedArgs = parseArgs(args);
const parsedComposeArgs = parseComposeArgs(args);

// Execute transfer
executeTransfer(parsedArgs, parsedComposeArgs).catch((error) => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
