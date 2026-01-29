/**
 * Default pipeline executor
 * Merges plugin overrides with default implementations
 */

import { Readable } from 'node:stream';
import { resolveUrl } from '@mtngtools/hls-utils';
import type {
  PipelineExecutor,
  DefaultImplementations,
  TransferPlugins,
  TransferContext,
  FetchResponse,
  MasterManifest,
  Variant,
  VariantManifest,
  Chunk,
  TransferStream,
} from '@mtngtools/hls-types';

/**
 * DefaultPipelineExecutor - Executes pipeline steps with plugin fallback
 */
export class DefaultPipelineExecutor implements PipelineExecutor {
  constructor(
    public readonly defaults: DefaultImplementations,
    private plugins?: TransferPlugins,
  ) {}

  async fetchMasterManifest(url: string, context: TransferContext): Promise<FetchResponse> {
    return (
      this.plugins?.fetchMasterManifest?.(url, context) ??
      this.defaults.fetcher.fetch(url, context)
    );
  }

  async parseMasterManifest(content: string, context: TransferContext): Promise<MasterManifest> {
    return (
      this.plugins?.parseMasterManifest?.(content, context) ??
      this.defaults.parser.parseMasterManifest(content, context)
    );
  }

  async filterVariants(context: TransferContext): Promise<Variant[]> {
    if (this.plugins?.filterVariants) {
      return this.plugins.filterVariants(context);
    }

    // Default: return all variants from master manifest
    if (!context.masterManifest) {
      return [];
    }
    return context.masterManifest.variants;
  }

  async fetchVariantManifest(
    variant: Variant,
    context: TransferContext,
  ): Promise<FetchResponse> {
    if (this.plugins?.fetchVariantManifest) {
      return this.plugins.fetchVariantManifest(variant, context);
    }

    // Resolve variant URI relative to master manifest URL
    const masterUrl = this.getMasterManifestUrl(context);
    const variantUrl = resolveUrl(masterUrl, variant.uri);
    return this.defaults.fetcher.fetch(variantUrl, context);
  }

  /**
   * Get master manifest URL from context
   */
  private getMasterManifestUrl(context: TransferContext): string {
    const sourceConfig = context.config.source;
    if (sourceConfig.mode === 'fetch' && 'url' in sourceConfig.config) {
      return sourceConfig.config.url;
    }
    throw new Error('Unsupported source mode or missing URL');
  }

  async parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest> {
    return (
      this.plugins?.parseVariantManifest?.(content, variant, context) ??
      this.defaults.parser.parseVariantManifest(content, variant, context)
    );
  }

  async discoverChunks(
    manifest: VariantManifest,
    variant: Variant,
    context: TransferContext,
  ): Promise<Chunk[]> {
    if (this.plugins?.discoverChunks) {
      return this.plugins.discoverChunks(manifest, variant, context);
    }

    // Default: return all chunks from variant manifest
    return manifest.chunks;
  }

  async filterChunks(
    manifest: VariantManifest,
    variant: Variant,
    chunks: Chunk[],
    context: TransferContext,
  ): Promise<Chunk[]> {
    if (this.plugins?.filterChunks) {
      return this.plugins.filterChunks(manifest, variant, chunks, context);
    }

    // Default: return all chunks (no filtering)
    return chunks;
  }

  async createDestinationMasterManifest(context: TransferContext): Promise<string> {
    if (this.plugins?.createDestinationMasterManifest) {
      return this.plugins.createDestinationMasterManifest(context);
    }

    // Default: serialize master manifest to M3U8 format
    if (!context.masterManifest) {
      throw new Error('Master manifest not available in context');
    }

    return this.serializeMasterManifest(context.masterManifest);
  }

  async generateMasterManifestPath(
    sourcePath: string,
    manifest: MasterManifest,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateMasterManifestPath) {
      return this.plugins.generateMasterManifestPath(sourcePath, manifest, context);
    }

