# Repository Guidelines

## Project Operating Model
FleetLab is a solo project operated with Codex as the primary coding agent.
The user acts as product owner, sets goals, priorities, and constraints, and approves the final outcome.
Codex is expected to inspect the repository, propose focused changes, implement them, verify them, and summarize results clearly.

Manual coding by the user should be treated as the exception, not the default workflow.

## Core Principles
- Prefer disciplined execution over blind vibe coding.
- Keep every task focused, reviewable, and easy to verify.
- Do not expand scope implicitly.
- Do not introduce structure, tooling, dependencies, or abstractions without a clear reason tied to the current task.
- Preserve repository coherence over speed.
- Favor small vertical slices over large unfinished scaffolds.

## Communication Policy
Use Italian for all user-facing narrative content, including:
- chat replies to the user
- progress updates
- implementation summaries
- Markdown reports intended for the user
- explanations of trade-offs, risks, and next steps
- comments in project files when they are explanatory and meant for human reading

Keep repository operational artifacts in English, including:
- `AGENTS.md`
- commit messages
- pull request titles and descriptions
- branch names
- file names, folder names, script names, and configuration keys
- CI, tooling, infrastructure, and agent-related configuration files

Do not translate:
- terminal commands
- raw logs
- stack traces
- tool output
- error messages copied verbatim

When uncertain, prefer Italian for explanatory content meant to be read by the user, and English for workflow/configuration artifacts.

## Execution Protocol
Before making non-trivial changes:
- restate the goal in Italian
- state the scope boundaries
- identify the files or areas likely to change
- state the intended verification steps

Proceed directly for clear, scoped tasks.
Pause and ask for confirmation only when:
- the requested change is ambiguous in a way that materially affects implementation
- a new dependency or tool should be introduced
- the change would alter architecture or project conventions
- the task would go beyond the current phase or stated scope

## Scope Control
If adjacent improvements are discovered outside the requested scope:
- do not implement them implicitly
- mention them separately as optional follow-up work
- keep the current change focused on the requested task

Do not mix cleanup, refactors, and feature work unless explicitly requested or clearly necessary to complete the task safely.

## Phase Discipline
Respect the currently stated project phase.

For Phase 1, allowed work includes:
- repository governance
- documentation
- development workflow
- CI, lint, and test scaffolding
- project structure, templates, and setup

For Phase 1, do not add:
- product features
- business logic
- UI flows
- provisional app code â€œjust to get startedâ€
- speculative modules not required by the current task

If a requested task conflicts with the current phase, explicitly point out the conflict in Italian before proceeding.

## Branch Strategy
`main` is protected and must never receive direct commits.

All work must happen on short-lived branches, each focused on one clear task.

Preferred branch naming:
- `feat/<topic>`
- `fix/<topic>`
- `docs/<topic>`
- `ci/<topic>`
- `chore/<topic>`
- `setup/<topic>`

Keep branch scope narrow enough for one reviewable pull request.

## Commit Policy
Every commit must be intentional, small, and reversible.
Prefer one concern per commit.
Do not bundle unrelated edits into the same commit.

Use concise imperative commit subjects in English, for example:
- `docs: refine repository workflow`
- `ci: add initial validation pipeline`
- `setup: scaffold monorepo structure`

Before committing:
- review the diff
- stage only relevant files
- exclude unrelated noise

## Pull Request Expectations
Every completed branch should be prepared for a focused pull request into `main`.

Each pull request must clearly state:
- purpose of the change
- files or areas affected
- verification performed
- known limitations or risks
- follow-up work intentionally left out of scope

Prefer small PRs with one topic and one decision set.
Large mixed-purpose PRs should be split before merge.

## Verification Rules
No task is complete without verification proportional to the change.

For each task:
- run the narrowest relevant checks first
- verify wiring for new scripts, configs, directories, and automation
- avoid claiming success without evidence
- report what was actually verified

If relevant checks do not exist yet:
- add the smallest useful verification when appropriate
- otherwise state the verification gap explicitly in Italian

For code changes, prefer:
- lint for formatting and static issues
- tests for behavior
- targeted manual checks only when automated checks are not yet available

## Review Guidelines
Review for:
- correctness
- scope discipline
- maintainability
- unnecessary complexity
- configuration mistakes
- broken assumptions
- missing validation
- missing verification
- accidental secrets or unsafe logging
- changes outside the requested task

Reject or revise changes that:
- bypass the branch workflow
- expand beyond the agreed scope
- introduce speculative structure
- make future review harder through size or mixed concerns

## Output Expectations
When reporting completed work to the user, always provide in Italian:
- what changed
- why it changed
- how it was verified
- any risks, gaps, or follow-up items

Keep summaries practical and concrete.
Do not hide uncertainty.
Do not claim checks were run if they were not run.

## Definition of Done
A task is done only when:
- the requested scope is implemented
- the diff is focused and reviewable
- relevant verification has been run, or the gap is explicitly documented
- documentation is updated when workflow or setup changes
- the work is on the correct branch
- the branch is ready for pull request review
- no direct commit to `main` was used