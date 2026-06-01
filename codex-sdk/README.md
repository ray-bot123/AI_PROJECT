# Codex SDK Example

This folder contains minimal examples for the official `@openai/codex-sdk` TypeScript/JavaScript library.

The SDK wraps the Codex CLI and exchanges JSONL events with it. It requires Node.js 18 or newer.

## Setup

```powershell
npm install
```

Authenticate with Codex before running the examples. Use whichever method you normally use for the Codex CLI, for example:

```powershell
codex login
```

## Run

Buffered response:

```powershell
npm run simple
```

Streaming events:

```powershell
npm run stream
```

Both examples pass `skipGitRepoCheck: true` because this folder is intentionally a standalone example. For a real project, remove that option and run from a Git repository.