    // Default: preserve source path structure
    // Extract filename from source path or use default
    const fileName = sourcePath.split('/').pop() || 'master.m3u8';
    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${fileName}`;
    }
    // For other config types, preserve source path
    return sourcePath;
  }

  async storeManifest(
    manifest: MasterManifest | VariantManifest,
    path: string,
    context: TransferContext,
  ): Promise<void> {
    if (this.plugins?.storeManifest) {
      return this.plugins.storeManifest(manifest, path, context);
    }

    // Default: serialize manifest to string and store as stream
    const content =
      'variants' in manifest
        ? this.serializeMasterManifest(manifest)
        : this.serializeVariantManifest(manifest);

    // Convert string to stream
    // Create a readable stream from the content string
    const stream = new Readable({
      read() {
        this.push(Buffer.from(content, 'utf-8'));
        this.push(null); // End stream
      },
    }) as TransferStream;
    await this.defaults.storage.store(stream, path, context);

    // Store source manifest copy at {path}.source.txt when available
    const sourceContent =
      'sourceContent' in manifest ? (manifest as { sourceContent?: string }).sourceContent : undefined;
    if (sourceContent) {
      const sourceStream = new Readable({
        read() {
          this.push(Buffer.from(sourceContent, 'utf-8'));
          this.push(null);
        },
      }) as TransferStream;
      await this.defaults.storage.store(sourceStream, `${path}.source.txt`, context);
    }
  }

  async createDestinationVariantManifest(
    chunks: Chunk[],
    variant: Variant,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.createDestinationVariantManifest) {
      return this.plugins.createDestinationVariantManifest(chunks, variant, context);
    }

    // Default: create variant manifest from chunks
    // Use the variant manifest from context if available, otherwise create new one
    const variantManifest: VariantManifest = {
      targetDuration: 10, // Default, should be calculated from chunks
      chunks,
      endList: true, // Assume VOD
    };

    return this.serializeVariantManifest(variantManifest);
  }

  async generateVariantManifestPath(
    sourcePath: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateVariantManifestPath) {
      return this.plugins.generateVariantManifestPath(sourcePath, variant, context);
    }

    // Default: preserve source path structure
    const fileName = sourcePath.split('/').pop() || 'variant.m3u8';
    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${fileName}`;
    }
    return sourcePath;
  }

  async downloadChunk(chunk: Chunk, context: TransferContext): Promise<TransferStream> {
    if (this.plugins?.downloadChunk) {
      return this.plugins.downloadChunk(chunk, context);
    }

    // Resolve chunk URI relative to variant manifest URL
    // The variant URL should be stored in context.metadata when fetching the variant
    const variantUrl = (context.metadata.variantUrl as string) || this.getVariantUrlFromContext(context);
    const chunkUrl = variantUrl ? resolveUrl(variantUrl, chunk.uri) : chunk.uri;

    // Default: fetch chunk using fetcher
    const response = await this.defaults.fetcher.fetch(chunkUrl, context);
    const arrayBuffer = await response.arrayBuffer();
    const { Readable } = await import('node:stream');
    return Readable.from([new Uint8Array(arrayBuffer)]) as TransferStream;
  }

  /**
   * Get variant URL from context
   * Tries to reconstruct it from master manifest and variant URI
   */
  private getVariantUrlFromContext(context: TransferContext): string | undefined {
    if (!context.masterManifest || !context.filteredVariants || context.filteredVariants.length === 0) {
      return undefined;
    }
    // Use the first filtered variant (in practice, we'd need the specific variant)
    // This is a fallback - ideally the variant URL should be stored in metadata
    const masterUrl = this.getMasterManifestUrl(context);
    const variant = context.filteredVariants[0];
    if (variant) {
      return resolveUrl(masterUrl, variant.uri);
    }
    return undefined;
  }

  async generateChunkPath(
    sourcePath: string,
    variant: Variant,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateChunkPath) {
      return this.plugins.generateChunkPath(sourcePath, variant, chunk, context);
    }

    // Default: preserve source path structure
    const fileName = sourcePath.split('/').pop() || 'chunk.ts';
    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${fileName}`;
    }
    return sourcePath;
  }

  async storeChunk(
    stream: TransferStream,
    path: string,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<void> {
    return (
      this.plugins?.storeChunk?.(stream, path, chunk, context) ??
      this.defaults.storage.store(stream, path, context)
    );
  }

  async finalize(context: TransferContext): Promise<void> {
    if (this.plugins?.finalize) {
      return this.plugins.finalize(context);
    }

    // Default: no-op
    return Promise.resolve();
  }

  /**
   * Serialize master manifest to M3U8 format
   */
  private serializeMasterManifest(manifest: MasterManifest): string {
    const lines: string[] = ['#EXTM3U'];

    if (manifest.version !== undefined) {
      lines.push(`#EXT-X-VERSION:${manifest.version}`);
    }

    if (manifest.independentSegments) {
      lines.push('#EXT-X-INDEPENDENT-SEGMENTS');
    }

    if (manifest.start) {
      const startLine = `#EXT-X-START:TIME-OFFSET=${manifest.start.timeOffset}`;
      if (manifest.start.precise) {
        lines.push(`${startLine},PRECISE=YES`);
      } else {
        lines.push(startLine);
      }
    }

    if (manifest.sessionData) {
      for (const sessionData of manifest.sessionData) {
        const attrs: string[] = [`DATA-ID="${sessionData.dataId}"`];
        if (sessionData.value) {
          attrs.push(`VALUE="${sessionData.value}"`);
        }
        if (sessionData.uri) {
          attrs.push(`URI="${sessionData.uri}"`);
        }
        if (sessionData.language) {
          attrs.push(`LANGUAGE="${sessionData.language}"`);
        }
        lines.push(`#EXT-X-SESSION-DATA:${attrs.join(',')}`);
      }
    }

    if (manifest.sessionKeys) {
      for (const sessionKey of manifest.sessionKeys) {
        const attrs: string[] = [`METHOD=${sessionKey.method}`];
        if (sessionKey.uri) {
          attrs.push(`URI="${sessionKey.uri}"`);
        }
        if (sessionKey.iv) {
          attrs.push(`IV=${sessionKey.iv}`);
        }
        if (sessionKey.keyFormat) {
          attrs.push(`KEYFORMAT="${sessionKey.keyFormat}"`);
        }
        if (sessionKey.keyFormatVersions) {
          attrs.push(`KEYFORMATVERSIONS="${sessionKey.keyFormatVersions}"`);
        }
        lines.push(`#EXT-X-SESSION-KEY:${attrs.join(',')}`);
      }
    }

    for (const variant of manifest.variants) {
      const attrs: string[] = [`BANDWIDTH=${variant.bandwidth}`];
      if (variant.averageBandwidth) {
        attrs.push(`AVERAGE-BANDWIDTH=${variant.averageBandwidth}`);
      }
      if (variant.codecs) {
        attrs.push(`CODECS="${variant.codecs}"`);
      }
      if (variant.resolution) {
        attrs.push(`RESOLUTION=${variant.resolution.width}x${variant.resolution.height}`);
      }
      if (variant.frameRate) {
        attrs.push(`FRAME-RATE=${variant.frameRate}`);
      }
      if (variant.hdcpLevel) {
        attrs.push(`HDCP-LEVEL=${variant.hdcpLevel}`);
      }
      if (variant.audio) {
        attrs.push(`AUDIO="${variant.audio}"`);
      }
      if (variant.video) {
        attrs.push(`VIDEO="${variant.video}"`);
      }
      if (variant.subtitles) {
        attrs.push(`SUBTITLES="${variant.subtitles}"`);
      }
      if (variant.closedCaptions) {
        attrs.push(`CLOSED-CAPTIONS="${variant.closedCaptions}"`);
      }
      lines.push(`#EXT-X-STREAM-INF:${attrs.join(',')}`);
      lines.push(variant.uri);
    }

    return lines.join('\n');
  }

  /**
   * Serialize variant manifest to M3U8 format
   */
  private serializeVariantManifest(manifest: VariantManifest): string {
    const lines: string[] = ['#EXTM3U'];

    if (manifest.version !== undefined) {
      lines.push(`#EXT-X-VERSION:${manifest.version}`);
    }

    lines.push(`#EXT-X-TARGETDURATION:${manifest.targetDuration}`);

    if (manifest.mediaSequence !== undefined) {
      lines.push(`#EXT-X-MEDIA-SEQUENCE:${manifest.mediaSequence}`);
    }

    if (manifest.discontinuitySequence !== undefined) {
      lines.push(`#EXT-X-DISCONTINUITY-SEQUENCE:${manifest.discontinuitySequence}`);
    }

    if (manifest.playlistType) {
      lines.push(`#EXT-X-PLAYLIST-TYPE:${manifest.playlistType}`);
    }

    let currentKey: Chunk['key'] | null = null;
    let currentMap: Chunk['map'] | null = null;

    for (const chunk of manifest.chunks) {
      // Output key if changed
      if (chunk.key && chunk.key !== currentKey) {
        currentKey = chunk.key;
        const keyAttrs: string[] = [`METHOD=${chunk.key.method}`];
        if (chunk.key.uri) {
          keyAttrs.push(`URI="${chunk.key.uri}"`);
        }
        if (chunk.key.iv) {
          keyAttrs.push(`IV=${chunk.key.iv}`);
        }
        lines.push(`#EXT-X-KEY:${keyAttrs.join(',')}`);
      }

      // Output map if changed
      if (chunk.map && chunk.map !== currentMap) {
        currentMap = chunk.map;
        const mapAttrs: string[] = [`URI="${chunk.map.uri}"`];
        if (chunk.map.byteRange) {
          mapAttrs.push(
            `BYTERANGE="${chunk.map.byteRange.length}@${chunk.map.byteRange.offset}"`,
          );
        }
        lines.push(`#EXT-X-MAP:${mapAttrs.join(',')}`);
      }

      // Output discontinuity if present
      if (chunk.discontinuity) {
        lines.push('#EXT-X-DISCONTINUITY');
      }

      // Output program date time if present
      if (chunk.programDateTime) {
        const isoString = chunk.programDateTime.toISOString();
        lines.push(`#EXT-X-PROGRAM-DATE-TIME:${isoString}`);
      }

      // Output chunk info
      const duration = chunk.duration.toFixed(3);
      const chunkLine = chunk.title
        ? `#EXTINF:${duration},"${chunk.title}"`
        : `#EXTINF:${duration}`;

      if (chunk.byteRange) {
        lines.push(
          `#EXT-X-BYTERANGE:${chunk.byteRange.length}@${chunk.byteRange.offset}`,
        );
      }

      lines.push(chunkLine);
      lines.push(chunk.uri);
    }

    if (manifest.endList) {
      lines.push('#EXT-X-ENDLIST');
    }

    return lines.join('\n');
  }
}

