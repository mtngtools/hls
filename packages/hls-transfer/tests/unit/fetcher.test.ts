/**
 * Unit tests for OfetchFetcher
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfetchFetcher } from '../../src/fetcher.js';
import type { TransferContext } from '@mtngtools/hls-types';
import { FetchError } from '@mtngtools/hls-types';

// Mock ofetch
vi.mock('ofetch', () => ({
  $fetch: {
    raw: vi.fn(),
  },
}));

import { $fetch } from 'ofetch';

describe('OfetchFetcher', () => {
  let fetcher: OfetchFetcher;
  const mockContext: TransferContext = {
    config: {
      source: {
        mode: 'fetch',
        config: {
          url: 'https://example.com/main.m3u8',
          headers: { 'User-Agent': 'test' },
          timeout: 30000,
        },
      },
      destination: {
        mode: 'file',
        config: { path: '/tmp' },
      },
    },
    metadata: {},
  };

  beforeEach(() => {
    fetcher = new OfetchFetcher();
    vi.clearAllMocks();
  });

  it('should fetch text response', async () => {
    const mockResponse = {
      _data: 'test content',
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);
    const text = await result.text();

    expect($fetch.raw).toHaveBeenCalledWith('https://example.com/test', {
      headers: { 'User-Agent': 'test' },
      timeout: 30000,
      retry: 0,
      retryDelay: 1000,
    });
    expect(text).toBe('test content');
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });

  it('should fetch ArrayBuffer response', async () => {
    const arrayBuffer = new ArrayBuffer(8);
    const mockResponse = {
      _data: arrayBuffer,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);
    const buffer = await result.arrayBuffer();

    expect(buffer).toBe(arrayBuffer);
  });

  it('should convert Uint8Array to ArrayBuffer', async () => {
    const uint8Array = new Uint8Array([1, 2, 3, 4]);
    const mockResponse = {
      _data: uint8Array,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);
    const buffer = await result.arrayBuffer();

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffer)).toEqual(uint8Array);
  });

  it('should convert string to ArrayBuffer', async () => {
    const mockResponse = {
      _data: 'test',
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);
    const buffer = await result.arrayBuffer();

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('should handle retry config from context', async () => {
    const contextWithRetry: TransferContext = {
      ...mockContext,
      config: {
        ...mockContext.config,
        source: {
          ...mockContext.config.source,
          config: {
            ...mockContext.config.source.config,
            retry: {
              maxRetries: 3,
              retryDelay: 2000,
            },
          },
        },
      },
    };

    const mockResponse = {
      _data: 'test',
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    await fetcher.fetch('https://example.com/test', contextWithRetry);

    expect($fetch.raw).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        retry: 3,
        retryDelay: 2000,
      }),
    );
  });

  it('should throw FetchError on fetch failure', async () => {
    const error = new Error('Network error');
    vi.mocked($fetch.raw).mockRejectedValue(error);

    await expect(fetcher.fetch('https://example.com/test', mockContext)).rejects.toThrow(FetchError);
  });

  it('should include status code in FetchError', async () => {
    const error = { status: 404, message: 'Not found' };
    vi.mocked($fetch.raw).mockRejectedValue(error);

    try {
      await fetcher.fetch('https://example.com/test', mockContext);
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).status).toBe(404);
      expect((err as FetchError).url).toBe('https://example.com/test');
    }
  });

  it('should handle non-OK status codes', async () => {
    const mockResponse = {
      _data: 'error',
      headers: new Headers(),
      status: 404,
      statusText: 'Not Found',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);

    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
  });

  it('should handle response with Record headers', async () => {
    const mockResponse = {
      _data: 'test',
      headers: { 'content-type': 'text/plain' },
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/test', mockContext);

    expect(result.headers).toEqual({ 'content-type': 'text/plain' });
  });

  it('should handle Blob response (mocking fetch)', async () => {
    const blob = new Blob(['test blob content'], { type: 'text/plain' });
    const mockResponse = {
      _data: blob,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    };

    vi.mocked($fetch.raw).mockResolvedValue(mockResponse as never);

    const result = await fetcher.fetch('https://example.com/blob', mockContext);
    const buffer = await result.arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    expect(text).toBe('test blob content');
  });
});
