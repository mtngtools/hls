# AGENTS.md

## Package-specific agent guidance for `@mtngtools/hls-types`

This file contains only package-specific guidance for automated agents working on the `@mtngtools/hls-types` package. See below for additional guidance.

## Organization-specific guidance 

Follow organization-level rules in `AGENTS_ORGANIZATION.md` found in [`https://github.com/mtngtools/agents`](https://github.com/mtngtools/agents) repository. If this repository has not been provided in context, agent must either 1) pull directly from GitHub or 2) prompt user to provide to context. 

## Technology-stack-specific notes

This is a TypeScript package, consult [`stacks/AGENTS_STACK_TYPESCRIPT/README.md`](stacks/AGENTS_STACK_TYPESCRIPT/README.md) found in `mtngtools/agents` repository.

## Repository-specific guidance

- Find `AGENTS_REPO.md` in the root of this project's repository for repository-level agent guidance.

## Package starting places

Consult [`README.md`](./README.md) and [`package.json`](./package.json) as best starting places. 

## Package-specific rules

- This package should have **zero or minimal dependencies**
- All types should be runtime-agnostic (work in Node.js, Cloudflare Workers, Deno, Bun)
- Use Web Standards types where possible
- Keep types focused and well-documented

----

Keep this file short and focused — add only package-specific rules here.

