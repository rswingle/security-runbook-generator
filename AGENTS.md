# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first. Core references live at the root: `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `DATA_FLOW.md`, `INTEGRATIONS.md`, `PROMPT.md`, and `CLAUDE.md`.

The implementation layout described in those docs uses:
- `agents/` for pipeline components (`ui-builder.js`, `template-engineer.js`, `integration-agent.js`)
- `hooks/` for deterministic lifecycle hooks
- `templates/playbooks/` for Markdown templates and `_schema.yaml`
- `runbooks/` for generated output
- `memory/` for learned preferences and run logs

## Build, Test, and Development Commands
Use the documented CLI workflow:
- `npm install` — install project dependencies
- `./runbook init` — initialize required directories
- `./runbook new` — generate a runbook interactively
- `./runbook list` / `./runbook edit <name>` — manage generated runbooks
- `./runbook memory --show` / `./runbook memory --reset` — inspect or reset learned preferences

For local contributor shell work, follow the repo convention to prefix commands with `rtk` (example: `rtk git status`).

## Coding Style & Naming Conventions
Match existing file style and keep changes scoped. Follow current naming patterns:
- kebab-case for files (for example, `incident-response.md`, `template-engineer.js`)
- Markdown templates with `{{variable}}` placeholders
- runbook names in date-first format (for example, `2026-05-15-auth-incident.md`)

Keep docs concise, with clear headings and actionable language.

## Testing Guidelines
There is no committed automated test suite yet. Use the README verification flow:
1. Run `./runbook new` once, then make small edits to the generated file.
2. Run `./runbook new` again and confirm remembered defaults reduce manual input.

If you add executable code, include a repeatable test command and document it in `README.md`.

## Commit & Pull Request Guidelines
History is minimal (`first commit`), so use clear imperative commit subjects and optional scopes, such as:
- `docs: clarify memory reset behavior`
- `templates: add access review fields`
- `agents: handle missing template gracefully`

For PRs, include:
- what changed and why
- affected paths (for example, `templates/playbooks/`, `agents/`)
- validation evidence (commands run and observed results)
- related issue links when applicable

## Security & Configuration Tips
Do not commit secrets (for example, `GITHUB_TOKEN`). Keep incident-sensitive content out of `memory/` files, and review `CLAUDE.md` conventions before sharing templates externally.
