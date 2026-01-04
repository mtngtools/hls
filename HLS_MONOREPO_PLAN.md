# HLS Monorepo Planning Document

This document contains the planning and architecture decisions for the HLS (HTTP Live Streaming) utilities monorepo.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack Decisions](#2-technology-stack-decisions)
3. [Monorepo Structure](#3-monorepo-structure-questions)
4. [Transfer Process Architecture & Plugin System](#3a-transfer-process-architecture--plugin-system)
5. [HLS Utility Scope](#4-hls-utility-scope-questions)
6. [Package Organization](#5-package-organization-questions)
7. [Development Workflow](#6-development-workflow-questions)
8. [Distribution & Publishing](#7-distribution--publishing-questions)
9. [Documentation](#8-documentation-questions)
10. [Dependencies & External Libraries](#9-dependencies--external-libraries)
11. [Similar & Related Libraries](#10-similar--related-libraries)
12. [Project Management & Workflow](#11-project-management--workflow)
13. [Future Considerations](#12-future-considerations)

---

### 1. Project Overview

- Purpose and goals
- Target use cases (detailed below)
- Success criteria

#### Use Case 1: CDN-to-CDN HLS Content Transfer

**Problem**: Content stored on CDN without bulk manifest access, but available for streaming.**Requirements**:

- Parse initial manifest to discover variant files
- Parse variant manifests to discover chunks
- Download all chunks with configurable concurrency limits (CDN-friendly)
- **HTTP Header Management**:
- Support custom request headers (authentication, user-agent, referer, etc.)
- Forward cookies/tokens from manifest responses to subsequent requests
- Maintain header state across request chain (manifest → variants → chunks)
- Support header configuration per CDN/source
- **Plugin/Hook System for Customization**:
- Granular, overridable steps in transfer process
- Default implementations for each step
- Custom function overrides via configuration
- Source/destination-specific customizations
- Transfer options:
- Store locally on disk
- Stream directly from source CDN to destination CDN (memory efficient)
- Upload to destination using proprietary protocols (e.g., AWS S3 SDK)
- Support single file and batch operations
- Advanced: Resource pool/queue system for processing many files
- Performance optimization: stream download → upload to minimize interim resource usage

#### Use Case 2: HLS to MP4 Conversion

**Problem**: Download HLS files locally and merge into continuous MP4 file.**Requirements**:

- Download HLS files locally
- Merge segments into continuous MP4
- Options:
- All variants + master manifest
- Highest quality only from master manifest

### 2. Technology Stack Decisions

- TypeScript (confirmed)
- Package manager: pnpm (per organization standards)
- Build system: Turbo (per organization standards)
- Testing: Vitest
- Linting: oxlint
- Version management: Changesets
- Configured for 0.x versioning initially
- Support for breaking changes in 0.x range

#### Runtime Environment Strategy

- **Base requirement**: Node.js runtime
- **Goal**: Support alternate runtime environments
- Cloudflare Workers
- Deno
- Bun
- Other edge/serverless runtimes
- **Implications**:
- Avoid Node.js-specific APIs where possible (use Web Standards APIs)
- Use runtime detection/adapters for runtime-specific features
- Consider separate builds or conditional exports for different runtimes
- Test across target runtimes

### 3. Monorepo Structure Questions

**Core Monorepo Structure**:

- Package organization strategy (by feature, by layer, by use case)
- Naming conventions for packages
- Workspace structure (packages/*, apps/*, etc.)
- Shared tooling and configuration location

**Separate Repository Structure**:

- Repository naming convention (`hls-aws`, `hls-converter`, etc.)
- Single-package repos vs multi-package repos for integrations
- Shared tooling/config strategy (copy from core, or independent?)
- Versioning strategy (independent vs coordinated with core)

### 3b. Dependency Management & Repository Structure

**Core Principle**: Core packages should have minimal dependencies, while integration packages can have heavier dependencies.**Dependency Isolation Strategies**:**Option 1: Single Monorepo with Dependency Isolation**

- Structure:
- `packages/core/` - Minimal dependencies (parsing, types, utilities)
- `packages/integrations/` - Heavier dependencies (AWS S3 SDK, media libraries)
- Use pnpm workspace features:
- Dependency hoisting configuration
- Separate `node_modules` per package if needed
- Workspace protocol for internal dependencies
- Pros:
- Easier cross-package development
- Shared tooling and configuration
- Atomic changes across packages
- Single versioning/release process
- Cons:
- All dependencies in one repo (but isolated by package)
- Larger repo size

**Option 2: Split Repositories**

- Core repository: `@mtngtools/hls-core` (or monorepo with just core packages)
- Minimal dependencies
- Published as separate packages
- Integration repositories: Separate repos for heavy integrations
- `@mtngtools/hls-aws` - AWS S3 integration
- `@mtngtools/hls-media` - Media library integrations
- Pros:
- Complete dependency isolation
- Smaller, focused repos
- Independent versioning/releases
- Cons:
- Harder to coordinate changes across repos
- More repos to manage
- Versioning complexity (core changes require updates in integration repos)
- Duplicate tooling/config across repos

**Option 3: Hybrid Approach**

- Core monorepo: Core packages + lightweight integrations
- Separate repos: Only for very heavy, optional integrations
- Pros:
- Core stays lean
- Heavy optional dependencies don't bloat main repo
- Cons:
- More complex setup
- Need to decide what's "heavy enough" to split

**Recommendation Considerations**:

- How often will core and integrations change together?
- Are integrations optional or required?
- How important is dependency isolation vs development convenience?
- What's the target bundle size for core packages?

**Dependency Minimization Strategies**:

- Use Web Standards APIs where possible (avoid Node.js-specific deps in core)
- Lazy loading for optional features
- Plugin architecture allows heavy deps to be in separate packages
- Tree-shaking friendly exports
- Peer dependencies for optional integrations

**Decision Framework**:**Start with Single Monorepo if**:

- Core and integrations will evolve together
- You want easier development workflow
- Dependency isolation via package boundaries is sufficient
- You can use pnpm workspace features effectively

**Consider Split Repos if**:

- Core needs to be extremely lightweight (zero/minimal deps)
- Integrations are truly optional and rarely change
- Integration dependencies are very heavy (100+ MB, many transitive deps)
- You want completely independent versioning/releases

**Hybrid Approach** (recommended starting point):

- Start with single monorepo
- Use package boundaries to isolate dependencies
- Monitor bundle sizes and dependency counts
- Split out only if specific packages become problematic
- Keep core packages in main monorepo, consider splitting only heavy optional integrations

**Questions to Answer**:

- Single monorepo vs split repos? (Recommendation: Start with monorepo, split if needed)
- What constitutes "core" vs "integration"?
- Which dependencies are acceptable in core? (e.g., M3U8 parser - evaluate weight)
- What's the acceptable dependency count/size for core packages?
- Should AWS S3 SDK be in main monorepo or separate repo?
- Should media libraries (MP4 muxing) be in main monorepo or separate repo?
- Can we use peer dependencies for optional integrations?

### 3a. Transfer Process Architecture & Plugin System

**Granular Transfer Steps** (each overridable):

1. **Initial Manifest Fetching**

- Default: Standard HTTP fetch
- Override: Custom fetch logic (auth, headers, retries, etc.)

2. **Master Manifest Parsing**

- Default: Standard HLS M3U8 parsing
- Override: Custom parsing logic for non-standard formats

3. **Variant Discovery**

- Default: Extract variant URLs from master manifest
- Override: Custom variant extraction logic

4. **Variant Manifest Fetching**

- Default: Fetch each variant manifest
- Override: Custom fetch per variant (different auth, headers, etc.)

5. **Variant Manifest Parsing**

- Default: Standard HLS variant parsing
- Override: Custom parsing logic

6. **Chunk/Segment Discovery**

- Default: Extract chunk URLs from variant manifests
- Override: Custom chunk discovery logic

7. **Chunk Downloading**

- Default: HTTP download with concurrency control
- Override: Custom download logic (streaming, retries, headers, etc.)

8. **Destination Path/Name Generation**

- Master manifest naming
- Variant manifest naming
- Chunk/segment naming
- Default: Preserve source structure or configurable pattern
- Override: Custom naming logic per source/destination

9. **Destination Master Manifest Creation**

- Default: Generate standard HLS master manifest
- Override: Custom manifest generation (different structure, metadata, etc.)

10. **Destination Variant Manifest Creation**

- Default: Generate standard HLS variant manifests
- Override: Custom variant manifest generation

11. **Chunk Storage**

- Default: Store chunks to destination (local disk, S3, other CDN, etc.)
- Override: Custom storage logic per destination type
- Terminology options: "store", "write", "persist", "save" - "store" recommended (generic, covers all destinations)

12. **Manifest Storage**

- Default: Store manifests to destination (local disk, S3, other CDN, etc.)
- Override: Custom storage logic per destination type
- Terminology options: "store", "write", "persist", "save" - "store" recommended (generic, covers all destinations)

**Plugin System Design Questions**:

- Function-based hooks vs class-based plugins?
- Configuration structure for overrides (function map in config object)
- Type safety for plugin interfaces (TypeScript function signatures)
- Default implementations location
- Plugin validation/error handling
- Plugin composition (multiple plugins per step?)
- Plugin lifecycle (initialization, cleanup)
- Context passing between steps (headers, state, metadata)

**Configuration Structure Example** (expanded with detailed types):

```typescript
// Core Types
interface Context {
  // Request state
  headers: Record<string, string>;
  cookies: string[];
  baseUrl: string;
  
  // Transfer state
  sourceConfig: SourceConfig;
  destinationConfig: DestinationConfig;
  
  // Metadata
  metadata: Record<string, unknown>;
  
  // Progress tracking (internal state, not directly exposed)
  // Progress is reported via callbacks in options, not stored here
}

interface MasterManifest {
  version?: number;
  independentSegments?: boolean;
  start?: {
    timeOffset: number;
    precise?: boolean;
  };
  variants: Variant[];
  sessionData?: SessionData[];
  sessionKeys?: SessionKey[];
  // ... other HLS master manifest tags
}

interface SessionData {
  dataId: string;
  value?: string;
  uri?: string;
  language?: string;
}

interface SessionKey {
  method: string;
  uri?: string;
  iv?: string;
  keyFormat?: string;
  keyFormatVersions?: string;
}

interface Variant {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  codecs?: string;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  hdcpLevel?: string;
  audio?: string;
  video?: string;
  subtitles?: string;
  closedCaptions?: string;
  // ... other variant attributes
}

interface VariantManifest {
  version?: number;
  targetDuration: number;
  mediaSequence?: number;
  discontinuitySequence?: number;
  endList?: boolean;
  playlistType?: 'VOD' | 'EVENT';
  chunks: Chunk[];
  // ... other variant manifest tags
}

interface Chunk {
  uri: string;
  duration: number;
  title?: string;
  byteRange?: {
    length: number;
    offset: number;
  };
  discontinuity?: boolean;
  programDateTime?: Date;
  key?: {
    method: string;
    uri?: string;
    iv?: string;
  };
  map?: {
    uri: string;
    byteRange?: {
      length: number;
      offset: number;
    };
  };
  // ... other chunk attributes
}

// Stream type (Web Streams API compatible)
type Stream = ReadableStream<Uint8Array> | NodeJS.ReadableStream;

// Configuration Types
type AuthConfig =
  | {
      type: 'bearer';
      token: string;
    }
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | {
      type: 'custom';
      custom?: Record<string, unknown>;
    };

interface SourceConfig {
  url: string;
  headers?: Record<string, string>;
  cookies?: string[];
  auth?: AuthConfig;
  concurrency?: {
    maxConcurrent: number;
    maxConcurrentPerDomain?: number;
  };
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
}

// Discriminated union for destination config
type DestinationConfig =
  | {
      type: 'local';
      local: {
        basePath: string;
      };
    }
  | {
      type: 'custom';
      custom?: Record<string, unknown>;
    };

// Main Transfer Configuration
interface TransferConfig {
  source: SourceConfig;
  destination: DestinationConfig;
  
  // Plugin overrides for each step
  plugins?: {
    // Step 1: Initial Manifest Fetching
    fetchMasterManifest?: (
      url: string,
      context: Context
    ) => Promise<Response>;
    
    // Step 2: Master Manifest Parsing
    parseMasterManifest?: (
      content: string,
      context: Context
    ) => Promise<MasterManifest>;
    
    // Step 3: Variant Discovery
    discoverVariants?: (
      manifest: MasterManifest,
      context: Context
    ) => Promise<Variant[]>;
    
    // Step 4: Variant Manifest Fetching
    fetchVariantManifest?: (
      variant: Variant,
      context: Context
    ) => Promise<Response>;
    
    // Step 5: Variant Manifest Parsing
    parseVariantManifest?: (
      content: string,
      variant: Variant,
      context: Context
    ) => Promise<VariantManifest>;
    
    // Step 6: Chunk Discovery
    discoverChunks?: (
      manifest: VariantManifest,
      variant: Variant,
      context: Context
    ) => Promise<Chunk[]>;
    
    // Step 7: Chunk Downloading
    downloadChunk?: (
      chunk: Chunk,
      context: Context
    ) => Promise<Stream>;
    
    // Step 8: Destination Path Generation
    generateDestinationPath?: (
      sourcePath: string,
      type: 'master' | 'variant' | 'chunk',
      context: Context
    ) => Promise<string>;
    
    // Step 9: Destination Master Manifest Creation
    createMasterManifest?: (
      variants: Variant[],
      context: Context
    ) => Promise<string>;
    
    // Step 10: Destination Variant Manifest Creation
    createVariantManifest?: (
      chunks: Chunk[],
      variant: Variant,
      context: Context
    ) => Promise<string>;
    
    // Step 11: Chunk Storage
    storeChunk?: (
      stream: Stream,
      path: string,
      chunk: Chunk,
      context: Context
    ) => Promise<void>;
    
    // Step 12: Manifest Storage
    storeManifest?: (
      content: string,
      path: string,
      type: 'master' | 'variant',
      context: Context
    ) => Promise<void>;
  };
  
  // Additional options
  options?: {
    preserveSourceStructure?: boolean;
    // Variant filter receives the variant and all variants for comparison
    // Examples:
    // - Include only highest quality: (v, all) => v.bandwidth === Math.max(...all.map(a => a.bandwidth))
    // - Include only lowest quality: (v, all) => v.bandwidth === Math.min(...all.map(a => a.bandwidth))
    // - Include second highest: (v, all) => { const sorted = [...all].sort((a,b) => b.bandwidth - a.bandwidth); return v === sorted[1]; }
    // - Include all: (v, all) => true
    variantFilter?: (variant: Variant, allVariants: Variant[]) => boolean;
    chunkFilter?: (chunk: Chunk) => boolean;
    // Overall progress callback - tracks the big picture
    // Implementation: Progress updates from variants are queued and processed sequentially
    // to avoid race conditions when multiple variants update counters concurrently.
    // Simple queue-based approach: variants push updates to queue, single processor updates
    // counters and calls callback. This ensures thread-safe updates without complex locking.
    onOverallProgress?: (progress: {
      totalVariants: number;
      completedVariants: number; // Variants that have finished all chunks
      totalChunks: number; // Sum of all chunks across all variants
      completedChunks: number; // Total chunks completed across all variants
      totalBytes: number; // Sum of all chunk sizes
      completedBytes: number; // Total bytes transferred across all variants
      percentage: number; // 0-100, calculated from completedBytes / totalBytes
    }) => void;
    
    // Variant progress callback - tracks individual variant progress
    // Called independently for each variant, doesn't need to know about other variants
    onVariantProgress?: (progress: {
      variant: Variant;
      totalChunks: number; // Total chunks for this variant
      completedChunks: number; // Chunks completed for this variant
      totalBytes: number; // Total bytes for this variant
      completedBytes: number; // Bytes transferred for this variant
      percentage: number; // 0-100, calculated from completedBytes / totalBytes
      isComplete: boolean; // True when all chunks for this variant are done
    }) => void;
    onError?: (error: Error, step: string, context: Context) => void;
  };
}
```

### 4. HLS Utility Scope Questions

Based on use cases, identify needed utilities:**Core Parsing & Discovery**:

- Initial/master manifest parsing (M3U8)
- Variant manifest parsing
- Chunk/segment discovery and enumeration
- M3U8 format support (HLS v3, v4, v5, etc.)
- Live vs VOD handling

**Transfer & Storage**:

- HTTP download utilities with concurrency control
- HTTP header management (request headers, cookie/token forwarding)
- Header lifecycle management (manifest → variants → chunks)
- Streaming download-to-upload (memory efficient)
- CDN integration (AWS S3 SDK, others)
- Local file system operations
- Batch processing with resource pools/queues

**Conversion**:

- HLS segment merging
- MP4 file generation
- Variant selection (highest quality, all variants)
- Media format handling

**Additional Considerations**:

- Manifest generation/creation
- Manifest manipulation (editing, merging, splitting)
- Encryption/DRM utilities (if needed)
- Playlist management
- DASH compatibility or conversion (if needed)

### 5. Package Organization Questions

Based on use cases, consider packages for:**Core Packages** (minimal dependencies):

- `@mtngtools/hls-types` - Shared types and interfaces
- Plugin interface types
- Transfer step type definitions
- Zero dependencies (or minimal)
- `@mtngtools/hls-parser` - Manifest parsing (master, variant, chunk discovery)
- Default parsing implementations
- Parser plugin interfaces
- Minimal dependencies (evaluate: custom parser vs lightweight library)
- `@mtngtools/hls-transfer` - CDN-to-CDN transfer with streaming
- Transfer pipeline with granular steps
- Plugin/hook system architecture
- HTTP header management and lifecycle
- Cookie/token forwarding
- Concurrency control
- Default implementations for all transfer steps
- Minimal dependencies (Web Standards APIs, no heavy HTTP clients)
- `@mtngtools/hls-utils` - Common utilities
- Minimal dependencies

**Integration Packages** (in separate repositories, heavy dependencies):

- `@mtngtools/hls-aws` - AWS S3 integration (separate repo)
- Depends on: AWS S3 SDK (heavy dependency)
- Implements core plugin interfaces
- Separate repository: `mtngtools/hls-aws`
- `@mtngtools/hls-converter` - HLS to MP4 conversion (separate repo)
- Depends on: MP4 muxing library (potentially heavy)
- Separate repository: `mtngtools/hls-converter`
- Future heavy integrations in separate repos as needed

**Core Monorepo Packages** (that can use integrations):

- `@mtngtools/hls-cli` - CLI tools for common operations
- Can depend on separate repo packages as optional dependencies
- Provides unified CLI interface
- `@mtngtools/hls-transfer-plugins` - Pre-built plugins for common CDNs/sources
- Lightweight plugins stay in core monorepo
- Heavy plugins move to separate repos

**Integration Packages**:

- `@mtngtools/hls-s3` - AWS S3 specific integration
- `@mtngtools/hls-cli` - CLI tools for common operations

**Runtime Adapters** (if needed):

- `@mtngtools/hls-runtime-node` - Node.js-specific implementations
- `@mtngtools/hls-runtime-workers` - Cloudflare Workers adapters
- `@mtngtools/hls-runtime-deno` - Deno-specific implementations
- Or: runtime detection/abstraction layer in core packages

**Questions**:

- Which utilities should be separate packages?
- Which utilities should be bundled together?
- Shared types and interfaces location
- Common utilities location
- CLI tools vs library packages
- Resource pool/queue system - separate package or part of transfer?
- Plugin system architecture - function hooks vs class-based?
- Plugin package organization - single plugins package vs individual plugin packages?
- Default implementations - bundled in core or separate package?

### 6. Development Workflow Questions

- Local development setup
- Testing strategy (unit, integration, E2E)
- Multi-runtime testing (Node.js, Cloudflare Workers, Deno, Bun)
- Runtime-specific test suites
- Code quality standards
- Git workflow (branching, commits)
- CI/CD pipeline requirements
- Test matrix for different runtimes
- Build artifacts for different runtime targets

### 7. Distribution & Publishing Questions

- npm package naming convention (@mtngtools/hls-*)
- **Publishing**: Open source, public packages
- **Versioning Strategy**:
- Start with 0.x versions (0.1.0, 0.2.0, etc.)
- Expect breaking changes in early months of development
- Use semantic versioning within 0.x range (0.1.0 → 0.2.0 for breaking changes)
- Move to 1.0.0 when API stabilizes
- Documentation hosting (GitHub Pages, npm package docs, etc.)
- Example/demo applications
- License selection (MIT, Apache 2.0, etc.)
- Contributing guidelines for open source

### 8. Documentation Questions

- API documentation format
- Usage examples location
- Contributing guidelines (open source)
- Architecture documentation
- README structure for each package
- Migration guides for breaking changes (important for 0.x versions)
- Changelog format (conventional commits, changesets)

### 9. Dependencies & External Libraries

**Required Dependencies**:**Core Dependencies** (minimal, in core packages):

- HTTP client with streaming support - Use Web Standards Fetch API where possible
- Cookie jar support (for cookie forwarding) - may need lightweight library
- Header management utilities - likely custom implementation
- M3U8 parser (evaluate existing vs build custom)

**M3U8-Parser Dependency Evaluation**:

**Package**: `m3u8-parser` (v7.2.0)

- **Direct Dependencies** (3):
  - `global` (^4.4.0) - polyfill for global object
  - `@babel/runtime` (^7.12.5) - Babel runtime helpers
  - `@videojs/vhs-utils` (^4.1.1) - Video.js utilities
- **Sub-dependencies**:
  - `url-toolkit` (no deps) - URL manipulation
  - `min-document` - DOM polyfill
  - `process` - process polyfill
- **Unpacked Size**: ~530KB
- **Issues for Core Package**:
  - `@babel/runtime` adds Babel helpers (unnecessary with TypeScript + modern targets)
  - `global` polyfill unnecessary in Node.js/modern runtimes
  - Tied to Video.js ecosystem (`@videojs/vhs-utils`)
  - Multiple polyfills not needed for server-side use

**Recommendation: Build Custom Parser**

**Rationale**:

1. **M3U8 is a simple text format** - parsing is straightforward (line-by-line, tag-based)
2. **Zero dependencies achievable** - custom implementation can have no dependencies
3. **Better control** - tailor to exact needs (master/variant/chunk discovery)
4. **Runtime compatibility** - no polyfills needed, works across all target runtimes
5. **Smaller bundle** - custom parser likely <50KB vs 530KB+ with dependencies
6. **No ecosystem lock-in** - not tied to Video.js or Babel

**Implementation Approach**:

- Build lightweight M3U8 parser in `@mtngtools/hls-parser`
- Focus on core needs: master manifest, variant manifests, chunk discovery
- Use Web Standards APIs only (no Node.js-specific or polyfills)
- TypeScript-native implementation
- Estimated size: 20-50KB (much smaller than m3u8-parser)

**Alternative**: If time-constrained, `m3u8-parser` is acceptable but not ideal. Consider it a temporary solution with plan to replace with custom implementation.

**Integration Dependencies** (in separate repository packages):

- AWS S3 SDK (for Use Case 1) - Note: may need runtime-specific adapters
- Heavy dependency - in separate repo: `@mtngtools/hls-aws`
- MP4 muxing library (for Use Case 2) - Evaluate runtime compatibility
- Potentially heavy - in separate repo: `@mtngtools/hls-converter`

**Runtime Compatibility Considerations**:

- Prefer Web Standards APIs (Fetch, Streams, etc.) over Node.js-specific APIs
- Use runtime adapters/abstractions for runtime-specific features (file system, streams, etc.)
- Evaluate dependencies for multi-runtime support
- Consider polyfills or runtime-specific implementations

**Questions**:

- Existing HLS libraries to evaluate (m3u8-parser, hls.js, etc.) - check runtime compatibility
- Dependencies to avoid (Node.js-only dependencies that block multi-runtime support)
- Runtime-specific implementations needed (e.g., S3 SDK adapters for Cloudflare Workers)
- Streaming/pipe libraries for efficient transfer - ensure Web Streams API compatibility

### 10. Similar & Related Libraries

**Existing HLS Libraries to Evaluate**:

**Client-Side Playback**:

- `hls.js` - JavaScript HLS playback library for browsers (MSE-based)
  - Focus: Client-side playback, not server-side utilities
  - Note: Browser-focused, not Node.js
- `video.js` - HTML5 video player with HLS support
  - Focus: Video player, not HLS utilities
- `HJPlayer` - TypeScript HTML5 player for FLV and HLS
  - Focus: Playback, not content management

**Server-Side/Utilities**:

- `m3u8-parser` - M3U8 playlist parser (npm package)
  - Potential dependency for core parser package
  - Evaluate weight vs custom implementation
- `gohlslib` - Go library for HLS client and muxer
  - Reference implementation, not TypeScript
- `libdash` - C++ MPEG-DASH library (related standard)
  - Reference for manifest handling concepts

**Streaming Servers** (reference for architecture):

- `OvenMediaEngine` - Open-source streaming server with HLS support
- `LiveSwitch HLS` - Node.js/TypeScript HLS streaming tool

**What's Missing / Our Differentiators**:

- No comprehensive TypeScript monorepo for HLS content management
- No plugin-based CDN-to-CDN transfer system
- No streaming download-to-upload utilities with header management
- No granular, overridable transfer pipeline
- Limited focus on server-side HLS manipulation vs playback

**Evaluation Questions**:

- Can we use `m3u8-parser` in core, or is it too heavy?
- Should we build custom parser for minimal dependencies?
- What can we learn from `hls.js` architecture?
- Are there patterns from Go/C++ libraries we should adopt?

### 11. Project Management & Workflow

**Master Planning Document Location**:

- Store `HLS_MONOREPO_PLAN.md` in root of core monorepo
- Single source of truth, easy to reference in issues/PRs
- Can be referenced from separate repos via GitHub links if needed

**Breaking Down Plan into GitHub Issues**:

**Issue Organization Strategy**:

1. **Epic Issues** (High-level features)

   - One epic per major feature area:
     - Epic: Core Parser Package (`@mtngtools/hls-parser`)
     - Epic: Transfer Pipeline (`@mtngtools/hls-transfer`)
     - Epic: Plugin System Architecture
     - Epic: AWS S3 Integration (separate repo)
     - Epic: MP4 Converter (separate repo)

2. **Feature Issues** (Specific functionality)

   - Break epics into features:
     - Feature: Master Manifest Parsing
     - Feature: Variant Manifest Parsing
     - Feature: Chunk Discovery
     - Feature: HTTP Header Management
     - Feature: Progress Tracking System

3. **Task Issues** (Implementation details)

   - Break features into tasks:
     - Task: Implement M3U8 parser for master manifests
     - Task: Add TypeScript types for MasterManifest
     - Task: Create plugin interface for manifest parsing

**Issue Templates**:

Create GitHub issue templates for:

- `epic.md` - For high-level feature areas
- `feature.md` - For specific features
- `task.md` - For implementation tasks
- `bug.md` - For bug reports
- `enhancement.md` - For improvements

**Cross-Repository Issue Management**:

**Option 1: Issues in Each Repo**

- Core monorepo: Issues for core packages
- `hls-aws` repo: Issues for AWS integration
- `hls-converter` repo: Issues for MP4 conversion
- Pros: Issues close to code, clear ownership
- Cons: Harder to see big picture across repos

**Option 2: Centralized Issues + Cross-References**

- Create issues in core repo for everything
- Use labels: `repo:core`, `repo:hls-aws`, `repo:hls-converter`
- Link to implementation PRs in respective repos
- Pros: Single place to see all work
- Cons: Issues may be far from code

**Option 3: GitHub Projects (Recommended)**

- Use GitHub Projects to organize issues across repos
- Create project board: "HLS Utilities - Overall"
- Add issues from all repos to project
- Use columns: Backlog, In Progress, In Review, Done
- Use filters/labels to group by repo, epic, priority
- Pros: Visual organization across repos, flexible
- Cons: Requires project setup

**Issue Breakdown Workflow**:

1. **Initial Setup**:

   - Create epic issues from plan sections
   - Label epics appropriately
   - Set up GitHub Project board

2. **Planning Phase**:

   - For each epic, create feature issues
   - Link features to epic (use "Epic" field or labels)
   - Estimate effort, assign priorities

3. **Implementation Phase**:

   - Break features into tasks as work begins
   - Link tasks to features
   - Create PRs linked to tasks/features

4. **Tracking**:

   - Update project board as work progresses
   - Close issues as PRs merge
   - Update plan document as decisions are made

**Issue Labels Strategy**:

- **Type**: `epic`, `feature`, `task`, `bug`, `enhancement`
- **Package**: `package:types`, `package:parser`, `package:transfer`, `package:cli`
- **Repository**: `repo:core`, `repo:hls-aws`, `repo:hls-converter`
- **Priority**: `priority:high`, `priority:medium`, `priority:low`
- **Status**: `status:blocked`, `status:needs-review`, `status:ready`
- **Area**: `area:parsing`, `area:transfer`, `area:plugins`, `area:storage`

**Milestones**:

Create milestones for major releases:

- `v0.1.0` - Core parser and types
- `v0.2.0` - Transfer pipeline basics
- `v0.3.0` - Plugin system
- `v0.4.0` - AWS S3 integration (separate repo)
- `v0.5.0` - MP4 converter (separate repo)

**Decisions**:

- **Master Plan Location**: Core monorepo initially (`HLS_MONOREPO_PLAN.md` in root)
- **Project Management**: Use GitHub Projects for cross-repo visibility and organization
- **Issue Granularity**: Start with epics, break down into features and tasks as needed
- **Issue Creation Strategy**: Create epics upfront, incrementally create features and tasks as work progresses

### 12. Future Considerations

- Roadmap items
