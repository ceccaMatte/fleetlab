# Repository Guidelines

## Working Mode
FleetLab is a solo project operated with Codex as the primary coding agent. Default workflow: define the task, let Codex inspect the repo, implement the change, run verification, and summarize results. Manual coding is the exception, not the norm.

Decisions must be explicit. Do not add code, tools, or structure without a stated reason tied to the current phase.

## Phase 1 Constraints
Phase 1 covers repository setup only:
- governance and documentation
- development workflow
- CI, lint, and test scaffolding
- project structure and templates

Do not build product features, business logic, UI flows, or provisional “just to get started” application code in this phase.

## Branch Strategy
`main` is protected and never receives direct commits. All work happens on short-lived branches created for one focused change.

Branch naming:
- `chore/<topic>`
- `docs/<topic>`
- `ci/<topic>`
- `setup/<topic>`

Keep branch scope narrow enough for one reviewable pull request.

## Commit Policy
Every commit must be intentional, small, and reversible. Prefer one concern per commit. Use imperative subjects, for example:
- `docs: define repository workflow`
- `ci: add initial validation job`
- `setup: scaffold project directories`

Do not bundle unrelated cleanup with the main change.

## Verification Rules
No pull request is ready without verification. For each change:
- run the narrowest relevant checks locally
- confirm new paths, scripts, and config files are wired correctly
- record what was verified in the PR description

If a check does not exist yet, add the smallest useful check or state the gap explicitly.

## Pull Request Expectations
Open small pull requests only. Target one topic, one decision set, or one scaffolding step per PR.

Each PR must include:
- purpose of the change
- files or areas affected
- verification performed
- follow-up work that is intentionally out of scope

Large mixed-purpose PRs should be split before review.

## Review Guidelines
Review for correctness, scope control, and maintainability first. Reject changes that:
- bypass the branch workflow
- expand beyond Phase 1
- add unverified tooling or speculative structure
- make future review harder through size or mixed concerns

Prefer tightening scope over adding more output.

## Definition of Done
A task is done only when:
- the change stays within Phase 1
- it is merged through a pull request
- verification is completed or clearly documented as missing
- documentation is updated when workflow or governance changes
- no direct commit to `main` was used at any point
