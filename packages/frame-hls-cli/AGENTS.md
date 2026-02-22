# AGENTS.md

## Package-specific agent guidance for `@mtngtools/frame-hls-cli`

This file contains only package-specific guidance for automated agents working on the `@mtngtools/frame-hls-cli` package. See below for additional guidance.

**Note:** This is a basic CLI without custom transfer options (e.g. AWS). It is not actively developed.

## Organization-specific guidance 

Follow organization-level rules in `AGENTS_ORGANIZATION.md` found in [`https://github.com/mtngtools/agents`](https://github.com/mtngtools/agents) repository. If this repository has not been provided in context, agent must either 1) pull directly from GitHub or 2) prompt user to provide to context. 

## Technology-stack-specific notes

This is a TypeScript package, consult [`stacks/AGENTS_STACK_TYPESCRIPT/README.md`](stacks/AGENTS_STACK_TYPESCRIPT/README.md) found in `mtngtools/agents` repository.

## Repository-specific guidance

- Find `AGENTS_REPO.md` in the root of this project's repository for repository-level agent guidance.

## Package starting places

Consult [`README.md`](./README.md) and [`package.json`](./package.json) as best starting places. 

## Package-specific rules

- Basic CLI for common HLS transfer (default implementations only; no custom transfer options like AWS)
- Not actively developed; use or build `compose-hls-cli` or similar composite CLIs.
- Can depend on other packages in this monorepo

----

Keep this file short and focused — add only package-specific rules here.

