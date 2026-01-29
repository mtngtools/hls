# HLS Parser Specification

**Package**: `@mtngtools/hls-parser`

## Overview

A lightweight, zero-dependency parser for HLS M3U8 manifests. It is designed to be compatible with parsing both Master and Variant playlists.

## Requirements

1.  **Zero Dependencies**: Validly parse M3U8 without external libraries like `m3u8-parser`.
2.  **Web Standards Compatible**: Usable in Node.js, Cloudflare Workers, and Browsers.
3.  **Parsing Capabilities**:
    *   **Master Playlist (`MasterManifest`)**:
        *   Extract `version` and `independentSegments`.
        *   Parse specific start time offset (`start: { timeOffset, precise }`).
        *   Extract `variants` list (see below).
        *   Extract session data (`sessionData`) and keys (`sessionKeys`).
    *   **Variant (`Variant`)**:
        *   Capture `uri`, `bandwidth`, `averageBandwidth`.
        *   Parse `codecs`, `resolution`, `frameRate`, `hdcpLevel`.
        *   Identify associated `audio`, `video`, `subtitles`, `closedCaptions` groups.
    *   **Media Playlist (`VariantManifest`)**:
        *   Extract `version`, `targetDuration`, `mediaSequence`, `discontinuitySequence`.
        *   Identify `playlistType` ('VOD' or 'EVENT') and `endList` status.
        *   Extract list of `chunks` (see below).
    *   **Chunk (`Chunk`)**:
        *   Capture `uri`, `duration`, `title`.
        *   Support `byteRange` (length, offset).
        *   Identify `discontinuity` flags.
        *   Parse `key` (method, uri, iv) and `map` (uri, byteRange) information.
    *   **Tags Support**: Support common standard tags (EXT-X-STREAM-INF, EXTINF, EXT-X-KEY, etc.).
    *   **Source Content**: Each manifest object returned by the parser includes `sourceContent: string` — the raw M3U8 string that was parsed. This enables the pipeline to store a copy of the source manifest when publishing to destination.
4.  **Output**: Return structured, typed objects (defined in [`@mtngtools/hls-types`](../../hls-types/spec/README.md)).

## Alternatives Considered

- **Using `m3u8-parser`**: Rejected due to unnecessary polyfills and size.
- **Regex-based Parsing**: Rejected in favor of a robust line-by-line tokenizer to handle edge cases (quoted strings, comments) more reliably.

## Parser Coverage

### Current Coverage

The parser currently handles the following HLS tags:

**Master Playlist Tags:**
- `EXTM3U` (header)
- `EXT-X-VERSION`
- `EXT-X-INDEPENDENT-SEGMENTS`
- `EXT-X-START`
- `EXT-X-STREAM-INF` (variants)
- `EXT-X-SESSION-DATA`
- `EXT-X-SESSION-KEY`

**Variant Playlist Tags:**
- `EXT-X-VERSION`
- `EXT-X-TARGETDURATION`
- `EXT-X-MEDIA-SEQUENCE`
- `EXT-X-DISCONTINUITY-SEQUENCE`
- `EXT-X-PLAYLIST-TYPE`
- `EXT-X-ENDLIST`
- `EXTINF` (chunks)
- `EXT-X-BYTERANGE`
- `EXT-X-DISCONTINUITY`
- `EXT-X-KEY` (encryption)
- `EXT-X-MAP` (initialization segments)
- `EXT-X-PROGRAM-DATE-TIME`

**Status**: Current coverage is sufficient for MVP (CDN-to-CDN transfer). All potentially missing tags are documented in "Future Enhancements" section below for future consideration.

**Note**: If `EXT-X-SKIP` or `EXT-X-GAP` tags are encountered in real-world manifests, they should be prioritized for implementation as they have medium impact on chunk discovery and handling.

## Future Considerations

### Playlist Reload for Live Streams

For live streams (`EXT-X-PLAYLIST-TYPE: EVENT`), playlists can be updated dynamically. Future enhancements could include:

- **Polling/Reload Support**: Automatically poll and reload playlists for live streams
- **Incremental Updates**: Track `EXT-X-MEDIA-SEQUENCE` to detect new segments
- **Playlist Refresh Interval**: Respect `EXT-X-TARGETDURATION` to determine polling frequency
- **Use Case**: Continuous transfer of live HLS streams as new segments become available

**Status**: Deferred - Current implementation focuses on VOD (Video On Demand) transfers. Live stream support would require additional orchestration logic in `hls-core`.

### Custom/Unknown Tags

Currently, the parser ignores unknown or custom HLS tags that are not part of the standard specification. Future enhancements could include:

- **Tag Preservation**: Store unknown tags in a `customTags?: Record<string, string>` field on manifests
- **Use Case**: Preserve vendor-specific or custom tags during transfer (e.g., `EXT-X-CUSTOM-TAG`)
- **Impact**: Low priority for transfer use case, but could be useful for maintaining full manifest fidelity
- **Consideration**: Would need to decide on storage format (raw tag lines vs parsed key-value pairs)

**Status**: Deferred - Current implementation focuses on standard HLS tags. Custom tag support can be added if needed for specific use cases.

## Future Enhancements

### Additional HLS Tags

The following HLS tags are not currently supported but may be added in the future:

#### `EXT-X-MEDIA` - Media Group Definitions
- **Current State**: Variant references media groups by ID (strings: `audio`, `video`, `subtitles`, `closedCaptions`)
- **Missing**: Full `EXT-X-MEDIA` tag parsing to provide richer media group definitions
- **Impact**: Low for transfer use case (we just need URIs)
- **Note**: `MediaGroup` type is defined in `@mtngtools/hls-types` but not fully integrated into variant parsing

#### `EXT-X-I-FRAMES-ONLY` - I-frame Only Playlists
- **Description**: Indicates that the playlist contains only I-frames (keyframes)
- **Impact**: Low (rare, mostly for trick play)
- **Use Case**: Used for seeking/trick play functionality

#### `EXT-X-SKIP` - Skip Segments (VOD)
- **Description**: Indicates that certain segments should be skipped during playback
- **Impact**: Medium (could affect chunk discovery)
- **Use Case**: Allows VOD playlists to reference segments that shouldn't be played

#### `EXT-X-DATERANGE` - Date Range Metadata
- **Description**: Associates date/time metadata with segments
- **Impact**: Low (metadata only)
- **Use Case**: SCTE-35 ad markers, program timing information

#### `EXT-X-GAP` - Gap Segments
- **Description**: Indicates that a segment is a gap (missing content)
- **Impact**: Medium (affects chunk handling)
- **Use Case**: Handles missing segments in playlists gracefully

**Status**: Deferred - Current parser covers all tags required for basic CDN-to-CDN transfer. These tags can be added if encountered in real-world manifests or if specific use cases require them.
