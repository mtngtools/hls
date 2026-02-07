#!/usr/bin/env node
/**
 * CLI entry point
 */

import { parseArgs } from './args.js';
import { executeTransfer } from './cli.js';

// Get command line arguments (skip 'node' and script path)
const args = process.argv.slice(2);

// Parse arguments
const parsedArgs = parseArgs(args);

// Execute transfer
executeTransfer(parsedArgs).catch((error) => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

