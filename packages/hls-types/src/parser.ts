/**
 * Types for HLS manifest parsing
 * Used by @mtngtools/hls-parser
 */

/**
 * Start time offset information from EXT-X-START tag
 */
export interface StartTimeOffset {
  /** Time offset in seconds */
  timeOffset: number;
  /** Whether the time offset is precise */
  precise: boolean;
}

/**
 * Session data entry from EXT-X-SESSION-DATA tag
 */
export interface SessionData {
  /** Data ID */
  dataId: string;
  /** Data value */
  value?: string;
  /** Language code */
  language?: string;
  /** URI for external data */
  uri?: string;
}

/**
 * Session key from EXT-X-SESSION-KEY tag
 */
export interface SessionKey {
  /** Encryption method */
  method: string;
  /** Key URI */
  uri?: string;
  /** Initialization vector (hex) */
  iv?: string;
  /** Key format */
  keyFormat?: string;
  /** Key format versions */
  keyFormatVersions?: string;
}

/**
 * Media group reference (audio, video, subtitles, closed captions)
 */
export interface MediaGroup {
  /** Group ID */
  groupId: string;
  /** Language code */
  language?: string;
  /** Human-readable name */
  name?: string;
  /** Default flag */
  default?: boolean;
  /** Autoselect flag */
  autoselect?: boolean;
  /** Forced flag */
  forced?: boolean;
  /** URI for the media playlist */
  uri?: string;
  /** In-stream ID */
  instreamId?: string;
  /** Characteristics */
  characteristics?: string;
}

/**
 * Variant stream information from EXT-X-STREAM-INF tag
 */
export interface Variant {
  /** URI of the variant playlist */
  uri: string;
  /** Peak bitrate in bits per second */
  bandwidth: number;
  /** Average bitrate in bits per second */
  averageBandwidth?: number;
  /** Codec string (e.g., "avc1.42e01e,mp4a.40.2") */
  codecs?: string;
  /** Resolution (width x height) */
  resolution?: {
    width: number;
    height: number;
  };
  /** Frame rate */
  frameRate?: number;
  /** HDCP level */
  hdcpLevel?: string;
  /** Associated audio group */
  audio?: string;
  /** Associated video group */
  video?: string;
  /** Associated subtitles group */
  subtitles?: string;
  /** Associated closed captions group */
  closedCaptions?: string;
}

/**
 * Master manifest structure
 */
export interface MasterManifest {
  /** HLS protocol version */
  version?: number;
  /** Independent segments flag */
  independentSegments?: boolean;
  /** Start time offset */
  start?: StartTimeOffset;
  /** List of variant streams */
  variants: Variant[];
  /** Session data entries */
  sessionData?: SessionData[];
  /** Session keys */
  sessionKeys?: SessionKey[];
}

/**
 * Encryption key information from EXT-X-KEY tag
 */
export interface EncryptionKey {
  /** Encryption method (NONE, AES-128, SAMPLE-AES) */
  method: string;
  /** Key URI */
  uri?: string;
  /** Initialization vector (hex) */
  iv?: string;
  /** Key format */
  keyFormat?: string;
  /** Key format versions */
  keyFormatVersions?: string;
}

/**
 * Byte range specification
 */
export interface ByteRange {
  /** Length of the byte range */
  length: number;
  /** Starting offset (optional, defaults to end of previous range) */
  offset?: number;
}

/**
 * Media initialization segment information from EXT-X-MAP tag
 */
export interface MediaInitialization {
  /** URI of the initialization segment */
  uri: string;
  /** Byte range specification */
  byteRange?: ByteRange;
}

/**
 * Chunk/segment information from EXTINF tag
 */
export interface Chunk {
  /** URI of the chunk */
  uri: string;
  /** Duration in seconds */
  duration: number;
  /** Optional title */
  title?: string;
  /** Byte range specification */
  byteRange?: ByteRange;
  /** Discontinuity flag */
  discontinuity?: boolean;
  /** Encryption key information */
  key?: EncryptionKey;
  /** Media initialization segment information */
  map?: MediaInitialization;
  /** Program date time */
  programDateTime?: Date;
  /** Discontinuity sequence number */
  discontinuitySequence?: number;
}

/**
 * Variant manifest (media playlist) structure
 */
export interface VariantManifest {
  /** HLS protocol version */
  version?: number;
  /** Target duration in seconds */
  targetDuration: number;
  /** Media sequence number */
  mediaSequence?: number;
  /** Discontinuity sequence number */
  discontinuitySequence?: number;
  /** Playlist type (VOD or EVENT) */
  playlistType?: 'VOD' | 'EVENT';
  /** End list flag (indicates final segment) */
  endList?: boolean;
  /** List of chunks/segments */
  chunks: Chunk[];
}

