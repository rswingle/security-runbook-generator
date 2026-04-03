# Architecture — Security Runbook Generator

## Overview

The Security Runbook Generator is a minimal, file-based CLI/TUI tool built around a
three-agent pipeline. Each agent owns a distinct layer of the system. A persistent
memory layer threads through every run so the tool learns and improves over time.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User (Terminal)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       ui-builder        │  ← CLI/TUI front-end
              │  Collects structured    │    Reads memory for
              │  inputs (JSON/YAML)     │    smart defaults
              └────────────┬────────────┘
                           │ Structured input payload
              ┌────────────▼────────────┐
              │   template-engineer     │  ← Core rendering engine
              │  Selects + renders      │    Merges inputs with
              │  Markdown from template │    memory preferences
              └────────────┬────────────┘
                           │ Rendered Markdown runbook
              ┌────────────▼────────────┐
              │   integration-agent     │  ← Persistence layer
              │  Saves + git pushes     │    Reads/writes
              │  the runbook            │    /runbooks/
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │       Hook Layer        │  ← Deterministic automation
              │  PostToolUse + Stop     │    Logging + learning loop
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │      Memory System      │  ← File-based persistence
              │  /memory/ + CLAUDE.md   │    Preferences & patterns
              └─────────────────────────┘
```

---

## Component Breakdown

### 1. `ui-builder` (CLI/TUI Layer)

**Responsibility:** Gather structured user input and pre-fill fields from memory.

- Renders an interactive terminal form (e.g., via `inquirer`, `blessed`, or `textual`)
- Loads `/memory/runbook-preferences.yaml` to pre-populate defaults
- Reads `CLAUDE.md` for team-level constraints
- Outputs a validated JSON or YAML input payload
- Tools: Read, Write

### 2. `template-engineer` (Rendering Layer)

**Responsibility:** Manage templates and render final Markdown output.

- Reads templates from `/templates/playbooks/`
- Applies user input payload + memory preferences to select and fill the right template
- Renders structured Markdown with consistent formatting
- Tools: Read, Write

### 3. `integration-agent` (Persistence Layer)

**Responsibility:** Save runbooks and push to version control.

- Writes output to `/runbooks/{runbook-name}.md`
- Runs git add/commit/push via GitHub MCP
- Logs run metadata (template used, inputs, output path)
- Tools: Read, Write, Bash

---

## Memory Architecture

Two complementary memory stores inform every agent before generation:

| Store | Path | Scope | Updated by |
|---|---|---|---|
| User preferences | `/memory/runbook-preferences.yaml` | Per-user, per-project | Stop hook |
| Team conventions | `CLAUDE.md` | Shared across team | Manual / PR |

Memory is **read-only during generation** and **written only by hooks** after user edits are diffed.

---

## Hook Architecture

Two Claude Code hooks enforce deterministic automation at session boundaries:

| Hook | Trigger | Action |
|---|---|---|
| `PostToolUse` | After runbook generation | Log template, inputs, and output |
| `Stop` | End of session | Diff generated vs final; update memory |

---

## Directory Structure

```
security-runbook-generator/
├── CLAUDE.md                         # Team-level rules and conventions
├── PROMPT.md                         # Original system spec
├── ARCHITECTURE.md                   # This file
├── DESIGN.md                         # UX and component design
├── DATA_FLOW.md                      # Detailed data flow diagrams
├── INTEGRATIONS.md                   # External integrations reference
├── README.md                         # Getting started guide
│
├── runbooks/                         # Generated runbook outputs
│   └── {incident-name}-runbook.md
│
├── templates/
│   └── playbooks/                    # Runbook templates
│       ├── incident-response.md
│       ├── vulnerability-management.md
│       ├── access-review.md
│       └── _schema.yaml              # Variable schema definition
│
├── memory/
│   └── runbook-preferences.yaml     # Learned user preferences
│
├── hooks/
│   ├── post-tool-use.js              # PostToolUse hook implementation
│   └── stop.js                       # Stop hook implementation
│
└── agents/
    ├── ui-builder.js                 # CLI/TUI input collection agent
    ├── template-engineer.js          # Template rendering agent
    └── integration-agent.js          # Save + push agent
```

---

## Design Principles

1. **Speed over features** — Minimal friction, fast to a usable runbook
2. **File-based everything** — No databases, no external services beyond git
3. **Learn without noise** — Only persist patterns that repeat across multiple runs
4. **Security by default** — Never store sensitive incident data in memory
5. **Deterministic automation** — Hooks are not AI; they are scripted and predictable
