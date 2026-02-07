/**
 * Unit tests for configuration loading
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, createTransferConfig } from '../../src/config.js';

vi.mock('node:fs');

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load valid JSON config file', () => {
    const configContent = JSON.stringify({
      source: {
        url: 'https://example.com/main.m3u8',
        headers: { 'User-Agent': 'test' },
      },
    });

    vi.mocked(readFileSync).mockReturnValue(configContent);

    const config = loadConfig('./config.json');
    expect(config).toEqual({
      source: {
        url: 'https://example.com/main.m3u8',
        headers: { 'User-Agent': 'test' },
      },
    });
  });

  it('should throw error for invalid JSON', () => {
    vi.mocked(readFileSync).mockReturnValue('invalid json');

    expect(() => {
      loadConfig('./config.json');
    }).toThrow('Failed to load config file');
  });

  it('should throw error for file not found', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    expect(() => {
      loadConfig('./nonexistent.json');
    }).toThrow('Failed to load config file');
  });
});

describe('createTransferConfig', () => {
  it('should create config from args only', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/output',
    };

    const config = createTransferConfig(args);

    expect(config.source.mode).toBe('fetch');
    expect((config.source.config as any).url).toBe('https://example.com/main.m3u8');
    expect(config.destination.mode).toBe('file');
    expect((config.destination.config as any).path).toBe('/output');
  });

  it('should use defaults for concurrency and retry', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/output',
    };

    const config = createTransferConfig(args);

    expect(config.source.concurrency?.maxConcurrent).toBe(5);
    expect(config.source.retry?.maxRetries).toBe(3);
    expect(config.source.retry?.retryDelay).toBe(1000);
  });

  it('should use args for concurrency and retry when provided', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/output',
      maxConcurrent: 10,
      maxRetries: 5,
      retryDelay: 2000,
    };

    const config = createTransferConfig(args);

    expect(config.source.concurrency?.maxConcurrent).toBe(10);
    expect(config.source.retry?.maxRetries).toBe(5);
    expect(config.source.retry?.retryDelay).toBe(2000);
  });

  it('should merge config file with args', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/output',
      maxConcurrent: 10,
    };

    const fileConfig = {
      source: {
        headers: { 'User-Agent': 'test' },
        timeout: 60000,
        concurrency: {
          maxConcurrent: 20,
        },
      },
      destination: {
        headers: { 'Authorization': 'Bearer token' },
      },
    };

    const config = createTransferConfig(args, fileConfig);

    // Args override config file
    expect(config.source.concurrency?.maxConcurrent).toBe(10);
    // Config file provides defaults
    expect((config.source.config as any).headers).toEqual({ 'User-Agent': 'test' });
    expect((config.source.config as any).timeout).toBe(60000);
    // File mode doesn't support headers, so destination config should only have path
    expect(config.destination.mode).toBe('file');
    expect((config.destination.config as any).path).toBe('/output');
  });

  it('should detect URL destination', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: 'https://cdn2.com/output',
    };

    const config = createTransferConfig(args);

    expect(config.destination.mode).toBe('fetch');
    expect((config.destination.config as any).url).toBe('https://cdn2.com/output');
  });

  it('should use file mode for non-URL destination', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/local/output',
    };

    const config = createTransferConfig(args);

    expect(config.destination.mode).toBe('file');
    expect((config.destination.config as any).path).toBe('/local/output');
  });

  it('should respect config file destination mode', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: '/local/output',
    };

    const fileConfig = {
      destination: {
        mode: 'fetch' as const,
        url: 'https://cdn2.com/output',
      },
    };

    const config = createTransferConfig(args, fileConfig);

    expect(config.destination.mode).toBe('fetch');
    expect((config.destination.config as any).url).toBe('https://cdn2.com/output');
  });

  it('should handle HTTP URLs', () => {
    const args = {
      source: 'https://example.com/main.m3u8',
      destination: 'http://example.com/output',
    };

    const config = createTransferConfig(args);

    expect(config.destination.mode).toBe('fetch');
    expect((config.destination.config as any).url).toBe('http://example.com/output');
  });
});
