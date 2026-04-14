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
  - completed implementation slices include backend bootstrap, message contracts, MQTT codec, device state projection, embedded MQTT ingestion, initial `Prisma` schema, backend `Prisma` client wiring, and inbound MQTT persistence
  - next implementation step should expose database-backed reads for device state, telemetry history, and notifications

## Current Implementation Slice
- Branch target: `feat/db-read-routes`
- Goal:
  - move the first backend read paths from the in-memory store to the persisted PostgreSQL read model
- Planned tasks:
  1. add a Prisma-backed query service for device state, recent telemetry, and notifications. Status: completed
  2. wire the existing device routes to the query service and add the first persisted read endpoints. Status: completed
  3. cover the query service with unit tests and the HTTP routes with integration tests. Status: completed
  4. rerun workspace validation, API typecheck, and API test suite before opening the PR. Status: in progress
