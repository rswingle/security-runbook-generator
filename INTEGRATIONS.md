# Integrations — Security Runbook Generator

## Overview

The Security Runbook Generator keeps its integration surface intentionally small.
All integrations are file-system-local except for one: the GitHub MCP server used
by `integration-agent` to push runbooks to a remote repository.

---

## Integration Inventory

| Integration | Type | Used By | Required |
|---|---|---|---|
| Local filesystem | Native | All agents, all hooks | Yes |
| Git (CLI) | Shell via Bash | `integration-agent` | Yes |
| GitHub MCP | MCP server | `integration-agent` | Optional |
| Claude Code hooks | Hook API | `PostToolUse`, `Stop` | Yes |
| Template engine | Internal library | `template-engineer` | Yes |

---

## 1. Local Filesystem

**Type:** Native file I/O (Read, Write)

All agents and hooks operate primarily on the local filesystem. The directory
structure is fixed and must be initialized before first run (see README).

**Key paths:**

| Path | Purpose | Access |
|---|---|---|
| `/runbooks/` | Generated runbook outputs | Read/Write (`integration-agent`) |
| `/templates/playbooks/` | Runbook templates + schema | Read (`template-engineer`, `ui-builder`) |
| `/memory/runbook-preferences.yaml` | Learned preferences store | Read (agents), Write (Stop hook) |
| `/memory/run-log.jsonl` | Append-only run audit log | Write (`PostToolUse` hook) |
| `/memory/.last-generated.md` | Snapshot for diff comparison | Write (`PostToolUse`), Read/Delete (`Stop`) |
| `CLAUDE.md` | Team conventions | Read (all agents) |

**Error handling:** If a required path is missing at startup, the tool must print
a clear error and exit with instructions to run `./runbook init`.

---

## 2. Git (CLI via Bash)

**Type:** Shell command execution
**Used by:** `integration-agent`
**Tools required:** Read, Write, Bash

The `integration-agent` calls `git` directly via shell after writing the runbook
to disk. This is the simplest possible approach — no git library dependency.

**Commands issued:**

```bash
git add runbooks/{name}.md
git commit -m "runbook: add {name}"
git push origin main
```

**Configuration:**

The agent reads git configuration from the host environment. No credentials
are stored in the project. Users must have git configured with appropriate
remote access before using the push feature.

**Failure handling:**

If `git push` fails (no remote, auth error, etc.), the `integration-agent`:
1. Saves the runbook locally (always succeeds)
2. Logs the failure to the run log
3. Prints the exact git command the user can run manually
4. Does **not** block or retry automatically

```
⚠  Git push failed. Runbook saved locally.
   To push manually: git push origin main
```

---

## 3. GitHub MCP Server

**Type:** MCP (Model Context Protocol) server
**Used by:** `integration-agent`
**Required:** Optional (falls back to CLI git if unavailable)

The GitHub MCP server provides a higher-level API for repository operations,
including commit creation, PR management, and file uploads via the GitHub REST
API. It is the preferred method when available because it does not require a
local clone or git binary.

**MCP server:** `github` (standard Claude Code MCP integration)

**Operations used:**

| MCP Tool | Purpose |
|---|---|
| `github_create_or_update_file` | Write runbook directly to repo |
| `github_create_commit` | Commit with descriptive message |

**Environment requirements:**

```bash
# Required environment variable
GITHUB_TOKEN=ghp_...          # Personal access token with repo scope
GITHUB_REPO=org/repo-name     # Target repository
GITHUB_BRANCH=main            # Target branch (default: main)
```

**Fallback behavior:**

If the GitHub MCP server is not configured or `GITHUB_TOKEN` is absent, the
`integration-agent` automatically falls back to the CLI git approach described
above. No user intervention required.

```
ℹ  GitHub MCP not configured. Using local git.
```

---

## 4. Claude Code Hook API

**Type:** Claude Code native hooks (`.claude/settings.json`)
**Used by:** `PostToolUse` and `Stop` hooks

Hooks are registered in `.claude/settings.json` and executed deterministically
by Claude Code at specific lifecycle points — they are not AI calls.

**Hook registration:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node hooks/post-tool-use.js"
          }
        ]
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node hooks/stop.js"
      }
    ]
  }
}
```

**`PostToolUse` hook contract:**

- Triggered after any Write tool call
- Receives: tool name, written file path, timestamp
- Writes: entry to `/memory/run-log.jsonl`
- Copies rendered runbook to `/memory/.last-generated.md` if output path is under `/runbooks/`

**`Stop` hook contract:**

- Triggered at the end of the Claude Code session
- Reads: `/memory/.last-generated.md` + final `/runbooks/{name}.md`
- Computes structural diff using a deterministic diffing library (e.g., `diff` npm package)
- Extracts patterns and updates `/memory/runbook-preferences.yaml` if confidence threshold is met
- Deletes `/memory/.last-generated.md` after processing

---

## 5. Template Engine (Internal)

**Type:** Internal library (no external dependency required)
**Used by:** `template-engineer`

The template engine is a minimal `{{variable}}` interpolation system with support
for conditional blocks. It can be implemented as a thin wrapper around an existing
library (e.g., `mustache`, `handlebars`) or as a bespoke 50-line implementation.

**Recommended library:** `mustache` (zero-dependency, battle-tested)

```bash
npm install mustache
```

**Usage pattern:**

```javascript
const Mustache = require('mustache');
const fs = require('fs');

const template = fs.readFileSync('templates/playbooks/incident-response.md', 'utf8');
const rendered = Mustache.render(template, inputPayload);
fs.writeFileSync(`runbooks/${inputPayload.runbook_name}.md`, rendered);
```

---

## Integration Dependency Map

```
ui-builder
  └── reads → /memory/runbook-preferences.yaml  [filesystem]
  └── reads → CLAUDE.md                          [filesystem]
  └── reads → /templates/playbooks/_schema.yaml  [filesystem]

template-engineer
  └── reads → /templates/playbooks/*.md          [filesystem]
  └── uses  → mustache (template engine)         [npm]
  └── reads → /memory/runbook-preferences.yaml   [filesystem]

integration-agent
  └── writes → /runbooks/*.md                    [filesystem]
  └── calls  → git CLI                           [bash]
  └── calls  → GitHub MCP (optional)             [MCP]

PostToolUse hook
  └── writes → /memory/run-log.jsonl             [filesystem]
  └── writes → /memory/.last-generated.md        [filesystem]

Stop hook
  └── reads  → /memory/.last-generated.md        [filesystem]
  └── reads  → /runbooks/*.md                    [filesystem]
  └── writes → /memory/runbook-preferences.yaml  [filesystem]
  └── uses   → diff (pattern extraction)         [npm]
```

---

## Adding Future Integrations

The integration-agent is the correct extension point for new integrations.
Possible additions:

| Integration | Use case | Notes |
|---|---|---|
| Slack MCP | Notify channel on new runbook | Add to integration-agent post-push |
| Jira/Linear MCP | Link runbook to incident ticket | Add ticket ID to input schema |
| PagerDuty API | Pull incident data to pre-fill fields | Add to ui-builder startup phase |
| Obsidian vault | Sync runbooks to local knowledge base | File copy in integration-agent |

All new integrations should follow the same pattern: fail gracefully, fall back
to local-only behavior, never block the core generation workflow.
