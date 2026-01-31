/**
 * Unit tests for FsStorage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { FsStorage } from '../../src/storage.js';
import type { TransferContext } from '@mtngtools/hls-types';
import { StorageError } from '@mtngtools/hls-types';

// Create a mock readable stream helper
function createMockReadable(data: string[]): NodeJS.ReadableStream {
  // Use a simple object that implements the ReadableStream interface
  const stream = {
    readable: true,
    read: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    pipe: vi.fn(),
    unpipe: vi.fn(),
    destroy: vi.fn(),
  } as unknown as NodeJS.ReadableStream;
  return stream;
}

// Mock Node.js modules
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    promises: {
      mkdir: vi.fn(),
    },
    createWriteStream: vi.fn(),
  };
});

vi.mock('node:stream', async () => {
  const actual = await vi.importActual<typeof import('node:stream')>('node:stream');
  return {
    ...actual,
    Readable: {
      ...actual.Readable,
      fromWeb: vi.fn(),
    },
  };
});

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn(),
}));

import { pipeline } from 'node:stream/promises';

describe('FsStorage', () => {
  let storage: FsStorage;
  const mockContext: TransferContext = {
    config: {
      source: {
        mode: 'fetch',
        config: { url: 'https://example.com/main.m3u8' },
      },
      destination: {
        mode: 'file',
        config: { path: '/tmp' },
      },
    },
    metadata: {},
  };

  beforeEach(() => {
    storage = new FsStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store Node.js stream', async () => {
    const mockStream = createMockReadable(['test', 'data']);
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as never);
    vi.mocked(pipeline).mockResolvedValue(undefined);

    await storage.store(mockStream, '/path/to/file.txt', mockContext);

    expect(fs.mkdir).toHaveBeenCalledWith('/path/to', { recursive: true });
    expect(createWriteStream).toHaveBeenCalledWith('/path/to/file.txt');
    expect(pipeline).toHaveBeenCalledWith(mockStream, mockWriteStream);
  });

  it('should convert Web ReadableStream to Node.js stream', async () => {
    const mockWebStream = {
      getReader: vi.fn(),
    } as never as ReadableStream<Uint8Array>;

    const mockNodeStream = createMockReadable(['test']);
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as never);
    vi.mocked(pipeline).mockResolvedValue(undefined);
    vi.mocked(Readable.fromWeb).mockReturnValue(mockNodeStream);

    await storage.store(mockWebStream as unknown as Readable, '/path/to/file.txt', mockContext);

    expect(Readable.fromWeb).toHaveBeenCalledWith(mockWebStream);
    expect(pipeline).toHaveBeenCalledWith(mockNodeStream, mockWriteStream);
  });

  it('should create directory recursively', async () => {
    const mockStream = createMockReadable(['test']);
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as never);
    vi.mocked(pipeline).mockResolvedValue(undefined);

    await storage.store(mockStream, '/deep/nested/path/file.txt', mockContext);

    expect(fs.mkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true });
  });

  it('should handle storage errors', async () => {
    const mockStream = createMockReadable(['test']);
    const error = new Error('File system error');

    vi.mocked(fs.mkdir).mockRejectedValue(error);

    await expect(storage.store(mockStream, '/path/to/file.txt', mockContext)).rejects.toThrow();
  });

  it('should handle pipeline errors', async () => {
    const mockStream = createMockReadable(['test']);
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
    };
    const error = new Error('Pipeline error');

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as never);
    vi.mocked(pipeline).mockRejectedValue(error);

    await expect(storage.store(mockStream, '/path/to/file.txt', mockContext)).rejects.toThrow();
  });

  it('should handle root directory path', async () => {
    const mockStream = createMockReadable(['test']);
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as never);
    vi.mocked(pipeline).mockResolvedValue(undefined);

    await storage.store(mockStream, '/file.txt', mockContext);

    expect(fs.mkdir).toHaveBeenCalledWith('/', { recursive: true });
  });
});
