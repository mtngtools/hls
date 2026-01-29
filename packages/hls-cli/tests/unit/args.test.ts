/**
 * Unit tests for CLI argument parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs } from '../../src/args.js';

// Mock console methods and process.exit
const mockExit = vi.fn();
const mockError = vi.fn();
const mockLog = vi.fn();

describe('parseArgs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(mockError);
    vi.spyOn(console, 'log').mockImplementation(mockLog);
    vi.spyOn(process, 'exit').mockImplementation(mockExit as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockExit.mockClear();
    mockError.mockClear();
    mockLog.mockClear();
  });

  it('should parse source and destination positional arguments', () => {
    const args = parseArgs(['https://example.com/master.m3u8', '/output']);
    expect(args.source).toBe('https://example.com/master.m3u8');
    expect(args.destination).toBe('/output');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should parse config file option', () => {
    const args = parseArgs(['source', 'dest', '--config', 'config.json']);
    expect(args.config).toBe('config.json');
  });

  it('should parse config file short option', () => {
    const args = parseArgs(['source', 'dest', '-c', 'config.json']);
    expect(args.config).toBe('config.json');
  });

  it('should parse max-concurrent option', () => {
    const args = parseArgs(['source', 'dest', '--max-concurrent', '10']);
    expect(args.maxConcurrent).toBe(10);
  });

  it('should parse max-concurrent short option', () => {
    const args = parseArgs(['source', 'dest', '-j', '5']);
    expect(args.maxConcurrent).toBe(5);
  });

  it('should parse max-retries option', () => {
    const args = parseArgs(['source', 'dest', '--max-retries', '3']);
    expect(args.maxRetries).toBe(3);
  });

  it('should parse max-retries short option', () => {
    const args = parseArgs(['source', 'dest', '-r', '5']);
    expect(args.maxRetries).toBe(5);
  });

  it('should parse retry-delay option', () => {
    const args = parseArgs(['source', 'dest', '--retry-delay', '2000']);
    expect(args.retryDelay).toBe(2000);
  });

  it('should parse verbose flag', () => {
    const args = parseArgs(['source', 'dest', '--verbose']);
    expect(args.verbose).toBe(true);
  });

  it('should parse verbose short flag', () => {
    const args = parseArgs(['source', 'dest', '-v']);
    expect(args.verbose).toBe(true);
  });

  it('should parse quiet flag', () => {
    const args = parseArgs(['source', 'dest', '--quiet']);
    expect(args.quiet).toBe(true);
  });

  it('should parse quiet short flag', () => {
    const args = parseArgs(['source', 'dest', '-q']);
    expect(args.quiet).toBe(true);
  });

  it('should handle multiple options', () => {
    const args = parseArgs([
      'source',
      'dest',
      '--config',
      'config.json',
      '--max-concurrent',
      '10',
      '--verbose',
    ]);
    expect(args.config).toBe('config.json');
    expect(args.maxConcurrent).toBe(10);
    expect(args.verbose).toBe(true);
  });

  it('should exit with error if config option has no value', () => {
    parseArgs(['source', 'dest', '--config']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with error if max-concurrent has no value', () => {
    parseArgs(['source', 'dest', '--max-concurrent']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with error if max-retries has no value', () => {
    parseArgs(['source', 'dest', '--max-retries']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with error if retry-delay has no value', () => {
    parseArgs(['source', 'dest', '--retry-delay']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with error if source is missing', () => {
    parseArgs(['--verbose']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with error if destination is missing', () => {
    parseArgs(['source']);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();
  });

  it('should exit with help when --help is provided', () => {
    parseArgs(['--help']);
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog).toHaveBeenCalled();
  });

  it('should exit with help when -h is provided', () => {
    parseArgs(['-h']);
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog).toHaveBeenCalled();
  });

  it('should exit with version when --version is provided', () => {
    parseArgs(['--version']);
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog).toHaveBeenCalled();
  });

  it('should ignore unknown flags', () => {
    const args = parseArgs(['source', 'dest', '--unknown-flag', 'value']);
    expect(args.source).toBe('source');
    expect(args.destination).toBe('dest');
  });
});
