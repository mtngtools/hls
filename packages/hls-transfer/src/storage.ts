/**
 * File system storage implementation
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Storage, TransferContext, TransferStream } from '@mtngtools/hls-types';

/**
 * FsStorage - File system storage implementation
 */
export class FsStorage implements Storage {
  /**
   * Store data at a path
   *
   * @param stream - Stream of data to store
   * @param path - Destination path
   * @param context - Transfer context
   * @returns Promise that resolves when storage is complete
   */
  async store(
    stream: TransferStream,
    path: string,
    _context: TransferContext,
  ): Promise<void> {
    // Ensure directory exists
    const dir = dirname(path);
    await fs.mkdir(dir, { recursive: true });

    // Convert TransferStream to Node.js stream if needed
    let nodeStream: NodeJS.ReadableStream;

    if (stream && typeof (stream as { getReader?: unknown }).getReader === 'function') {
      // Web ReadableStream - convert to Node.js stream efficiently using Readable.fromWeb()
      // This avoids reading the entire stream into memory
      const { Readable } = await import('node:stream');
      nodeStream = Readable.fromWeb(stream as ReadableStream<Uint8Array>);
    } else {
      // Assume it's already a Node.js stream
      nodeStream = stream as NodeJS.ReadableStream;
    }

    // Write stream to file
    const writeStream = (await import('node:fs')).createWriteStream(path);
    await pipeline(nodeStream, writeStream);
  }
}

