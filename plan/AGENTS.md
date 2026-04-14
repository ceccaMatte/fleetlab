# Planning Guidelines

## Purpose
`plan/` is the working area for FleetLab product planning.

This folder is used to clarify the finished system before moving into implementation detail. The goal is to turn ideas into explicit written specifications, one topic at a time.

## Planning Workflow
For every planning step, use this sequence:

1. inspect the current planning files and repository context
2. ask focused questions until one product aspect is clear enough to write
3. update the single matching file in `plan/`
4. update planning status if the checkpoint changed
5. run the narrowest relevant verification
6. create one intentional commit for that clarified planning step

## Planning Rules
- Stay at product and system-description level unless the task explicitly moves to implementation design.
- Write down decisions only after they are clarified with the user.
- Keep one concern per planning commit.
- Prefer updating an existing planning file over scattering the same topic across multiple files.
- If a new topic does not fit existing files, create a new Markdown file and link it from `plan/README.md`.
- Record assumptions explicitly when something is temporarily undecided.

## Expected File Roles
- `README.md`: index of planning files and current status
- `vision.md`: product purpose, user value, major behaviors, non-goals
- `architecture.md`: high-level system shape and boundaries
- `requirements.md`: functional and operational requirements
- `roadmap.md`: phased delivery path after the vision is stable

## Planning Status
- Completed:
  - `vision.md`
  - `architecture.md`
  - `message-contracts.md`
  - `requirements.md`
  - `roadmap.md`
- In progress:
  - planning checkpoints aligned with implementation progress
- Working checkpoint:
  - planning baseline is stable and the inbound persistence path is merged on `main`
  - completed implementation slices include backend bootstrap, message contracts, MQTT codec, device state projection, embedded MQTT ingestion, initial `Prisma` schema, backend `Prisma` client wiring, inbound MQTT persistence, and the first database-backed read routes
  - next implementation step should complete command persistence and confirmed command state transitions

## Current Implementation Slice
- Branch target: `feat/command-lifecycle`
- Goal:
  - implement persisted `command` and `config` lifecycle with `pending -> confirmed/failed`
- Status:
  - planning defined in `plan/backend-command-lifecycle.md`
- Planned tasks:
  1. persistence layer for command/config pending records, ACK finalization, and command read queries. Status: completed
  2. MQTT outbound publishing after persistence and before `publishedAt`. Status: completed
  3. HTTP routes for command/config creation and `GET /commands`. Status: completed
  4. final regression checks and PR preparation. Status: in progress
