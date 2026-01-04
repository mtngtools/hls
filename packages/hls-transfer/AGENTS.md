# AGENTS.md

## Package-specific agent guidance for `@mtngtools/hls-transfer`

This file contains only package-specific guidance for automated agents working on the `@mtngtools/hls-transfer` package. See below for additional guidance.

## Organization-specific guidance 

Follow organization-level rules in `AGENTS_ORGANIZATION.md` found in [`https://github.com/mtngtools/agents`](https://github.com/mtngtools/agents) repository. If this repository has not been provided in context, agent must either 1) pull directly from GitHub or 2) prompt user to provide to context. 

## Technology-stack-specific notes

This is a TypeScript package, consult [`stacks/AGENTS_STACK_TYPESCRIPT/README.md`](stacks/AGENTS_STACK_TYPESCRIPT/README.md) found in `mtngtools/agents` repository.

## Repository-specific guidance

- Find `AGENTS_REPO.md` in the root of this project's repository for repository-level agent guidance.

## Package starting places

Consult [`README.md`](./README.md) and [`package.json`](./package.json) as best starting places. 

## Package-specific rules

- **Minimal dependencies** - Use Web Standards APIs (Fetch, Streams)
- Plugin system with 12 granular, overridable steps
- HTTP header management and lifecycle
- Cookie/token forwarding
- Concurrency control
- Progress tracking (overall and per-variant)
- Runtime-agnostic implementation

----

Keep this file short and focused — add only package-specific rules here.

