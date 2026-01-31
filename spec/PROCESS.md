# Project Management Process

> [!NOTE]
> This document outlines the project management workflows and conventions established during the planning phase.

## Issue Organization Strategy

### 1. Epic Issues (High-level features)
One epic per major feature area:
- Epic: Core Parser Package (`@mtngtools/hls-parser`)
- Epic: Transfer Pipeline (`@mtngtools/hls-core`)
- Epic: Plugin System Architecture
- Epic: AWS S3 Integration (separate repo)
- Epic: MP4 Converter (separate repo)

### 2. Feature Issues (Specific functionality)
Break epics into features:
- Feature: Main Manifest Parsing
- Feature: Variant Manifest Parsing
- Feature: Chunk Discovery
- Feature: HTTP Header Management
- Feature: Progress Tracking System

### 3. Task Issues (Implementation details)
Break features into tasks:
- Task: Implement M3U8 parser for main manifests
- Task: Add TypeScript types for MainManifest
- Task: Create plugin interface for manifest parsing

## Issue Templates
Create GitHub issue templates for:
- `epic.md` - For high-level feature areas
- `feature.md` - For specific features
- `task.md` - For implementation tasks
- `bug.md` - For bug reports
- `enhancement.md` - For improvements

## Cross-Repository Issue Management
**Selected Strategy: GitHub Projects**
- Use GitHub Projects to organize issues across repos
- Create project board: "HLS Utilities - Overall"
- Add issues from all repos to project
- Use columns: Backlog, In Progress, In Review, Done
- Use filters/labels to group by repo, epic, priority

## Issue Workflow
1.  **Initial Setup**: Create epics, label them, set up Project board.
2.  **Planning Phase**: Create feature issues linked to epics. Estimate effort.
3.  **Implementation Phase**: Break features into tasks. Link PRs to tasks.
4.  **Tracking**: Update project board. Close issues as PRs merge.

## Issue Labels Strategy
- **Type**: `epic`, `feature`, `task`, `bug`, `enhancement`
- **Package**: `package:types`, `package:parser`, `package:core`, `package:cli`
- **Priority**: `priority:high`, `priority:medium`, `priority:low`
- **Status**: `status:blocked`, `status:needs-review`, `status:ready`
- **Area**: `area:parsing`, `area:core`, `area:cli`

## Milestones
- `v0.1.0` - Core parser and types
- `v0.2.0` - Transfer pipeline
- `v0.3.0` - Plugin system
