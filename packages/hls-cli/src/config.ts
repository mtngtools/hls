/**
 * Configuration file loading
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TransferConfig } from '@mtngtools/hls-types';

export interface CliConfig {
  source?: {
    url?: string;
    headers?: Record<string, string>;
    timeout?: number;
    concurrency?: {
      maxConcurrent?: number;
    };
    retry?: {
      maxRetries?: number;
      retryDelay?: number;
    };
  };
  destination?: {
    mode?: 'fetch' | 'file';
    url?: string;
    path?: string;
    headers?: Record<string, string>;
    timeout?: number;
    concurrency?: {
      maxConcurrent?: number;
    };
    retry?: {
      maxRetries?: number;
      retryDelay?: number;
    };
  };
}

/**
 * Load configuration from file
 */
export function loadConfig(configPath: string): CliConfig {
  try {
    const resolvedPath = resolve(configPath);
    const content = readFileSync(resolvedPath, 'utf-8');
    return JSON.parse(content) as CliConfig;
  } catch (error) {
    throw new Error(`Failed to load config file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Merge CLI args and config file into TransferConfig
 */
export function createTransferConfig(
  args: { source: string; destination: string; maxConcurrent?: number; maxRetries?: number; retryDelay?: number },
  config?: CliConfig,
): TransferConfig {
  // Determine source mode (always 'fetch' for now)
  const sourceConfig = {
    mode: 'fetch' as const,
    config: {
      url: args.source,
      headers: config?.source?.headers ?? {},
      timeout: config?.source?.timeout ?? 30000,
    },
    concurrency: {
      maxConcurrent: args.maxConcurrent ?? config?.source?.concurrency?.maxConcurrent ?? 5,
    },
    retry: {
      maxRetries: args.maxRetries ?? config?.source?.retry?.maxRetries ?? 3,
      retryDelay: args.retryDelay ?? config?.source?.retry?.retryDelay ?? 1000,
    },
  };

  // Determine destination mode and URL/path
  const isUrl = args.destination.startsWith('http://') || args.destination.startsWith('https://');
  const destMode = config?.destination?.mode ?? (isUrl ? 'fetch' : 'file');
  
  // Use config file URL if provided and mode is fetch, otherwise use args.destination
  const destUrl = destMode === 'fetch' && config?.destination?.url 
    ? config.destination.url 
    : args.destination;

  const destinationConfig = {
    mode: destMode,
    config:
      destMode === 'file'
        ? {
            path: destUrl,
          }
        : {
            url: destUrl,
            headers: config?.destination?.headers ?? {},
            timeout: config?.destination?.timeout ?? 30000,
          },
    concurrency: {
      maxConcurrent: config?.destination?.concurrency?.maxConcurrent ?? 5,
    },
    retry: {
      maxRetries: config?.destination?.retry?.maxRetries ?? 3,
      retryDelay: config?.destination?.retry?.retryDelay ?? 1000,
    },
  };

  return {
    source: sourceConfig,
    destination: destinationConfig,
  };
}

