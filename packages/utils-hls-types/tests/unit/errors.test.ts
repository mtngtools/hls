/**
 * Unit tests for error classes
 */

import { describe, it, expect } from 'vitest';
import {
  HlsError,
  ManifestParseError,
  FetchError,
  StorageError,
  TransferError,
  ValidationError,
} from '../../src/errors.js';

describe('HlsError', () => {
  it('should create error with message and code', () => {
    const error = new HlsError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('HlsError');
  });

  it('should include context', () => {
    const context = { key: 'value', number: 42 };
    const error = new HlsError('Test error', 'TEST_CODE', context);
    expect(error.context).toEqual(context);
  });

  it('should include cause', () => {
    const cause = new Error('Original error');
    const error = new HlsError('Test error', 'TEST_CODE', undefined, { cause });
    expect(error.cause).toBe(cause);
  });
});

describe('ManifestParseError', () => {
  it('should create error with line number', () => {
    const error = new ManifestParseError('Parse failed', 42);
    expect(error.message).toBe('Parse failed');
    expect(error.code).toBe('MANIFEST_PARSE_ERROR');
    expect(error.line).toBe(42);
    expect(error.context).toEqual({ line: 42 });
  });

  it('should handle error without line number', () => {
    const error = new ManifestParseError('Parse failed');
    expect(error.line).toBeUndefined();
    expect(error.context).toEqual({ line: undefined });
  });

  it('should include cause', () => {
    const cause = new Error('Original error');
    const error = new ManifestParseError('Parse failed', 42, cause);
    expect(error.cause).toBe(cause);
  });
});

describe('FetchError', () => {
  it('should create error with URL', () => {
    const error = new FetchError('Fetch failed', 'https://example.com');
    expect(error.message).toBe('Fetch failed');
    expect(error.code).toBe('FETCH_ERROR');
    expect(error.url).toBe('https://example.com');
    expect(error.status).toBeUndefined();
    expect(error.context).toEqual({ url: 'https://example.com', status: undefined });
  });

  it('should include status code', () => {
    const error = new FetchError('Fetch failed', 'https://example.com', 404);
    expect(error.status).toBe(404);
    expect(error.context).toEqual({ url: 'https://example.com', status: 404 });
  });

  it('should include cause', () => {
    const cause = new Error('Network error');
    const error = new FetchError('Fetch failed', 'https://example.com', 500, cause);
    expect(error.cause).toBe(cause);
  });

  describe('isRetryable', () => {
    it('should return true for network errors (no status)', () => {
      const error = new FetchError('Network error', 'https://example.com');
      expect(error.isRetryable).toBe(true);
    });

    it('should return true for 5xx errors', () => {
      const error500 = new FetchError('Server error', 'https://example.com', 500);
      expect(error500.isRetryable).toBe(true);

      const error503 = new FetchError('Service unavailable', 'https://example.com', 503);
      expect(error503.isRetryable).toBe(true);
    });

    it('should return true for 429 (Too Many Requests)', () => {
      const error = new FetchError('Too many requests', 'https://example.com', 429);
      expect(error.isRetryable).toBe(true);
    });

    it('should return true for 408 (Request Timeout)', () => {
      const error = new FetchError('Request timeout', 'https://example.com', 408);
      expect(error.isRetryable).toBe(true);
    });

    it('should return false for 4xx client errors', () => {
      const error400 = new FetchError('Bad request', 'https://example.com', 400);
      expect(error400.isRetryable).toBe(false);

      const error404 = new FetchError('Not found', 'https://example.com', 404);
      expect(error404.isRetryable).toBe(false);

      const error403 = new FetchError('Forbidden', 'https://example.com', 403);
      expect(error403.isRetryable).toBe(false);
    });

    it('should return false for 2xx success codes', () => {
      const error = new FetchError('Unexpected success', 'https://example.com', 200);
      expect(error.isRetryable).toBe(false);
    });
  });
});

describe('StorageError', () => {
  it('should create error with path', () => {
    const error = new StorageError('Storage failed', '/path/to/file');
    expect(error.message).toBe('Storage failed');
    expect(error.code).toBe('STORAGE_ERROR');
    expect(error.path).toBe('/path/to/file');
    expect(error.context).toEqual({ path: '/path/to/file' });
  });

  it('should include cause', () => {
    const cause = new Error('File system error');
    const error = new StorageError('Storage failed', '/path/to/file', cause);
    expect(error.cause).toBe(cause);
  });
});

describe('TransferError', () => {
  it('should create error with step', () => {
    const error = new TransferError('Transfer failed', 'fetchManifest');
    expect(error.message).toBe('Transfer failed');
    expect(error.code).toBe('TRANSFER_ERROR');
    expect(error.step).toBe('fetchManifest');
    expect(error.context).toEqual({ step: 'fetchManifest' });
  });

  it('should include additional context', () => {
    const context = { variant: 'variant1', chunk: 'chunk1' };
    const error = new TransferError('Transfer failed', 'fetchChunk', context);
    expect(error.context).toEqual({ step: 'fetchChunk', variant: 'variant1', chunk: 'chunk1' });
  });

  it('should include cause', () => {
    const cause = new Error('Underlying error');
    const error = new TransferError('Transfer failed', 'fetchManifest', undefined, cause);
    expect(error.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('should create error with field', () => {
    const error = new ValidationError('Validation failed', 'url');
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('url');
    expect(error.context).toEqual({ field: 'url' });
  });

  it('should include additional context', () => {
    const context = { value: 'invalid-url', type: 'string' };
    const error = new ValidationError('Validation failed', 'url', context);
    expect(error.context).toEqual({ field: 'url', value: 'invalid-url', type: 'string' });
  });

  it('should include cause', () => {
    const cause = new Error('Parse error');
    const error = new ValidationError('Validation failed', 'url', undefined, cause);
    expect(error.cause).toBe(cause);
  });
});
