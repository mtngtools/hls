/**
 * CLI argument parsing
 */

export interface CliArgs {
  /** Source URL or path */
  source: string;
  /** Destination URL or path */
  destination: string;
  /** Config file path (optional) */
  config?: string;
  /** Maximum concurrent downloads */
  maxConcurrent?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Verbose output */
  verbose?: boolean;
  /** Quiet mode (minimal output) */
  quiet?: boolean;
}

/**
 * Parse command line arguments
 */
export function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {};
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--config' || arg === '-c') {
      const next = argv[++i];
      if (!next) {
        console.error(`Error: ${arg} requires a value`);
        process.exit(1);
      }
      args.config = next;
    } else if (arg === '--max-concurrent' || arg === '-j') {
      const next = argv[++i];
      if (!next) {
        console.error(`Error: ${arg} requires a value`);
        process.exit(1);
      }
      args.maxConcurrent = parseInt(next, 10);
    } else if (arg === '--max-retries' || arg === '-r') {
      const next = argv[++i];
      if (!next) {
        console.error(`Error: ${arg} requires a value`);
        process.exit(1);
      }
      args.maxRetries = parseInt(next, 10);
    } else if (arg === '--retry-delay') {
      const next = argv[++i];
      if (!next) {
        console.error(`Error: ${arg} requires a value`);
        process.exit(1);
      }
      args.retryDelay = parseInt(next, 10);
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--quiet' || arg === '-q') {
      args.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version') {
      printVersion();
      process.exit(0);
    } else if (arg && !arg.startsWith('-')) {
      // Positional arguments
      if (!args.source) {
        args.source = arg;
      } else if (!args.destination) {
        args.destination = arg;
      }
    }

    i++;
  }

  if (!args.source || !args.destination) {
    console.error('Error: source and destination are required');
    printHelp();
    process.exit(1);
  }

  return args as CliArgs;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: hls <source> <destination> [options]

Transfer HLS content from source to destination.

Arguments:
  source              Source URL or path (main manifest URL)
  destination         Destination URL or path

Options:
  -c, --config <file>     Path to config file (JSON)
  -j, --max-concurrent    Maximum concurrent downloads (default: 5)
  -r, --max-retries       Maximum retries per chunk (default: 3)
  --retry-delay <ms>      Delay between retries in milliseconds (default: 1000)
  -v, --verbose           Verbose output
  -q, --quiet             Quiet mode (minimal output)
  -h, --help              Show this help message
  --version               Show version

Examples:
  hls https://cdn1.com/main.m3u8 /local/output
  hls https://cdn1.com/main.m3u8 https://cdn2.com/ --max-concurrent 10
  hls https://cdn1.com/main.m3u8 /output --config config.json
`);
}

/**
 * Print version
 */
function printVersion(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../package.json');
  console.log(pkg.version);
}

