/**
 * Integration test helpers
 * Provides utilities for mocking HTTP requests and storage
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { RequestHandler } from 'msw';
import { Readable } from 'node:stream';
import type { Storage, TransferContext, TransferStream } from '@mtngtools/hls-types';

/**
 * Mock storage implementation for testing
 */
export class MockStorage implements Storage {
  private storedFiles = new Map<string, string>();

  async store(
    stream: TransferStream,
    path: string,
    _context: TransferContext,
  ): Promise<void> {
    // Convert stream to string
    const chunks: Uint8Array[] = [];
    if (stream && typeof (stream as { getReader?: unknown }).getReader === 'function') {
      const reader = (stream as ReadableStream<Uint8Array>).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      const nodeStream = stream as NodeJS.ReadableStream;
      for await (const chunk of nodeStream) {
        chunks.push(Buffer.from(chunk as string | Buffer));
      }
    }

    const content = Buffer.concat(chunks).toString('utf-8');
    this.storedFiles.set(path, content);
  }

  getStoredFile(path: string): string | undefined {
    return this.storedFiles.get(path);
  }

  getAllStoredFiles(): Map<string, string> {
    return new Map(this.storedFiles);
  }

  clear(): void {
    this.storedFiles.clear();
  }
}

/**
 * Create MSW handlers for HLS manifests and chunks
 */
export function createHandlers(options: {
  mainManifest?: string;
  variantManifests?: Record<string, string>;
  chunks?: Record<string, string | Uint8Array>;
  baseUrl?: string;
}): RequestHandler[] {
  const {
    mainManifest = '',
    variantManifests = {},
    chunks = {},
    baseUrl = 'https://example.com',
  } = options;

  const handlers: RequestHandler[] = [];

  // Main manifest handler
  if (mainManifest) {
    handlers.push(
      http.get(`${baseUrl}/main.m3u8`, () => {
        return HttpResponse.text(mainManifest, {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
        });
      }),
    );
  }

  // Variant manifest handlers
  for (const [path, content] of Object.entries(variantManifests)) {
    // Resolve the path relative to baseUrl (same logic as resolveUrl)
    const resolvedUrl = new URL(path, baseUrl).href;
    handlers.push(
      http.get(resolvedUrl, () => {
        return HttpResponse.text(content, {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
        });
      }),
    );
  }

  // Chunk handlers - resolve relative to baseUrl
  for (const [path, content] of Object.entries(chunks)) {
    // Resolve chunk path relative to baseUrl (chunks are in same directory as variant)
    const chunkUrl = new URL(path, baseUrl).href;
    handlers.push(
      http.get(chunkUrl, () => {
        if (typeof content === 'string') {
          return HttpResponse.text(content, {
            headers: { 'Content-Type': 'video/mp2t' },
          });
        }
        return HttpResponse.arrayBuffer(content, {
          headers: { 'Content-Type': 'video/mp2t' },
        });
      }),
    );
  }

  return handlers;
}

/**
 * Setup MSW server for integration tests
 */
export function setupMockServer(handlers: RequestHandler[]) {
  const server = setupServer(...handlers);
  return server;
}

/**
 * Create a mock chunk data
 */
export function createMockChunkData(size: number = 1024): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 256;
  }
  return data;
}
