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
- Feature: Master Manifest Parsing
- Feature: Variant Manifest Parsing
- Feature: Chunk Discovery
- Feature: HTTP Header Management
- Feature: Progress Tracking System

### 3. Task Issues (Implementation details)
Break features into tasks:
- Task: Implement M3U8 parser for master manifests
- Task: Add TypeScript types for MasterManifest
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
- **Package**: `package:types`, `package:parser`, `package:transfer`, `package:cli`
- **Repository**: `repo:core`, `repo:hls-aws`, `repo:hls-converter`
- **Priority**: `priority:high`, `priority:medium`, `priority:low`
- **Status**: `status:blocked`, `status:needs-review`, `status:ready`
- **Area**: `area:parsing`, `area:transfer`, `area:plugins`, `area:storage`

## Milestones
- `v0.1.0` - Core parser and types
- `v0.2.0` - Transfer pipeline basics
- `v0.3.0` - Plugin system
- `v0.4.0` - AWS S3 integration
- `v0.5.0` - MP4 converter
