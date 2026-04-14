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
- In progress:
  - `requirements.md`
  - `roadmap.md`
- Working checkpoint:
  - architecture baseline is defined around ESP32 devices, MQTT messaging, a modular backend, PostgreSQL persistence, and a responsive web dashboard
  - next planning pass should formalize message contracts, command acknowledgements, and initial data model details
